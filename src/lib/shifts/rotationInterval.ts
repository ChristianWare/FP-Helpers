// lib/shifts/rotationInterval.ts
type Cadence = "WEEKLY" | "BIWEEKLY" | "CUSTOM";

/**
 * Returns a human label describing how often a given helper's turn comes up.
 * Depends on total helpers in rotation (N) and the circle's cadence.
 *
 * Examples:
 *   N=1 weekly  → "Every week"
 *   N=3 weekly  → "Every 3 weeks"
 *   N=3 biweekly → "Every 6 weeks"
 */
export function formatRotationInterval(
  helpersInRotation: number,
  cadence: Cadence,
): string {
  if (helpersInRotation <= 0) return "Not in rotation";

  const weeksBetween =
    cadence === "BIWEEKLY" ? helpersInRotation * 2 : helpersInRotation;

  if (weeksBetween === 1) return "Every week";
  if (weeksBetween === 2) return "Every other week";
  return `Every ${weeksBetween} weeks`;
}
