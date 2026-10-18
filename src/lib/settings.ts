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
    };
  } catch (err) {
    console.error("[getStoreSettings] Database error fetching settings, using fallback:", err);
    return defaultSiteConfig;
  }
}

/**
 * Cached getter for Store Settings.
 * Cached with Next.js unstable_cache and tagged for on-demand revalidation.
 */
const cachedGetStoreSettings = unstable_cache(
  fetchStoreSettings,
  ["store_settings_cache_key"],
  {
    tags: [STORE_SETTINGS_CACHE_TAG],
    revalidate: 3600, // 1 hour background revalidation
  }
);

/**
 * Public getter for Store Settings with cache & standalone execution support.
 */
export async function getStoreSettings(): Promise<SiteConfig> {
  try {
    return await cachedGetStoreSettings();
  } catch {
    // Graceful fallback when executed outside Next.js request context (e.g. test scripts)
    return await fetchStoreSettings();
  }
}
