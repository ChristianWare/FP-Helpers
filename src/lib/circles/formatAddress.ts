// lib/circles/formatAddress.ts

type AddressParts = {
  address: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
};

/**
 * Returns the two display lines for an address, or null values if empty.
 * Line 1: street address
 * Line 2: "City, ST ZIP" — gracefully handles partial data
 */
export function formatCircleAddress(parts: AddressParts): {
  line1: string | null;
  line2: string | null;
} {
  const { address, addressCity, addressState, addressZip } = parts;

  const line1 = address?.trim() || null;

  const cityPart = addressCity?.trim() || "";
  const stateZipParts = [addressState?.trim(), addressZip?.trim()]
    .filter((p): p is string => !!p && p.length > 0)
    .join(" ");

  const secondLineParts = [cityPart, stateZipParts].filter((p) => p.length > 0);
  const line2 = secondLineParts.length > 0 ? secondLineParts.join(", ") : null;

  return { line1, line2 };
}

/**
 * Single-line version for things like Google Maps URLs.
 */
export function formatCircleAddressOneLine(parts: AddressParts): string | null {
  const { line1, line2 } = formatCircleAddress(parts);
  const segments = [line1, line2].filter((s): s is string => !!s);
  return segments.length > 0 ? segments.join(", ") : null;
}
