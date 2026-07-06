export function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string {
  const label = currency ?? "USD";
  if (min && max) {
    return `${label} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  }
  if (min) return `${label} ${min.toLocaleString()}+`;
  if (max) return `${label} up to ${max.toLocaleString()}`;
  return "Compensation n/a";
}
