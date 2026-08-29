import type { ClaimIntakeResult, CaseFactSource } from "@/lib/claims/schema";
import type { StopReason } from "@/lib/claims/session-schema";

type ClaimType = ClaimIntakeResult["claimType"];

/** Claimant-facing label for where a fact's value came from. Never expose the raw enum. */
export const caseFactSourceLabels: Record<CaseFactSource, string> = {
  claimant_narrative: "From your description",
  claimant_response: "From your answer",
};

/**
 * Claimant-facing copy for each server stop reason. Centralized here so that if the
 * server's stop-reason enum changes, only this map needs updating — the UI never
 * renders a raw enum value.
 */
export const stopReasonCopy: Record<
  StopReason,
  { heading: string; description: string; nextStep: string }
> = {
  route_supported: {
    heading: "Route identified",
    description: "Enough information was collected to suggest where this claim should go next.",
    nextStep: "Review the proposed route below. This is a preliminary recommendation, not a coverage decision.",
  },
  unresolved_ambiguity: {
    heading: "Needs human review",
    description: "The account still leaves important details unclear, so this case needs a person to review it before it can be routed.",
    nextStep: "No action is needed from you right now. A member of the claims team will follow up.",
  },
  claimant_cannot_answer: {
    heading: "Needs human review",
    description: "You weren't able to provide a needed detail, so this case has been sent for human review instead of guessing.",
    nextStep: "No action is needed from you right now. A member of the claims team will follow up.",
  },
  safety_review: {
    heading: "Needs human review",
    description: "Your answers indicate that the loss may still be active or that a specific area may not be safe. A claims professional should review those details before the case is routed.",
    nextStep: "Stay clear of any area you believe is unsafe. If there is immediate danger, contact emergency services; otherwise, a member of the claims team will follow up about the affected area and next steps.",
  },
  safety_budget_exhausted: {
    heading: "Needs human review",
    description: "This case reached the limit on how many clarifying questions it can ask automatically, so a person will take it from here.",
    nextStep: "No action is needed from you right now. A member of the claims team will follow up.",
  },
};

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

export const claimTypeOptions: Array<{
  value: ClaimType;
  label: string;
  description: string;
}> = [
  {
    value: "water_damage",
    label: claimTypeLabels.water_damage,
    description: claimTypeDescriptions.water_damage,
  },
  {
    value: "fire_or_smoke",
    label: claimTypeLabels.fire_or_smoke,
    description: claimTypeDescriptions.fire_or_smoke,
  },
  {
    value: "weather_or_storm",
    label: claimTypeLabels.weather_or_storm,
    description: claimTypeDescriptions.weather_or_storm,
  },
  {
    value: "theft_or_vandalism",
    label: claimTypeLabels.theft_or_vandalism,
    description: claimTypeDescriptions.theft_or_vandalism,
  },
  {
    value: "liability",
    label: claimTypeLabels.liability,
    description: claimTypeDescriptions.liability,
  },
  {
    value: "other_or_unclear",
    label: claimTypeLabels.other_or_unclear,
    description: claimTypeDescriptions.other_or_unclear,
  },
];

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
  {
    label: "Unknown water source",
    narrative:
      "I came home and found water damage on the kitchen floor and inside the cabinets. I don't know where the water came from or when it started.",
  },
  {
    label: "Kitchen fire",
    narrative:
      "A pan of oil caught fire on the stove while I was cooking. The flames scorched the cabinets above and smoke damaged the ceiling and walls throughout the kitchen.",
  },
];
