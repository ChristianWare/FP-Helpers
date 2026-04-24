// lib/format.ts

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function phoneHref(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return `tel:+1${digits.length === 11 ? digits.slice(1) : digits}`;
}

export function fullName(user: {
  firstName: string;
  lastName: string;
}): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

// lib/format.ts (append)

/**
 * Formats "City, STATE ZIP" from individual parts.
 * Gracefully handles missing pieces.
 * e.g. formatCityStateZip("Phoenix", "AZ", "85001") → "Phoenix, AZ 85001"
 */
export function formatCityStateZip(
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined,
): string {
  const cityPart = city?.trim() ?? "";
  const stateZip = [state?.trim(), zip?.trim()].filter(Boolean).join(" ");

  if (!cityPart && !stateZip) return "";
  if (cityPart && stateZip) return `${cityPart}, ${stateZip}`;
  return cityPart || stateZip;
}

const DAYS_OF_WEEK_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function dayOfWeekLabel(day: number): string {
  return DAYS_OF_WEEK_LONG[day] ?? "";
}
