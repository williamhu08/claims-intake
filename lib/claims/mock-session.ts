/** Clearway version scope: V2. */
import type { CaseState } from "@/lib/claims/schema";
import {
  applyCaseSessionAction,
  createCaseSession,
  recordClaimantAnswer,
} from "@/lib/claims/session-engine";
import type { CaseSessionAction, CaseSessionState } from "@/lib/claims/session-schema";

export const MOCK_WATER_SOURCE_QUESTION: CaseSessionAction = {
  kind: "ask_clarifying_question" as const,
  answerType: "free_text" as const,
  question: "What do you believe caused the water damage? If you are not sure, tell us what you noticed—for example, a burst pipe, appliance leak, drain backup, roof or window leak, condensation, or something else.",
  factKeys: ["incident_cause"],
  whyItMatters: "Identifying the source helps determine the right handling, mitigation steps, and which specialists may be needed.",
};

const MOCK_INITIAL_STATE: CaseState = {
  claimType: "water_damage",
  summary: "Claimant reports discovering water damage on the kitchen floor and inside kitchen cabinets; source and start time are unknown.",
  classificationConfidence: 0.84,
  facts: [
    { key: "incident_cause", label: "What caused the incident", status: "unclear", source: "claimant_narrative" },
    { key: "damage_description", label: "What was damaged", status: "collected", value: "Water damage on kitchen floor and inside kitchen cabinets", source: "claimant_narrative" },
    { key: "affected_property", label: "Affected property", status: "collected", value: "Kitchen floor and kitchen cabinets", source: "claimant_narrative" },
    { key: "loss_timing", label: "When it happened", status: "missing", source: "claimant_narrative" },
    { key: "active_loss_or_safety", label: "Active loss or safety concern", status: "missing", source: "claimant_narrative" },
    { key: "injury_or_third_party", label: "Injury or third-party involvement", status: "missing", source: "claimant_narrative" },
  ],
  missingFactKeys: ["incident_cause", "loss_timing", "active_loss_or_safety", "injury_or_third_party"],
  proposedRoute: { kind: "human_triage_review", rationale: "The water source is not yet identified.", confidence: 0.5 },
};

export function createMockStartSession(ttlSeconds: number): CaseSessionState {
  const session = createCaseSession(MOCK_INITIAL_STATE, ttlSeconds);
  return applyCaseSessionAction(session, MOCK_WATER_SOURCE_QUESTION, 3);
}

export function createMockRespondedSession(session: CaseSessionState, answer: string | "no_response"): CaseSessionState {
  const answered = recordClaimantAnswer(session, answer);
  if (answer === "no_response") {
    return applyCaseSessionAction(answered, {
      kind: "escalate_to_human",
      stopReason: "claimant_cannot_answer",
      rationale: "The claimant could not identify the material detail.",
    }, 3);
  }

  const cause = answered.caseState.facts.map((fact) =>
    fact.key === "incident_cause"
      ? { ...fact, status: "collected" as const, value: answer, source: "claimant_response" as const }
      : fact,
  );
  const updated = {
    ...answered,
    caseState: {
      ...answered.caseState,
      summary: `Claimant reports discovering water damage on the kitchen floor and inside kitchen cabinets; water source identified as ${answer.toLowerCase()}; start time remains unknown.`,
      classificationConfidence: 0.9,
      facts: cause,
      missingFactKeys: ["loss_timing", "active_loss_or_safety", "injury_or_third_party"] as CaseState["missingFactKeys"],
      proposedRoute: { kind: "property_adjuster_review" as const, rationale: `Water damage with source identified as ${answer.toLowerCase()} and no stated injuries or third-party involvement; appropriate for property handling.`, confidence: 0.9 },
    },
  };

  return applyCaseSessionAction(updated, {
    kind: "propose_route",
    route: "property_adjuster_review",
    rationale: "The source is identified and the claim is ready for property adjuster review.",
  }, 3);
}
