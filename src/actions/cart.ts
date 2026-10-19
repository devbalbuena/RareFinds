"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const addToCartSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
});

const removeFromCartSchema = z.object({
  cartItemId: z.string().min(1, "Cart item ID is required"),
});

export async function getCartAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      items: [],
      subtotal: 0,
      totalCount: 0,
      isLoggedIn: false,
    };
  }

  const userId = session.user.id;

  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  brand: true,
                  images: {
                    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    brand: true,
                    images: {
                      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  const now = new Date();

  // Process items and check live availability
  const processedItems = cart.items.map((item) => {
    const v = item.variant;
    const isInactive = v.product.status !== "ACTIVE";
    const isSold = v.isSold || v.stockQty <= 0;
    const isOnHold = Boolean(
      v.reservedUntil &&
        new Date(v.reservedUntil) > now &&
        v.reservedBy !== userId
    );

    let isUnavailable = false;
    let unavailableReason = "";

    if (isInactive) {
      isUnavailable = true;
      unavailableReason = "Unavailable";
    } else if (isSold) {
      isUnavailable = true;
      unavailableReason = "Sold Out";
    } else if (isOnHold) {
      isUnavailable = true;
      unavailableReason = "On Hold by another buyer";
    }

    return {
      id: item.id,
      variantId: v.id,
      quantity: item.quantity,
      price: Number(v.price), // Always from database
      size: v.size,
      condition: v.condition,
      isOneOfOne: v.isOneOfOne,
      isUnavailable,
      unavailableReason,
      product: {
        id: v.product.id,
        title: v.product.title,
        slug: v.product.slug,
        brandName: v.product.brand.name,
        imageUrl:
          v.product.images.find((img) => img.isPrimary)?.url ||
          v.product.images[0]?.url ||
          "/placeholder.png",
      },
    };
  });

  const subtotal = processedItems.reduce((acc, item) => {
    return item.isUnavailable ? acc : acc + item.price * item.quantity;
  }, 0);

  const totalCount = processedItems.reduce((acc, item) => acc + item.quantity, 0);

  return {
    items: processedItems,
    subtotal,
    totalCount,
    isLoggedIn: true,
  };
}

export async function addToCartAction(rawVariantId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: "UNAUTHORIZED",
      message: "Please sign in to add rare sneakers to your vault cart.",
      requiresLogin: true,
    };
  }

  const validated = addToCartSchema.safeParse({ variantId: rawVariantId });
  if (!validated.success) {
    return { error: "INVALID_INPUT", message: "Invalid product variant selected." };
  }

  const { variantId } = validated.data;
  const userId = session.user.id;

  try {
    // 1. Fetch variant directly from DB (never trust client)
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || variant.product.status !== "ACTIVE") {
      return { error: "NOT_FOUND", message: "Sneaker variant is no longer available." };
    }

    // 2. Reject if sold or out of stock
    if (variant.isSold || variant.stockQty <= 0) {
      return {
        error: "SOLD_OUT",
        message: "This pair has already been sold and cannot be ordered.",
      };
    }

    // 3. Reject if on checkout hold by someone else
    const now = new Date();
    if (
      variant.reservedUntil &&
      new Date(variant.reservedUntil) > now &&
      variant.reservedBy !== userId
    ) {
      return {
        error: "ON_HOLD",
        message: "This 1-of-1 pair is currently on checkout hold by another collector. Please try again soon.",
      };
    }

    // 4. Find or create user cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // 5. Check if item is already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (existingItem) {
      if (variant.isOneOfOne) {
        return {
          error: "ALREADY_IN_CART",
          message: "This rare 1-of-1 pair is already in your cart.",
        };
      }
      // For multi-stock, increment quantity if stock allows
      if (existingItem.quantity + 1 > variant.stockQty) {
        return {
          error: "MAX_STOCK",
          message: `Only ${variant.stockQty} pair(s) available in stock.`,
        };
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + 1 },
      });
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity: 1,
        },
      });
    }

    revalidatePath("/(store)", "layout");

    return {
      success: true,
      message: `Added ${variant.product.title} (Size ${variant.size}) to your vault cart.`,
    };
  } catch (error) {
    console.error("addToCartAction error:", error);
    return {
      error: "SERVER_ERROR",
      message: "An error occurred while adding the sneaker to your cart.",
    };
  }
}

export async function removeFromCartAction(rawCartItemId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "UNAUTHORIZED", message: "Please sign in to modify your cart." };
  }

  const validated = removeFromCartSchema.safeParse({ cartItemId: rawCartItemId });
  if (!validated.success) {
    return { error: "INVALID_INPUT", message: "Invalid cart item ID." };
  }

  const { cartItemId } = validated.data;
  const userId = session.user.id;

  try {
    // Server-side authorization check: ensure the item belongs to the authenticated user's cart
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== userId) {
      return { error: "NOT_FOUND", message: "Item not found in your cart." };
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    revalidatePath("/(store)", "layout");

    return { success: true };
  } catch (error) {
    console.error("removeFromCartAction error:", error);
    return { error: "SERVER_ERROR", message: "Failed to remove item from cart." };
  }
}
