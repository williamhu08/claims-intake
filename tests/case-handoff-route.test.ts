/** Clearway version scope: V3. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/case-handoff/route";
import { createCaseHandoffRouteHandler } from "@/lib/claims/handoff-route-handler";
import { signCaseSession } from "@/lib/claims/session-engine";
import type { CaseState } from "@/lib/claims/schema";
import { caseSessionStateSchema, type CaseSessionState } from "@/lib/claims/session-schema";

const sessionSecret = "test-handoff-session-secret";

/** Creates a JSON request suitable for invoking the route handler directly. */
function request(body: unknown) {
  return new Request("http://localhost/api/case-handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

/** Creates a signed-session payload in either a terminal or in-progress V2 state. */
function createSession(
  caseState = createCaseState(),
  terminal: NonNullable<CaseSessionState["terminal"]> | null = {
    kind: "propose_route",
    stopReason: "route_supported",
    rationale: "The available details support property-adjuster review.",
  },
  expiresAt = "2030-08-30T18:30:00.000Z",
  issuedAt = "2026-08-30T18:00:00.000Z",
): CaseSessionState {
  return caseSessionStateSchema.parse({
    version: 1,
    issuedAt,
    expiresAt,
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

/** Signs a test session with the same secret configured for the route. */
function signedToken(session: CaseSessionState): string {
  return signCaseSession(session, sessionSecret);
}

describe("V3 case-handoff route", () => {
  beforeEach(() => {
    vi.stubEnv("CASE_SESSION_SIGNING_SECRET", sessionSecret);
  });

  it("returns a standard property-adjuster handoff from a signed terminal water session", async () => {
    const response = await POST(request({ sessionToken: signedToken(createSession()) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      handoff: {
        finalDisposition: "property_adjuster_review",
        urgency: { level: "standard" },
        mockPolicyContext: {
          fixtureId: "clearway-demo-water-property-adjuster-v1",
          policyContextStatus: "route_supported",
        },
      },
    });
  });

  it("returns urgent human review for an active safety-review session", async () => {
    const activeSafetyState = withSafetyFact(
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
    const session = createSession(activeSafetyState, {
      kind: "escalate_to_human",
      stopReason: "safety_review",
      rationale: "An active water loss needs human review.",
    });

    const response = await POST(request({ sessionToken: signedToken(session) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      handoff: {
        finalDisposition: "human_review",
        urgency: { level: "urgent" },
        mockPolicyContext: {
          fixtureId: "clearway-demo-water-human-review-v1",
          policyContextStatus: "human_review_required",
        },
      },
    });
  });

  it("keeps a route-supported session in human review when the safety fact is missing", async () => {
    const session = createSession(withSafetyFact(createCaseState(), "missing"));

    const response = await POST(request({ sessionToken: signedToken(session) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      handoff: {
        finalDisposition: "human_review",
        urgency: { level: "human_review" },
      },
    });
  });

  it("uses the fixture-required human-review outcome for a non-property terminal session", async () => {
    const session = createSession(createCaseState({
      proposedRoute: {
        kind: "human_triage_review",
        rationale: "The source of the water damage is unresolved.",
        confidence: 0.5,
      },
    }), {
      kind: "escalate_to_human",
      stopReason: "unresolved_ambiguity",
      rationale: "A material ambiguity requires human review.",
    });

    const response = await POST(request({ sessionToken: signedToken(session) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      handoff: {
        finalDisposition: "human_review",
        mockPolicyContext: {
          fixtureId: "clearway-demo-water-human-review-v1",
          policyContextStatus: "human_review_required",
        },
      },
    });
  });

  it("keeps the handoff in human review when the server fixture registry has no matching record", async () => {
    const postWithNoMockFixtures = createCaseHandoffRouteHandler([]);

    const response = await postWithNoMockFixtures(request({ sessionToken: signedToken(createSession()) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      handoff: {
        finalDisposition: "human_review",
        mockPolicyContext: {
          fixtureId: null,
          fixtureVersion: null,
          policyContextStatus: "no_mock_record",
        },
      },
    });
  });

  it("rejects an invalid token before evaluating the handoff", async () => {
    const response = await POST(request({ sessionToken: "tampered" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This case session is invalid or has expired. Start again to continue.",
    });
  });

  it("rejects a request without a session token", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
  });

  it("rejects an expired signed session token before evaluating the handoff", async () => {
    const expiredSession = createSession(
      createCaseState(),
      undefined,
      "2020-08-30T18:30:00.000Z",
      "2020-08-30T18:00:00.000Z",
    );

    const response = await POST(request({ sessionToken: signedToken(expiredSession) }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This case session is invalid or has expired. Start again to continue.",
    });
  });

  it("rejects a signed session that is not terminal", async () => {
    const response = await POST(request({ sessionToken: signedToken(createSession(createCaseState(), null)) }));

    expect(response.status).toBe(422);
  });

  it("rejects a signed non-water session outside the narrow V3 slice", async () => {
    const response = await POST(request({
      sessionToken: signedToken(createSession(createCaseState({ claimType: "fire_or_smoke" }))),
    }));

    expect(response.status).toBe(422);
  });
});
