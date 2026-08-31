import type { PublisherLevel } from "./types";

export const LEVEL_META: Record<PublisherLevel, { label: string; emoji: string }> = {
  rising: { label: "Rising Publisher", emoji: "🌱" },
  verified: { label: "Verified Publisher", emoji: "🔵" },
  premium: { label: "Premium Publisher", emoji: "🟣" },
  elite: { label: "Elite Publisher", emoji: "👑" },
};

// Bands from the brief's Part 7 ("Publisher Score: Excellent / Very Good /
// Good / Average") — the thresholds are a reasonable starting split, not
// anything the brief specified exactly. Easy to retune once there's a real
// spread of scores to look at across the full publisher base.
export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Very Good";
  if (score >= 50) return "Good";
  return "Average";
}
