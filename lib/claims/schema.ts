import { z } from "zod";

export const claimTypeValues = [
  "water_damage",
  "fire_or_smoke",
  "weather_or_storm",
  "theft_or_vandalism",
  "liability",
  "other_or_unclear",
] as const;

export const claimNarrativeSchema = z
  .string()
  .trim()
  .min(20, "Describe what happened in at least 20 characters.")
  .max(4_000, "Keep the description under 4,000 characters.");

export const claimIntakeRequestSchema = z.object({
  narrative: claimNarrativeSchema,
});

export const claimIntakeResultSchema = z.object({
  claimType: z.enum(claimTypeValues),
  summary: z.string().min(1).max(360),
  confidence: z.number().min(0).max(1),
});

export type ClaimIntakeRequest = z.infer<typeof claimIntakeRequestSchema>;
export type ClaimIntakeResult = z.infer<typeof claimIntakeResultSchema>;
