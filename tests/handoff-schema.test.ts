/** Clearway version scope: V3. */
import { describe, expect, it } from "vitest";

import {
  adjusterReadyHandoffSchema,
  caseHandoffResponseSchema,
  mockPolicyContextSchema,
  mockPolicyFixtureSchema,
  operationalUrgencySchema,
} from "@/lib/claims/handoff-schema";
import type { CaseState } from "@/lib/claims/schema";

const caseState: CaseState = {
  claimType: "water_damage",
  summary: "A burst pipe damaged the kitchen floor.",
  classificationConfidence: 0.9,
  facts: [
    { key: "incident_cause", label: "What caused the incident", status: "collected", value: "Burst pipe", source: "claimant_narrative" },
    { key: "damage_description", label: "What was damaged", status: "collected", value: "Kitchen floor", source: "claimant_narrative" },
    { key: "affected_property", label: "Affected property", status: "collected", value: "Kitchen", source: "claimant_narrative" },
    { key: "loss_timing", label: "When it happened", status: "collected", value: "This morning", source: "claimant_narrative" },
    { key: "active_loss_or_safety", label: "Active loss or safety concern", status: "collected", value: "Resolved: The leak stopped and the area is safe.", source: "claimant_response" },
    { key: "injury_or_third_party", label: "Injury or third-party involvement", status: "not_applicable", source: "claimant_narrative" },
  ],
  missingFactKeys: [],
  proposedRoute: {
    kind: "property_adjuster_review",
    rationale: "The reported loss is supported by the claimant details.",
    confidence: 0.9,
  },
};

const terminal = {
  kind: "propose_route" as const,
  stopReason: "route_supported" as const,
  rationale: "The available details support property-adjuster review.",
};

const resolvedSafetyFact = caseState.facts[4];

describe("V3 handoff schema contract", () => {
  it("requires exactly one handoff response outcome", () => {
    const handoff = adjusterReadyHandoffSchema.parse({
      version: 1,
      caseState,
      clarificationHistory: [],
      v2Terminal: terminal,
      mockPolicyContext: {
        fixtureId: "clearway-demo-water-property-adjuster-v1",
        fixtureVersion: 1,
        policyContextStatus: "route_supported",
        rationale: "Demo handling context supports property-adjuster review.",
      },
      urgency: {
        level: "standard",
        evidenceFact: resolvedSafetyFact,
        rationale: "The claimant confirmed that the loss is resolved and the area is safe.",
      },
      finalDisposition: "property_adjuster_review",
      rationale: "The intake can proceed to property-adjuster review.",
    });

    expect(caseHandoffResponseSchema.safeParse({ handoff }).success).toBe(true);
    expect(caseHandoffResponseSchema.safeParse({ error: "A person must review this case." }).success).toBe(true);
    expect(caseHandoffResponseSchema.safeParse({}).success).toBe(false);
    expect(caseHandoffResponseSchema.safeParse({ handoff, error: "Contradictory outcome." }).success).toBe(false);
  });

  it("accepts the agreed property-adjuster fixture shape", () => {
    expect(mockPolicyFixtureSchema.safeParse({
      id: "clearway-demo-water-property-adjuster-v1",
      version: 1,
      claimType: "water_damage",
      match: {
        kind: "property_adjuster_route",
        terminalKind: "propose_route",
        stopReason: "route_supported",
        proposedRoute: "property_adjuster_review",
      },
      policyContextStatus: "route_supported",
      rationale: "Demo handling context supports property-adjuster review.",
    }).success).toBe(true);
  });

  it("rejects fixture match/status combinations that contradict the mock-policy contract", () => {
    expect(mockPolicyFixtureSchema.safeParse({
      id: "contradictory-property-fixture",
      version: 1,
      claimType: "water_damage",
      match: {
        kind: "property_adjuster_route",
        terminalKind: "propose_route",
        stopReason: "route_supported",
        proposedRoute: "property_adjuster_review",
      },
      policyContextStatus: "human_review_required",
      rationale: "This record must be rejected.",
    }).success).toBe(false);

    expect(mockPolicyFixtureSchema.safeParse({
      id: "contradictory-fallback-fixture",
      version: 1,
      claimType: "water_damage",
      match: { kind: "other_terminal_water_damage" },
      policyContextStatus: "route_supported",
      rationale: "This record must be rejected.",
    }).success).toBe(false);
  });

  it("keeps no-mock-record context free of fabricated fixture provenance", () => {
    expect(mockPolicyContextSchema.safeParse({
      fixtureId: null,
      fixtureVersion: null,
      policyContextStatus: "no_mock_record",
      rationale: "No matching demo handling record is available.",
    }).success).toBe(true);

    expect(mockPolicyContextSchema.safeParse({
      fixtureId: "invented-fixture",
      fixtureVersion: 1,
      policyContextStatus: "no_mock_record",
      rationale: "No matching demo handling record is available.",
    }).success).toBe(false);
  });

  it("accepts a standard property-adjuster handoff", () => {
    expect(adjusterReadyHandoffSchema.safeParse({
      version: 1,
      caseState,
      clarificationHistory: [],
      v2Terminal: terminal,
      mockPolicyContext: {
        fixtureId: "clearway-demo-water-property-adjuster-v1",
        fixtureVersion: 1,
        policyContextStatus: "route_supported",
        rationale: "Demo handling context supports property-adjuster review.",
      },
      urgency: {
        level: "standard",
        evidenceFact: resolvedSafetyFact,
        rationale: "The claimant confirmed that the loss is resolved and the area is safe.",
      },
      finalDisposition: "property_adjuster_review",
      rationale: "The intake can proceed to property-adjuster review.",
    }).success).toBe(true);
  });

  it("rejects an urgent property-adjuster handoff", () => {
    expect(adjusterReadyHandoffSchema.safeParse({
      version: 1,
      caseState,
      clarificationHistory: [],
      v2Terminal: terminal,
      mockPolicyContext: {
        fixtureId: "clearway-demo-water-property-adjuster-v1",
        fixtureVersion: 1,
        policyContextStatus: "route_supported",
        rationale: "Demo handling context supports property-adjuster review.",
      },
      urgency: {
        level: "urgent",
        evidenceFact: { ...resolvedSafetyFact, value: "Active: Water is still leaking." },
        rationale: "The claimant says the water is still leaking.",
      },
      finalDisposition: "property_adjuster_review",
      rationale: "The intake can proceed to property-adjuster review.",
    }).success).toBe(false);
  });

  it("requires Active or Resolved claimant evidence for non-human urgency", () => {
    expect(operationalUrgencySchema.safeParse({
      level: "urgent",
      evidenceFact: resolvedSafetyFact,
      rationale: "This must be rejected because the loss is resolved.",
    }).success).toBe(false);

    expect(operationalUrgencySchema.safeParse({
      level: "standard",
      evidenceFact: { ...resolvedSafetyFact, value: "Active: Water is still leaking." },
      rationale: "This must be rejected because the loss is active.",
    }).success).toBe(false);
  });
});
