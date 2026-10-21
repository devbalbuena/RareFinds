export type PaymentMode = "demo" | "cod_only" | "live";

/**
 * Returns the active payment operational mode.
 * - "demo": COD (real) + simulated GCash, Maya, and Card instant checkout testing.
 * - "cod_only": Only Cash on Delivery is enabled.
 * - "live": Reserved for future PayMongo gateway; falls back to cod_only until activated.
 * - In production: defaults to "cod_only" if PAYMENT_MODE is unset.
 */
export function getPaymentMode(): PaymentMode {
  const raw = process.env.PAYMENT_MODE?.toLowerCase().trim();
  if (raw === "demo") return "demo";
  if (raw === "live") {
    console.warn(
      "[getPaymentMode] 'live' payment mode is reserved for future PayMongo provider. Defaulting to cod_only."
    );
    return "cod_only";
  }
  if (raw === "cod_only") return "cod_only";

  // Production safety default
  if (process.env.NODE_ENV === "production") {
    return "cod_only";
  }

  // Local development default
  return "demo";
}
