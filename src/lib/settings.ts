import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { defaultSiteConfig, SiteConfig } from "@/lib/site.config";

export const STORE_SETTINGS_CACHE_TAG = "store_settings";

/**
 * Database fetcher for Store Settings.
 */
async function fetchStoreSettings(): Promise<SiteConfig> {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      return defaultSiteConfig;
    }

    return {
      storeName: settings.storeName || defaultSiteConfig.storeName,
      storeTagline: settings.storeTagline || defaultSiteConfig.storeTagline,
      logoUrl: settings.logoUrl || null,
      contactEmail: settings.contactEmail || defaultSiteConfig.contactEmail,
      contactPhone: settings.contactPhone || defaultSiteConfig.contactPhone,
      address: settings.address || defaultSiteConfig.address,
      currency: settings.currency || defaultSiteConfig.currency,
      currencySymbol: settings.currencySymbol || defaultSiteConfig.currencySymbol,
      shippingFee: Number(settings.shippingFee ?? 0),
      shippingFeeLocal: Number(settings.shippingFeeLocal ?? 150),
      shippingFeeCourier: Number(settings.shippingFeeCourier ?? 250),
      pickupAddress: settings.pickupAddress || defaultSiteConfig.pickupAddress,
      pickupInstructions: settings.pickupInstructions || defaultSiteConfig.pickupInstructions,
      localDeliveryAreas: settings.localDeliveryAreas || defaultSiteConfig.localDeliveryAreas,
      codEnabled: Boolean(settings.codEnabled ?? defaultSiteConfig.codEnabled),
      codAllowedAreas: settings.codAllowedAreas || defaultSiteConfig.codAllowedAreas,
      codMaxAmount: Number(settings.codMaxAmount ?? 500000),
      manualPaymentInstructions: settings.manualPaymentInstructions || null,
      manualPaymentQrKey: settings.manualPaymentQrKey || null,
      manualPaymentHoldMinutes: settings.manualPaymentHoldMinutes ?? 60,
      autoCompleteDays: settings.autoCompleteDays ?? 3,
    };
  } catch (err) {
    console.error("[getStoreSettings] Database error fetching settings, using fallback:", err);
    return defaultSiteConfig;
  }
}

/**
 * Public getter for Store Settings.
 * Direct fetch ensures dynamic real-time values for COD limits, address and delivery areas.
 */
export async function getStoreSettings(): Promise<SiteConfig> {
  return await fetchStoreSettings();
}

