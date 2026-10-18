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
};
