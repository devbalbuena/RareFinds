"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { STORE_SETTINGS_CACHE_TAG } from "@/lib/settings";

const updateSettingsSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters"),
  storeTagline: z.string().max(100, "Tagline too long").optional().nullable(),
  contactEmail: z.string().email("Valid contact email required"),
  contactPhone: z.string().min(7, "Valid phone number required"),
  address: z.string().min(3, "Address required"),
  currency: z.string().min(2, "Currency code required (e.g. PHP)"),
  currencySymbol: z.string().min(1, "Currency symbol required (e.g. ₱)"),
  shippingFee: z.number().min(0, "Shipping fee must be zero or positive").default(0),
  shippingFeeLocal: z.number().min(0, "Local shipping fee must be zero or positive").default(150),
  shippingFeeCourier: z.number().min(0, "Courier shipping fee must be zero or positive").default(250),
  pickupAddress: z.string().optional().nullable(),
  pickupInstructions: z.string().optional().nullable(),
  localDeliveryAreas: z.string().optional().nullable(),
  codEnabled: z.boolean().default(false),
  codAllowedAreas: z.string().optional().nullable(),
  codMaxAmount: z.number().min(0).default(20000),
  manualPaymentInstructions: z.string().optional().nullable(),
  manualPaymentQrKey: z.string().optional().nullable(),
  manualPaymentHoldMinutes: z.number().int().min(10).max(1440).default(60),
  autoCompleteDays: z.number().int().min(1).max(30).default(3),
});

export type UpdateSettingsInput = z.input<typeof updateSettingsSchema>;

export async function updateStoreSettingsAction(input: UpdateSettingsInput) {
  try {
    const caller = await verifyAdminSession("settings:update");

    const parsed = updateSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid settings data." };
    }

    const data = parsed.data;

    const previousSettings = await prisma.storeSettings.findUnique({
      where: { id: "default" },
    });

    const updated = await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: {
        storeName: data.storeName,
        storeTagline: data.storeTagline || null,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        currency: data.currency,
        currencySymbol: data.currencySymbol,
        shippingFee: data.shippingFee,
        shippingFeeLocal: data.shippingFeeLocal,
        shippingFeeCourier: data.shippingFeeCourier,
        pickupAddress: data.pickupAddress?.trim() || null,
        pickupInstructions: data.pickupInstructions?.trim() || null,
        localDeliveryAreas: data.localDeliveryAreas?.trim() || null,
        codEnabled: data.codEnabled,
        codAllowedAreas: data.codAllowedAreas?.trim() || null,
        codMaxAmount: data.codMaxAmount,
        manualPaymentInstructions: data.manualPaymentInstructions?.trim() || null,
        manualPaymentQrKey: data.manualPaymentQrKey?.trim() || null,
        manualPaymentHoldMinutes: data.manualPaymentHoldMinutes,
        autoCompleteDays: data.autoCompleteDays,
      },
      create: {
        id: "default",
        storeName: data.storeName,
        storeTagline: data.storeTagline || null,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        currency: data.currency,
        currencySymbol: data.currencySymbol,
        shippingFee: data.shippingFee,
        shippingFeeLocal: data.shippingFeeLocal,
        shippingFeeCourier: data.shippingFeeCourier,
        pickupAddress: data.pickupAddress?.trim() || null,
        pickupInstructions: data.pickupInstructions?.trim() || null,
        localDeliveryAreas: data.localDeliveryAreas?.trim() || null,
        codEnabled: data.codEnabled,
        codAllowedAreas: data.codAllowedAreas?.trim() || null,
        codMaxAmount: data.codMaxAmount,
        manualPaymentInstructions: data.manualPaymentInstructions?.trim() || null,
        manualPaymentQrKey: data.manualPaymentQrKey?.trim() || null,
        manualPaymentHoldMinutes: data.manualPaymentHoldMinutes,
        autoCompleteDays: data.autoCompleteDays,
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
            storeName: data.storeName,
            codEnabled: data.codEnabled,
            codMaxAmount: data.codMaxAmount,
            shippingFeeLocal: data.shippingFeeLocal,
            shippingFeeCourier: data.shippingFeeCourier,
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
      revalidatePath("/products");
      revalidatePath("/shipping-policy");
      revalidatePath("/");
    } catch {
      // Graceful fallback in non-request test contexts
    }

    return {
      success: true,
      settings: {
        ...updated,
        shippingFee: Number(updated.shippingFee),
        shippingFeeLocal: Number(updated.shippingFeeLocal),
        shippingFeeCourier: Number(updated.shippingFeeCourier),
        codMaxAmount: Number(updated.codMaxAmount),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update store settings.";
    return { error: msg };
  }
}
