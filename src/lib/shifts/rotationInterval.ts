// lib/shifts/rotationInterval.ts
type Cadence = "WEEKLY" | "BIWEEKLY" | "CUSTOM";

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Returns a human label describing how often a given helper's turn comes up.
 * Depends on total helpers in rotation (N), the circle's cadence, and how many
 * days a week the circle runs.
 *
 * One day a week (unchanged from before):
 *   N=1 weekly   → "Every week"
 *   N=3 weekly   → "Every 3 weeks"
 *   N=3 biweekly → "Every 6 weeks"
 *
 * Several days a week — weeks stop being a useful unit, so count visits:
 *   N=1 → "Every visit"
 *   N=2 → "Every other visit"
 *   N=3 → "Every 3rd visit"
 */
export function formatRotationInterval(
  helpersInRotation: number,
  cadence: Cadence,
  daysPerWeek: number = 1,
): string {
  if (helpersInRotation <= 0) return "Not in rotation";

  if (daysPerWeek > 1) {
    if (helpersInRotation === 1) return "Every visit";
    if (helpersInRotation === 2) return "Every other visit";
    return `Every ${ordinal(helpersInRotation)} visit`;
  }

  const weeksBetween =
    cadence === "BIWEEKLY" ? helpersInRotation * 2 : helpersInRotation;

  if (weeksBetween === 1) return "Every week";
  if (weeksBetween === 2) return "Every other week";
  return `Every ${weeksBetween} weeks`;
}
