// lib/circles/formatDuration.ts

type CircleDurationInput = {
  durationType: "INDEFINITE" | "FIXED";
  startDate: Date | null;
  endDate: Date | null;
};

export function formatCircleDuration(circle: CircleDurationInput): string {
  if (circle.durationType === "INDEFINITE") {
    return "Ongoing";
  }

  if (!circle.endDate) return "Ongoing";

  const now = new Date();
  const end = new Date(circle.endDate);
  const msRemaining = end.getTime() - now.getTime();

  if (msRemaining <= 0) return "Completed";

  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  if (daysRemaining === 1) return "1 day left";
  if (daysRemaining <= 6) return `${daysRemaining} days left`;

  const weeksRemaining = Math.round(daysRemaining / 7);
  if (weeksRemaining === 1) return "1 week left";
  if (weeksRemaining <= 8) return `${weeksRemaining} weeks left`;

  const monthsRemaining = Math.round(daysRemaining / 30);
  if (monthsRemaining === 1) return "1 month left";
  return `${monthsRemaining} months left`;
}
