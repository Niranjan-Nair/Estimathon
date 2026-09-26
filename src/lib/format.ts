export function withUnit(value: number | string, unit: string | null | undefined): string {
  const clean = unit?.trim();
  return clean ? `${value} ${clean}` : String(value);
}

/** Exact power-of-ten exponent, for values produced as 10 ** n. */
export function exponentOf(value: number): number {
  return Math.round(Math.log10(value));
}
