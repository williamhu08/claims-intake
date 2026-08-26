import type { ClaimIntakeResult } from "@/lib/claims/schema";

type ClaimType = ClaimIntakeResult["claimType"];

export const claimTypeLabels: Record<ClaimType, string> = {
  water_damage: "Water damage",
  fire_or_smoke: "Fire or smoke",
  weather_or_storm: "Weather or storm",
  theft_or_vandalism: "Theft or vandalism",
  liability: "Liability",
  other_or_unclear: "Other or unclear",
};

export const claimTypeDescriptions: Record<ClaimType, string> = {
  water_damage: "Leaks, burst pipes, flooding, or moisture-related loss.",
  fire_or_smoke: "Fire, smoke, or heat-related damage.",
  weather_or_storm: "Wind, hail, storm, or other weather events.",
  theft_or_vandalism: "Burglary, theft, or deliberate property damage.",
  liability: "Injury or third-party property damage claims.",
  other_or_unclear: "The account does not map cleanly to one category.",
};

export type ExampleClaim = {
  label: string;
  narrative: string;
};

export const exampleClaims: ExampleClaim[] = [
  {
    label: "Burst pipe",
    narrative:
      "A pipe burst under the kitchen sink overnight and flooded the cabinet and floor. The water soaked into the baseboards and there is now a musty smell in the room.",
  },
  {
    label: "Storm & roof",
    narrative:
      "During last night's storm a large tree branch came down and cracked several roof tiles. Rain then leaked into the upstairs bedroom and left a brown stain spreading across the ceiling.",
  },
  {
    label: "Break-in",
    narrative:
      "I came home to find the back door forced open and the frame splintered. A laptop and some jewelry are missing, and the bedroom had clearly been searched.",
  },
];
