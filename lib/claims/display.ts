/** Frontend display configuration accumulated across V0–V2 and used throughout the current V3 application. */
import {
  supportedClaimTypeValues,
  type ClaimIntakeResult,
  type CaseFactSource,
} from "@/lib/claims/schema";
import type {
  ClarificationAnswerType,
  ClarificationOption,
  StopReason,
} from "@/lib/claims/session-schema";

type ClaimType = ClaimIntakeResult["claimType"];

/** Frontend copy and testing samples for every server-declared answer type. */
export const clarificationAnswerTypeDisplay: Record<
  ClarificationAnswerType,
  { label: string; hint: string; sampleOptions?: ClarificationOption[] }
> = {
  free_text: { label: "Free text", hint: "Answer in your own words." },
  address: { label: "Address", hint: "Enter the full address." },
  money: { label: "Money", hint: "Enter a non-negative amount with exactly two decimal places." },
  date: { label: "Date", hint: "Select the year, then the month, then the day." },
  date_time: { label: "Date & time", hint: "Select the date, then enter the time in 24-hour format (e.g. 2:34:26 PM as 14:34:26)." },
  yes_no: { label: "Yes / No", hint: "Choose yes or no." },
  single_choice: {
    label: "Single choice",
    hint: "Choose one option.",
    sampleOptions: [
      { value: "burst_pipe", label: "Burst pipe" },
      { value: "roof_leak", label: "Roof leak" },
      { value: "appliance_leak", label: "Appliance leak" },
    ],
  },
  multi_choice: {
    label: "Multi choice",
    hint: "Select one or more options that apply.",
    sampleOptions: [
      { value: "kitchen", label: "Kitchen" },
      { value: "bathroom", label: "Bathroom" },
      { value: "basement", label: "Basement" },
      { value: "hallway", label: "Hallway" },
    ],
  },
  integer: { label: "Integer", hint: "Enter a whole number." },
  percentage: { label: "Percentage", hint: "Enter a percentage between 0 and 100 with an optional decimal point, without a leading zero (e.g. 7 or 7.5, not 07)." },
  phone: { label: "Phone", hint: "" },
  email: { label: "Email", hint: "Enter a valid email address." },
  postal_code: { label: "Postal code", hint: "Enter a 5-digit postal code." },
  url: { label: "URL", hint: "Enter a valid web address; http:// or https:// is optional." },
};

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

export const claimTypeDisplay: Record<ClaimType, { label: string; description: string }> = {
  water_damage: { label: "Water damage", description: "Leaks, burst pipes, flooding, or moisture-related loss." },
  fire_or_smoke: { label: "Fire or smoke", description: "Fire, smoke, or heat-related damage." },
  weather_or_storm: { label: "Weather or storm", description: "Wind, hail, storm, or other weather events." },
  theft_or_vandalism: { label: "Theft or vandalism", description: "Burglary, theft, or deliberate property damage." },
  liability: { label: "Liability", description: "Injury or third-party property damage claims." },
  other_or_unclear: { label: "Other or unclear", description: "The account does not map cleanly to one category." },
};

// This list only surfaces the categories a claimant's account can actually be
// classified into. "other_or_unclear" is deliberately excluded here — it is an
// internal fallback the model selects when a narrative doesn't map cleanly to
// a real category, not something to advertise as a "supported" category a
// claimant could knowingly submit under. It remains a valid ClaimType for that
// internal classification/routing use (see claimTypeDisplay above and
// app/api/intake/route.ts).
export const claimTypeOptions = supportedClaimTypeValues.map((value) => ({
  value,
  ...claimTypeDisplay[value],
}));

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
