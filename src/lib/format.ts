export function withUnit(value: number | string, unit: string | null | undefined): string {
  const clean = unit?.trim();
  return clean ? `${value} ${clean}` : String(value);
}

/** log10(value) rounded to 2dp, trimmed -- for redisplaying an exponent someone typed. */
export function formatExponent(value: number): string {
  if (!(value > 0)) return "?";
  return (Math.round(Math.log10(value) * 100) / 100).toString();
}

/** log10(value) to a fixed 3dp -- for the revealed true answer's exact order of magnitude. */
export function formatTrueExponent(value: number): string {
  if (!(value > 0)) return "?";
  return Math.log10(value).toFixed(3);
}

/** Whole-number, comma-formatted preview of 10 ** exponent while someone types it. */
export function formatMagnitudePreview(exponent: number): string | null {
  if (!Number.isFinite(exponent)) return null;
  return Math.round(10 ** exponent).toLocaleString();
}
