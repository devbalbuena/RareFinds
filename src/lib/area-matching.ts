/**
 * Helper to normalize and match delivery and COD geographical areas.
 * Enforces strict, normalized exact matching against city or province names (not substrings).
 */

export function normalizeAreaString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Checks if a destination city or province matches any entry in the allowed areas list.
 * Expects allowedAreasList to be comma-separated, e.g. "Metro Manila, San Juan, Quezon City, Makati"
 */
export function isAreaAllowed(
  city: string | null | undefined,
  province: string | null | undefined,
  allowedAreasList: string | null | undefined
): boolean {
  if (!allowedAreasList || !allowedAreasList.trim()) {
    return false;
  }

  const normalizedCity = city ? normalizeAreaString(city) : "";
  const normalizedProvince = province ? normalizeAreaString(province) : "";

  const allowedEntries = allowedAreasList
    .split(/[,\n;]+/)
    .map((entry) => normalizeAreaString(entry))
    .filter((entry) => entry.length > 0);

  // Exact normalized match against city or province
  return allowedEntries.some((allowed) => {
    return (
      (normalizedCity.length > 0 && normalizedCity === allowed) ||
      (normalizedProvince.length > 0 && normalizedProvince === allowed)
    );
  });
}
