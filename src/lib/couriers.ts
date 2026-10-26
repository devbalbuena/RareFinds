/**
 * Centralized Philippine Courier Tracking Utility
 * Provides deep links to official tracking portals for verified courier services.
 */

export interface CourierOption {
  id: string;
  name: string;
  shortName: string;
  trackingPlaceholder: string;
  website: string;
}

export const SUPPORTED_COURIERS: CourierOption[] = [
  {
    id: "lbc",
    name: "LBC Express",
    shortName: "LBC",
    trackingPlaceholder: "e.g. 123456789012",
    website: "https://www.lbcexpress.com",
  },
  {
    id: "jt",
    name: "J&T Express",
    shortName: "J&T",
    trackingPlaceholder: "e.g. 781234567890",
    website: "https://www.jtexpress.ph",
  },
  {
    id: "2go",
    name: "2GO Express",
    shortName: "2GO",
    trackingPlaceholder: "e.g. 9876543210",
    website: "https://supplychain.2go.com.ph",
  },
  {
    id: "dhl",
    name: "DHL Express",
    shortName: "DHL",
    trackingPlaceholder: "e.g. 1234567890 (10 digits)",
    website: "https://www.dhl.com",
  },
  {
    id: "ninjavan",
    name: "Ninja Van Philippines",
    shortName: "Ninja Van",
    trackingPlaceholder: "e.g. NVSG00012345678",
    website: "https://www.ninjavan.co/en-ph",
  },
  {
    id: "flashexpress",
    name: "Flash Express",
    shortName: "Flash Express",
    trackingPlaceholder: "e.g. FHP0012345678",
    website: "https://www.flashexpress.ph",
  },
];

/**
 * Returns the official portal URL to directly track a courier waybill number.
 */
export function getCarrierTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  if (!carrier || !trackingNumber) return null;
  const num = trackingNumber.trim();
  if (!num) return null;

  const lower = carrier.toLowerCase();

  if (lower.includes("lbc")) {
    return `https://www.lbcexpress.com/track/?tracking_no=${encodeURIComponent(num)}`;
  }
  if (lower.includes("j&t") || lower.includes("jt")) {
    return `https://www.jtexpress.ph/index/query/gzquery.html?bills=${encodeURIComponent(num)}`;
  }
  if (lower.includes("2go")) {
    return `https://supplychain.2go.com.ph/track/track.asp?tin=${encodeURIComponent(num)}`;
  }
  if (lower.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(num)}`;
  }
  if (lower.includes("ninja")) {
    return `https://www.ninjavan.co/en-ph/tracking?id=${encodeURIComponent(num)}`;
  }
  if (lower.includes("flash")) {
    return `https://www.flashexpress.ph/fle/tracking?se=${encodeURIComponent(num)}`;
  }

  return null;
}
