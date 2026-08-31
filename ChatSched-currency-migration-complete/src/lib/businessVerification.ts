export type BusinessVerificationLevel = "bronze" | "silver" | "gold" | null;

export function computeVerificationLevel(business: {
  email_verified: boolean;
  phone_verified: boolean;
  business_verified: boolean;
}): BusinessVerificationLevel {
  if (business.business_verified) return "gold";
  if (business.phone_verified && business.email_verified) return "silver";
  if (business.email_verified) return "bronze";
  return null;
}

export const VERIFICATION_META: Record<Exclude<BusinessVerificationLevel, null>, { label: string; emoji: string }> = {
  bronze: { label: "Bronze Verified", emoji: "🥉" },
  silver: { label: "Silver Verified", emoji: "🥈" },
  gold: { label: "Gold Verified", emoji: "🥇" },
};
