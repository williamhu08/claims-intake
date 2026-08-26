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

export const caseFactKeyValues = [
  "incident_cause",
  "damage_description",
  "affected_property",
  "loss_timing",
  "active_loss_or_safety",
  "injury_or_third_party",
] as const;

export const factStatusValues = [
  "collected",
  "missing",
  "unclear",
  "not_applicable",
] as const;

export const proposedRouteKindValues = [
  "property_adjuster_review",
  "liability_review",
  "human_triage_review",
] as const;

export const caseFactLabels: Record<CaseFactKey, string> = {
  incident_cause: "What caused the incident",
  damage_description: "What was damaged",
  affected_property: "Affected property",
  loss_timing: "When it happened",
  active_loss_or_safety: "Active loss or safety concern",
  injury_or_third_party: "Injury or third-party involvement",
};

export const proposedRouteLabels: Record<ProposedRouteKind, string> = {
  property_adjuster_review: "Property adjuster review",
  liability_review: "Liability review",
  human_triage_review: "Human triage review",
};

const modelCaseFactSchema = z.object({
  key: z.enum(caseFactKeyValues),
  status: z.enum(factStatusValues),
  // Nullable keeps this field present in strict structured-output schemas while allowing non-collected facts to omit a value semantically.
  value: z.string().trim().min(1).max(280).nullable(),
});

export const caseAnalysisModelOutputSchema = z.object({
  claimType: z.enum(claimTypeValues),
  summary: z.string().trim().min(1).max(360),
  classificationConfidence: z.number().min(0).max(1),
  facts: z.array(modelCaseFactSchema).max(caseFactKeyValues.length),
  proposedRoute: z.object({
    kind: z.enum(proposedRouteKindValues),
    rationale: z.string().trim().min(1).max(280),
    confidence: z.number().min(0).max(1),
  }),
});

export const caseFactSchema = z.object({
  key: z.enum(caseFactKeyValues),
  label: z.string(),
  status: z.enum(factStatusValues),
  value: z.string().min(1).max(280).optional(),
  source: z.literal("claimant_narrative"),
});

export const proposedRouteSchema = z.object({
  kind: z.enum(proposedRouteKindValues),
  rationale: z.string().min(1).max(280),
  confidence: z.number().min(0).max(1),
});

export const caseStateSchema = z.object({
  claimType: z.enum(claimTypeValues),
  summary: z.string().min(1).max(360),
  classificationConfidence: z.number().min(0).max(1),
  facts: z.array(caseFactSchema).length(caseFactKeyValues.length),
  missingFactKeys: z.array(z.enum(caseFactKeyValues)),
  proposedRoute: proposedRouteSchema,
});

export function normalizeCaseState(modelOutput: CaseAnalysisModelOutput): CaseState {
  const factsByKey = new Map<CaseFactKey, ModelCaseFact>();

  for (const fact of modelOutput.facts) {
    if (factsByKey.has(fact.key)) {
      throw new Error(`The analysis returned ${fact.key} more than once.`);
    }

    if (fact.status === "collected" && !fact.value) {
      throw new Error(`A collected ${fact.key} must include a claimant-grounded value.`);
    }

    // Ignore stray values on non-collected facts. They are not displayed or trusted;
    // the status is authoritative and the canonical state omits the value.
    factsByKey.set(fact.key, fact);
  }

  const facts = caseFactKeyValues.map((key) => {
    const fact = factsByKey.get(key);

    return {
      key,
      label: caseFactLabels[key],
      status: fact?.status ?? "missing",
      ...(fact?.status === "collected" && fact.value ? { value: fact.value } : {}),
      source: "claimant_narrative" as const,
    };
  });

  const missingFactKeys = facts
    .filter((fact) => fact.status === "missing" || fact.status === "unclear")
    .map((fact) => fact.key);

  return caseStateSchema.parse({
    claimType: modelOutput.claimType,
    summary: modelOutput.summary,
    classificationConfidence: modelOutput.classificationConfidence,
    facts,
    missingFactKeys,
    proposedRoute: modelOutput.proposedRoute,
  });
}

export type ClaimIntakeRequest = z.infer<typeof claimIntakeRequestSchema>;
export type ClaimIntakeResult = z.infer<typeof claimIntakeResultSchema>;
export type CaseFactKey = (typeof caseFactKeyValues)[number];
export type FactStatus = (typeof factStatusValues)[number];
export type ProposedRouteKind = (typeof proposedRouteKindValues)[number];
export type ModelCaseFact = z.infer<typeof modelCaseFactSchema>;
export type CaseAnalysisModelOutput = z.infer<typeof caseAnalysisModelOutputSchema>;
export type CaseFact = z.infer<typeof caseFactSchema>;
export type ProposedRoute = z.infer<typeof proposedRouteSchema>;
export type CaseState = z.infer<typeof caseStateSchema>;
