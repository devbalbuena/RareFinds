"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { STORE_SETTINGS_CACHE_TAG } from "@/lib/settings";

const updateSettingsSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters"),
  storeTagline: z.string().max(100, "Tagline too long").optional(),
  contactEmail: z.string().email("Valid contact email required"),
  contactPhone: z.string().min(7, "Valid phone number required"),
  address: z.string().min(3, "Address required"),
  currency: z.string().min(2, "Currency code required (e.g. PHP)"),
  currencySymbol: z.string().min(1, "Currency symbol required (e.g. ₱)"),
  shippingFee: z.number().min(0, "Shipping fee must be zero or positive"),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export async function updateStoreSettingsAction(input: UpdateSettingsInput) {
  try {
    const caller = await verifyAdminSession("settings:update");

    const parsed = updateSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid settings data." };
    }

    const {
      storeName,
      storeTagline,
      contactEmail,
      contactPhone,
      address,
      currency,
      currencySymbol,
      shippingFee,
    } = parsed.data;

    const previousSettings = await prisma.storeSettings.findUnique({
      where: { id: "default" },
    });

    const updated = await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: {
        storeName,
        storeTagline: storeTagline || null,
        contactEmail,
        contactPhone,
        address,
        currency,
        currencySymbol,
        shippingFee,
      },
      create: {
        id: "default",
        storeName,
        storeTagline: storeTagline || null,
        contactEmail,
        contactPhone,
        address,
        currency,
        currencySymbol,
        shippingFee,
      },
    });

    // Record settings modification in audit log
    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        userEmail: caller.email,
        action: "SETTINGS_UPDATED",
        entityType: "StoreSettings",
        entityId: "default",
        details: {
          previous: previousSettings,
          updated: {
            storeName,
            contactEmail,
            currency,
            currencySymbol,
            shippingFee,
          },
        },
      },
    });

    // Revalidate Next.js cache tag and paths safely
    try {
      revalidateTag(STORE_SETTINGS_CACHE_TAG, "max");
    } catch {
      // Graceful fallback in non-request test contexts
    }

    try {
      revalidatePath("/admin/settings");
      revalidatePath("/checkout");
      revalidatePath("/");
    } catch {
      // Graceful fallback in non-request test contexts
    }

    return { success: true, settings: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update store settings.";
    return { error: msg };
  }
}
