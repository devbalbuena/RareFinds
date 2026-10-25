"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const addressSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
  phone: z.string().min(7, "Please enter a valid contact phone number").trim(),
  street: z.string().min(3, "Street address is required").trim(),
  apartment: z.string().optional(),
  city: z.string().min(2, "City is required").trim(),
  province: z.string().min(2, "Province / Region is required").trim(),
  postalCode: z.string().min(4, "Postal code is required").trim(),
  isDefault: z.boolean().optional(),
});

export async function updateProfileAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to update your profile." };
  }

  const name = formData.get("name");
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return { error: "Name must be at least 2 characters." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
    });

    revalidatePath("/account");
    return { success: true, message: "Profile updated successfully." };
  } catch (error) {
    console.error("updateProfile error:", error);
    return { error: "Failed to update profile." };
  }
}

export async function createAddressAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to save addresses." };
  }

  const rawData = {
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    apartment: formData.get("apartment") || undefined,
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
  };

  const validated = addressSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid address data." };
  }

  const userId = session.user.id;
  const data = validated.data;

  try {
    // If this address is set as default, or if it is the first address, set others as not default
    const existingCount = await prisma.address.count({ where: { userId } });
    const makeDefault = data.isDefault || existingCount === 0;

    if (makeDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    await prisma.address.create({
      data: {
        userId,
        fullName: data.fullName,
        phone: data.phone,
        street: data.street,
        apartment: data.apartment || null,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        isDefault: makeDefault,
      },
    });

    revalidatePath("/account");
    return { success: true, message: "Shipping address saved successfully." };
  } catch (error) {
    console.error("createAddress error:", error);
    return { error: "Failed to save address. Please try again." };
  }
}

export async function updateAddressAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to update addresses." };
  }

  const addressId = formData.get("addressId");
  if (!addressId || typeof addressId !== "string") {
    return { error: "Invalid address ID." };
  }

  const rawData = {
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    apartment: formData.get("apartment") || undefined,
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
  };

  const validated = addressSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid address data." };
  }

  const userId = session.user.id;
  const data = validated.data;

  try {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) {
      return { error: "Address not found." };
    }

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    await prisma.address.update({
      where: { id: addressId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        street: data.street,
        apartment: data.apartment || null,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
      },
    });

    revalidatePath("/account");
    return { success: true, message: "Shipping address updated successfully." };
  } catch (error) {
    console.error("updateAddress error:", error);
    return { error: "Failed to update address. Please try again." };
  }
}

export async function deleteAddressAction(addressId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== session.user.id) {
      return { error: "Address not found or unauthorized." };
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    // If deleted address was default, promote another address to default if available
    if (address.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId: session.user.id },
      });
      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    console.error("deleteAddress error:", error);
    return { error: "Failed to delete address." };
  }
}

export async function setDefaultAddressAction(addressId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== session.user.id) {
      return { error: "Address not found or unauthorized." };
    }

    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    console.error("setDefaultAddress error:", error);
    return { error: "Failed to set default address." };
  }
}
