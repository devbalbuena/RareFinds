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
  address: "Manila, Philippines",
  currency: "PHP",
  currencySymbol: "₱",
  shippingFee: 0,
  shippingFeeLocal: 150,
  shippingFeeCourier: 250,
  pickupAddress: null,
  pickupInstructions: null,
  localDeliveryAreas: null,
  codEnabled: false,
  codAllowedAreas: null,
  codMaxAmount: 20000,
  manualPaymentInstructions: null,
  manualPaymentQrKey: null,
  manualPaymentHoldMinutes: 60,
  autoCompleteDays: 3,
};
