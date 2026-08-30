/** Clearway version scope: V3. */
import { describe, expect, it } from "vitest";

import {
  V3HandoffEligibilityError,
  buildAdjusterReadyHandoff,
  lookupMockPolicyContext,
  mockWaterPolicyFixtures,
} from "@/lib/claims/handoff-engine";
import type { MockPolicyFixture } from "@/lib/claims/handoff-schema";
import type { CaseState } from "@/lib/claims/schema";
import { caseSessionStateSchema, type CaseSessionState } from "@/lib/claims/session-schema";

/** Builds a schema-valid water-damage case state, allowing one test override. */
function createCaseState(overrides: Partial<CaseState> = {}): CaseState {
  const base: CaseState = {
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

  return { ...base, ...overrides };
}

/** Creates a V2 session in either a terminal or in-progress state for engine tests. */
function createTerminalSession(
  caseState = createCaseState(),
  terminal: NonNullable<CaseSessionState["terminal"]> | null = {
    kind: "propose_route",
    stopReason: "route_supported",
    rationale: "The available details support property-adjuster review.",
  },
): CaseSessionState {
  return caseSessionStateSchema.parse({
    version: 1,
    issuedAt: "2026-08-30T18:00:00.000Z",
    expiresAt: "2026-08-30T18:30:00.000Z",
    caseState,
    clarificationHistory: [],
    actionTrace: [],
    ...(terminal ? { terminal } : {}),
  });
}

/** Replaces the V2 active-loss-or-safety fact without mutating the base fixture. */
function withSafetyFact(caseState: CaseState, status: "collected" | "missing", value?: string): CaseState {
  const facts = caseState.facts.map((fact) => (
    fact.key === "active_loss_or_safety"
      ? { ...fact, status, ...(value ? { value } : { value: undefined }) }
      : fact
  ));

  return {
    ...caseState,
    facts,
    missingFactKeys: facts
      .filter((fact) => fact.status === "missing" || fact.status === "unclear")
      .map((fact) => fact.key),
  } as CaseState;
}

describe("V3 deterministic handoff engine", () => {
  it("builds a standard property-adjuster handoff for a resolved water loss", () => {
    const handoff = buildAdjusterReadyHandoff(createTerminalSession());

    expect(handoff.mockPolicyContext).toMatchObject({
      fixtureId: "clearway-demo-water-property-adjuster-v1",
      policyContextStatus: "route_supported",
    });
    expect(handoff.urgency.level).toBe("standard");
    expect(handoff.finalDisposition).toBe("property_adjuster_review");
  });

  it("keeps an active safety review as urgent human review", () => {
    const activeState = withSafetyFact(
      createCaseState({
        proposedRoute: {
          kind: "human_triage_review",
          rationale: "Active safety concern requires review.",
          confidence: 0.9,
        },
      }),
      "collected",
      "Active: Water is still leaking from the ceiling.",
    );
    const session = createTerminalSession(activeState, {
      kind: "escalate_to_human",
      stopReason: "safety_review",
      rationale: "An active water loss needs human review.",
    });

    const handoff = buildAdjusterReadyHandoff(session);

    expect(handoff.mockPolicyContext.policyContextStatus).toBe("human_review_required");
    expect(handoff.urgency.level).toBe("urgent");
    expect(handoff.finalDisposition).toBe("human_review");
  });

  it("uses human review when the safety fact is missing", () => {
    const missingSafetyState = withSafetyFact(createCaseState(), "missing");
    const handoff = buildAdjusterReadyHandoff(createTerminalSession(missingSafetyState));

    expect(handoff.mockPolicyContext.policyContextStatus).toBe("route_supported");
    expect(handoff.urgency.level).toBe("human_review");
    expect(handoff.finalDisposition).toBe("human_review");
  });

  it("returns no-mock-record without inventing fixture provenance", () => {
    const context = lookupMockPolicyContext(createTerminalSession(), []);
    const handoff = buildAdjusterReadyHandoff(createTerminalSession(), []);

    expect(context).toMatchObject({
      fixtureId: null,
      fixtureVersion: null,
      policyContextStatus: "no_mock_record",
    });
    expect(handoff.finalDisposition).toBe("human_review");
  });

  it("treats a malformed expected fixture as no mock record", () => {
    const malformedFixtures = [{
      id: "clearway-demo-water-property-adjuster-v1",
      version: 0,
      claimType: "water_damage",
      match: { kind: "property_adjuster_route" },
      policyContextStatus: "route_supported",
      rationale: "Malformed fixture for test coverage.",
    }] as unknown as readonly MockPolicyFixture[];

    expect(lookupMockPolicyContext(createTerminalSession(), malformedFixtures)).toMatchObject({
      fixtureId: null,
      fixtureVersion: null,
      policyContextStatus: "no_mock_record",
    });
  });

  it("treats duplicate matching fixtures as no mock record", () => {
    const propertyFixture = mockWaterPolicyFixtures[0];
    const duplicateFixtures = [
      ...mockWaterPolicyFixtures,
      { ...propertyFixture, id: "clearway-demo-water-property-adjuster-duplicate-v1" },
    ];

    expect(lookupMockPolicyContext(createTerminalSession(), duplicateFixtures)).toMatchObject({
      fixtureId: null,
      fixtureVersion: null,
      policyContextStatus: "no_mock_record",
    });
  });

  it("rejects non-terminal and non-water sessions outside the V3 slice", () => {
    const nonTerminal = createTerminalSession(createCaseState(), null);
    const nonWater = createTerminalSession(createCaseState({ claimType: "fire_or_smoke" }));

    expect(() => buildAdjusterReadyHandoff(nonTerminal)).toThrow(V3HandoffEligibilityError);
    expect(() => buildAdjusterReadyHandoff(nonWater)).toThrow(V3HandoffEligibilityError);
  });
});
