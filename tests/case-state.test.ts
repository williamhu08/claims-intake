import { describe, expect, it } from "vitest";

import {
  caseStateSchema,
  normalizeCaseState,
  type CaseAnalysisModelOutput,
} from "@/lib/claims/schema";

const completeWaterAnalysis: CaseAnalysisModelOutput = {
  claimType: "water_damage",
  summary: "A burst pipe damaged the kitchen cabinet and floor overnight.",
  classificationConfidence: 0.93,
  facts: [
    { key: "incident_cause", status: "collected", value: "A pipe burst under the kitchen sink." },
    { key: "damage_description", status: "collected", value: "The cabinet and floor were flooded." },
    { key: "affected_property", status: "collected", value: "Kitchen cabinet and floor." },
    { key: "loss_timing", status: "collected", value: "Overnight." },
    { key: "active_loss_or_safety", status: "not_applicable", value: null },
    { key: "injury_or_third_party", status: "not_applicable", value: null },
  ],
  proposedRoute: {
    kind: "property_adjuster_review",
    rationale: "The narrative describes property damage from a burst pipe.",
    confidence: 0.91,
  },
};

const categoryFixtures: Array<{
  claimType: CaseAnalysisModelOutput["claimType"];
  route: CaseAnalysisModelOutput["proposedRoute"]["kind"];
}> = [
  { claimType: "water_damage", route: "property_adjuster_review" },
  { claimType: "fire_or_smoke", route: "property_adjuster_review" },
  { claimType: "weather_or_storm", route: "property_adjuster_review" },
  { claimType: "theft_or_vandalism", route: "property_adjuster_review" },
  { claimType: "liability", route: "liability_review" },
  { claimType: "other_or_unclear", route: "human_triage_review" },
];

function analysisFor(
  claimType: CaseAnalysisModelOutput["claimType"],
  route: CaseAnalysisModelOutput["proposedRoute"]["kind"],
  facts: CaseAnalysisModelOutput["facts"],
): CaseAnalysisModelOutput {
  return {
    claimType,
    summary: `A mocked ${claimType} claimant account.`,
    classificationConfidence: 0.8,
    facts,
    proposedRoute: {
      kind: route,
      rationale: "A mocked, non-binding intake recommendation.",
      confidence: 0.75,
    },
  };
}

const completeFacts: CaseAnalysisModelOutput["facts"] = [
  { key: "incident_cause", status: "collected", value: "A stated incident cause." },
  { key: "damage_description", status: "collected", value: "Stated property damage." },
  { key: "affected_property", status: "collected", value: "The stated affected property." },
  { key: "loss_timing", status: "collected", value: "The stated timing." },
  { key: "active_loss_or_safety", status: "not_applicable", value: null },
  { key: "injury_or_third_party", status: "not_applicable", value: null },
];

describe("normalizeCaseState", () => {
  it.each(categoryFixtures)("normalizes a complete $claimType state", ({ claimType, route }) => {
    const result = normalizeCaseState(analysisFor(claimType, route, completeFacts));

    expect(result.claimType).toBe(claimType);
    expect(result.proposedRoute.kind).toBe(route);
    expect(result.missingFactKeys).toEqual([]);
    expect(result.facts).toHaveLength(6);
  });

  it.each(categoryFixtures)("normalizes an incomplete $claimType state", ({ claimType, route }) => {
    const result = normalizeCaseState(
      analysisFor(claimType, route, [
        { key: "damage_description", status: "collected", value: "Only damage is stated." },
      ]),
    );

    expect(result.claimType).toBe(claimType);
    expect(result.missingFactKeys).toEqual([
      "incident_cause",
      "affected_property",
      "loss_timing",
      "active_loss_or_safety",
      "injury_or_third_party",
    ]);
  });

  it("normalizes exact gibberish as an incomplete other_or_unclear state", () => {
    const result = normalizeCaseState(
      analysisFor("other_or_unclear", "human_triage_review", []),
    );

    expect(result.claimType).toBe("other_or_unclear");
    expect(result.missingFactKeys).toHaveLength(6);
    expect(result.proposedRoute.kind).toBe("human_triage_review");
  });

  it("adds provenance and returns every fact in the canonical order", () => {
    const result = normalizeCaseState(completeWaterAnalysis);

    expect(result.facts.map((fact) => fact.key)).toEqual([
      "incident_cause",
      "damage_description",
      "affected_property",
      "loss_timing",
      "active_loss_or_safety",
      "injury_or_third_party",
    ]);
    expect(result.facts.every((fact) => fact.source === "claimant_narrative")).toBe(true);
    expect(result.missingFactKeys).toEqual([]);
    expect(caseStateSchema.parse(result)).toEqual(result);
  });

  it("fills omitted facts as missing and derives missingFactKeys", () => {
    const result = normalizeCaseState({
      ...completeWaterAnalysis,
      facts: [
        { key: "incident_cause", status: "unclear", value: null },
        { key: "damage_description", status: "collected", value: "The basement carpet is wet." },
      ],
      proposedRoute: {
        kind: "human_triage_review",
        rationale: "The source of the water is not established.",
        confidence: 0.44,
      },
    });

    expect(result.missingFactKeys).toEqual([
      "incident_cause",
      "affected_property",
      "loss_timing",
      "active_loss_or_safety",
      "injury_or_third_party",
    ]);
    expect(result.facts.find((fact) => fact.key === "affected_property")?.status).toBe("missing");
  });

  it("rejects duplicate facts instead of silently accepting contradictory state", () => {
    expect(() =>
      normalizeCaseState({
        ...completeWaterAnalysis,
        facts: [
          { key: "incident_cause", status: "collected", value: "A pipe burst." },
          { key: "incident_cause", status: "collected", value: "A roof leak." },
        ],
      }),
    ).toThrow("incident_cause more than once");
  });

  it("rejects a collected fact without a value", () => {
    expect(() =>
      normalizeCaseState({
        ...completeWaterAnalysis,
        facts: [{ key: "incident_cause", status: "collected", value: null }],
      }),
    ).toThrow("must include a claimant-grounded value");
  });

  it("does not trust a value attached to a missing or unclear fact", () => {
    const result = normalizeCaseState({
      ...completeWaterAnalysis,
      facts: [
        { key: "incident_cause", status: "unclear", value: "Unsupported cause." },
      ],
    });

    expect(result.facts.find((fact) => fact.key === "incident_cause")).not.toHaveProperty("value");
    expect(result.missingFactKeys).toContain("incident_cause");
  });
});
