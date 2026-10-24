export interface SiteConfig {
  storeName: string;
  storeTagline: string;
  logoUrl: string | null;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;
  currencySymbol: string;
  shippingFee: number;
  shippingFeeLocal: number;
  shippingFeeCourier: number;
  pickupAddress: string | null;
  pickupInstructions: string | null;
  localDeliveryAreas: string | null;
  codEnabled: boolean;
  codAllowedAreas: string | null;
  codMaxAmount: number;
  manualPaymentInstructions: string | null;
  manualPaymentQrKey: string | null;
  manualPaymentHoldMinutes: number;
  autoCompleteDays: number;
}

export const defaultSiteConfig: SiteConfig = {
  storeName: "RareFinds",
  storeTagline: "Rare & Limited Sneaker Vault",
  logoUrl: null,
  contactEmail: "contact@rarefinds.ph",
  contactPhone: "+63 917 123 4567",
  address: "RareFinds Vault, 4F Bonifacio High Street Central, BGC, Taguig City, Metro Manila",
  currency: "PHP",
  currencySymbol: "₱",
  shippingFee: 0,
  shippingFeeLocal: 150,
  shippingFeeCourier: 250,
  pickupAddress: "RareFinds Vault, 4F Bonifacio High Street Central, BGC, Taguig City, Metro Manila",
  pickupInstructions: "Vault Open: Mon-Sun 11:00 AM - 8:00 PM. Please present 1 valid government ID and your digital order confirmation upon claiming.",
  localDeliveryAreas: "Metro Manila, NCR, Taguig, Makati, Manila, Quezon City, Pasig, Mandaluyong, San Juan, Parañaque, Pasay, Las Piñas, Muntinlupa, Caloocan, Malabon, Navotas, Valenzuela, Marikina, Pateros",
  codEnabled: true,
  codAllowedAreas: "Metro Manila, NCR, Taguig, Makati, Manila, Quezon City, Pasig, Mandaluyong, San Juan, Parañaque, Pasay, Las Piñas, Muntinlupa, Caloocan, Malabon, Navotas, Valenzuela, Marikina, Pateros",
  codMaxAmount: 200000,
  manualPaymentInstructions: null,
  manualPaymentQrKey: null,
  manualPaymentHoldMinutes: 60,
  autoCompleteDays: 3,
};
