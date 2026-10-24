import { DeliveryMethod } from "@prisma/client";

export interface ShippingCalculation {
  fee: number;
  deliveryMethod: DeliveryMethod;
  zoneName: string;
  isLocalExpressAvailable: boolean;
  estimatedTransitTime: string;
}

// Region categorization based on distance from Metro Manila vault
export function getRegionZone(regionIdOrName?: string | null): {
  zoneKey: "NCR" | "GREATER_MANILA" | "LUZON" | "VISAYAS" | "MINDANAO";
  zoneName: string;
  baseCourierFee: number;
  transitDays: string;
} {
  if (!regionIdOrName) {
    return {
      zoneKey: "NCR",
      zoneName: "Metro Manila (NCR)",
      baseCourierFee: 150,
      transitDays: "1-2 Business Days",
    };
  }

  const normalized = regionIdOrName.toUpperCase().trim();

  // 1. National Capital Region (Metro Manila)
  if (
    normalized === "NCR" ||
    normalized.includes("METRO MANILA") ||
    normalized.includes("NATIONAL CAPITAL") ||
    normalized.includes("MANILA")
  ) {
    return {
      zoneKey: "NCR",
      zoneName: "Metro Manila (NCR)",
      baseCourierFee: 150,
      transitDays: "1-2 Business Days",
    };
  }

  // 2. Greater Manila Area (Nearby Luzon provinces in CALABARZON / Central Luzon)
  if (
    normalized === "REGION_3" ||
    normalized === "REGION_4A" ||
    normalized.includes("CALABARZON") ||
    normalized.includes("CENTRAL LUZON") ||
    normalized.includes("CAVITE") ||
    normalized.includes("LAGUNA") ||
    normalized.includes("BATANGAS") ||
    normalized.includes("RIZAL") ||
    normalized.includes("BULACAN") ||
    normalized.includes("PAMPANGA")
  ) {
    return {
      zoneKey: "GREATER_MANILA",
      zoneName: "Greater Manila (Nearby Luzon)",
      baseCourierFee: 200,
      transitDays: "2-3 Business Days",
    };
  }

  // 3. Rest of Luzon
  if (
    normalized === "CAR" ||
    normalized === "REGION_1" ||
    normalized === "REGION_2" ||
    normalized === "REGION_5" ||
    normalized === "MIMAROPA" ||
    normalized.includes("CORDILLERA") ||
    normalized.includes("ILOCOS") ||
    normalized.includes("CAGAYAN") ||
    normalized.includes("BICOL")
  ) {
    return {
      zoneKey: "LUZON",
      zoneName: "North & South Luzon",
      baseCourierFee: 250,
      transitDays: "3-5 Business Days",
    };
  }

  // 4. Visayas (Inter-island air freight)
  if (
    normalized === "REGION_6" ||
    normalized === "REGION_7" ||
    normalized === "REGION_8" ||
    normalized.includes("VISAYAS") ||
    normalized.includes("CEBU") ||
    normalized.includes("ILOILO") ||
    normalized.includes("BACOLOD") ||
    normalized.includes("BOHOL") ||
    normalized.includes("LEYTE")
  ) {
    return {
      zoneKey: "VISAYAS",
      zoneName: "Visayas (Inter-Island Air Courier)",
      baseCourierFee: 350,
      transitDays: "4-7 Business Days",
    };
  }

  // 5. Mindanao & Island Territories (Long-haul air freight)
  return {
    zoneKey: "MINDANAO",
    zoneName: "Mindanao (Long-Haul Air Courier)",
    baseCourierFee: 420,
    transitDays: "5-9 Business Days",
  };
}

// Local Express calculation for cities within Metro Manila
export function getLocalExpressFee(cityName?: string | null): {
  fee: number;
  tierName: string;
} {
  if (!cityName) {
    return { fee: 150, tierName: "Metro Manila Standard Rider" };
  }

  const normalized = cityName.toLowerCase().trim();

  // Zone 1: Central Vault Zone (Taguig, Makati, Pasig, Mandaluyong, San Juan, Pateros)
  if (
    normalized.includes("taguig") ||
    normalized.includes("bgc") ||
    normalized.includes("makati") ||
    normalized.includes("pasig") ||
    normalized.includes("mandaluyong") ||
    normalized.includes("san juan") ||
    normalized.includes("pateros")
  ) {
    return { fee: 120, tierName: "Central Vault Zone (Express Rider)" };
  }

  // Zone 2: Mid Metro Zone (Manila, Pasay, Quezon City, Marikina, Parañaque)
  if (
    normalized.includes("manila") ||
    normalized.includes("pasay") ||
    normalized.includes("quezon") ||
    normalized.includes("marikina") ||
    normalized.includes("parañaque") ||
    normalized.includes("paranaque")
  ) {
    return { fee: 160, tierName: "Metro Mid Zone (Express Rider)" };
  }

  // Zone 3: Outer Metro Manila (Caloocan, Malabon, Navotas, Valenzuela, Las Piñas, Muntinlupa/Alabang)
  return { fee: 220, tierName: "Outer Metro Zone (Extended Rider)" };
}

/**
 * Main Shipping Calculation engine
 * Dynamically computes fees based on distance from Manila vault
 */
export function calculateShippingFee({
  deliveryMethod,
  regionIdOrName,
  cityName,
}: {
  deliveryMethod: DeliveryMethod;
  regionIdOrName?: string | null;
  cityName?: string | null;
}): ShippingCalculation {
  if (deliveryMethod === DeliveryMethod.PICKUP) {
    return {
      fee: 0,
      deliveryMethod: DeliveryMethod.PICKUP,
      zoneName: "Store Self Pickup (Free)",
      isLocalExpressAvailable: true,
      estimatedTransitTime: "Ready for claiming after Vault QC",
    };
  }

  const zone = getRegionZone(regionIdOrName);
  const isNCR = zone.zoneKey === "NCR";

  if (deliveryMethod === DeliveryMethod.LOCAL_DELIVERY) {
    if (!isNCR) {
      // Fallback to courier if address is outside NCR
      return {
        fee: zone.baseCourierFee,
        deliveryMethod: DeliveryMethod.COURIER,
        zoneName: `${zone.zoneName}`,
        isLocalExpressAvailable: false,
        estimatedTransitTime: zone.transitDays,
      };
    }

    const localTier = getLocalExpressFee(cityName);
    return {
      fee: localTier.fee,
      deliveryMethod: DeliveryMethod.LOCAL_DELIVERY,
      zoneName: localTier.tierName,
      isLocalExpressAvailable: true,
      estimatedTransitTime: "Same-Day / Next-Day Rider Handover",
    };
  }

  // Nationwide Courier
  return {
    fee: zone.baseCourierFee,
    deliveryMethod: DeliveryMethod.COURIER,
    zoneName: `${zone.zoneName}`,
    isLocalExpressAvailable: isNCR,
    estimatedTransitTime: zone.transitDays,
  };
}
