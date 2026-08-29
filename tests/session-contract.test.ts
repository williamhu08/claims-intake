import { describe, expect, it } from "vitest";

import { getCaseSessionConfig } from "@/lib/claims/session-config";
import {
  applyCaseSessionAction,
  createCaseSession,
  isWaterSourceClarificationEligible,
  recordClaimantAnswer,
  signCaseSession,
  verifyCaseSession,
} from "@/lib/claims/session-engine";
import {
  caseSessionActionSchema,
  caseSessionStateSchema,
  type CaseSessionAction,
} from "@/lib/claims/session-schema";
import type { CaseState } from "@/lib/claims/schema";

const caseState: CaseState = {
  claimType: "water_damage",
  summary: "Water damaged the kitchen floor.",
  classificationConfidence: 0.8,
  facts: [
    {
      key: "incident_cause",
      label: "What caused the incident",
      status: "unclear",
      source: "claimant_narrative",
    },
    {
      key: "damage_description",
      label: "What was damaged",
      status: "collected",
      value: "Kitchen floor",
      source: "claimant_narrative",
    },
    {
      key: "affected_property",
      label: "Affected property",
      status: "collected",
      value: "Kitchen floor",
      source: "claimant_narrative",
    },
    {
      key: "loss_timing",
      label: "When it happened",
      status: "missing",
      source: "claimant_narrative",
    },
    {
      key: "active_loss_or_safety",
      label: "Active loss or safety concern",
      status: "missing",
      source: "claimant_narrative",
    },
    {
      key: "injury_or_third_party",
      label: "Injury or third-party involvement",
      status: "missing",
      source: "claimant_narrative",
    },
  ],
  missingFactKeys: [
    "incident_cause",
    "loss_timing",
    "active_loss_or_safety",
    "injury_or_third_party",
  ],
  proposedRoute: {
    kind: "human_triage_review",
    rationale: "The source of the water remains unclear.",
    confidence: 0.45,
  },
};

const question: CaseSessionAction = {
  kind: "ask_clarifying_question",
  answerType: "free_text",
  question: "Do you know where the water came from?",
  factKeys: ["incident_cause"],
  whyItMatters: "This helps us send your intake to the right review team.",
};

function withFact(
  state: CaseState,
  key: CaseState["facts"][number]["key"],
  status: CaseState["facts"][number]["status"],
  value?: string,
): CaseState {
  const facts = state.facts.map((fact) =>
    fact.key === key
      ? {
          ...fact,
          status,
          ...(status === "collected" && value ? { value } : { value: undefined }),
        }
      : fact,
  );

  return {
    ...state,
    facts,
    missingFactKeys: facts
      .filter((fact) => fact.status === "missing" || fact.status === "unclear")
      .map((fact) => fact.key),
  };
}

describe("V2 session contract", () => {
  it("accepts a pending, non-terminal signed-session payload shape", () => {
    const session = caseSessionStateSchema.parse({
      version: 1,
      issuedAt: "2026-08-26T19:00:00.000Z",
      expiresAt: "2026-08-26T19:30:00.000Z",
      caseState,
      clarificationHistory: [],
      pendingAction: question,
      actionTrace: [
        { kind: "ask_clarifying_question", at: "2026-08-26T19:00:00.000Z" },
      ],
    });

    expect(session.pendingAction?.factKeys).toEqual(["incident_cause"]);
  });

  it("requires options only for server-declared choice answers", () => {
    expect(caseSessionActionSchema.safeParse({
      ...question,
      answerType: "free_text",
      options: [{ value: "pipe", label: "Pipe" }, { value: "appliance", label: "Appliance" }],
    }).success).toBe(false);
    expect(caseSessionActionSchema.safeParse({
      ...question,
      answerType: "single_choice",
      options: [{ value: "pipe", label: "Pipe" }, { value: "appliance", label: "Appliance" }],
    }).success).toBe(true);
    expect(caseSessionActionSchema.safeParse({
      ...question,
      answerType: "single_choice",
    }).success).toBe(false);
  });

  it("allows clarification for any missing or unclear fact, not only water source", () => {
    const fireState = { ...caseState, claimType: "fire_or_smoke" as const };
    const fireSession = createCaseSession(fireState, 1800, () => new Date("2026-08-26T19:00:00.000Z"));
    const action = { ...question, factKeys: ["injury_or_third_party" as const], question: "Was anyone injured or otherwise involved?" };
    expect(isWaterSourceClarificationEligible(fireSession, 2)).toBe(true);
    expect(() => applyCaseSessionAction(fireSession, action, 2, () => new Date("2026-08-26T19:00:00.000Z"))).not.toThrow();
  });

  it("rejects clarification for collected, not-applicable, or previously asked facts", () => {
    const collected = { ...question, factKeys: ["damage_description" as const] };
    expect(() => applyCaseSessionAction(createCaseSession(caseState, 1800, () => new Date("2026-08-26T19:00:00.000Z")), collected, 2, () => new Date("2026-08-26T19:00:00.000Z"))).toThrow();
    const pending = applyCaseSessionAction(createCaseSession(caseState, 1800, () => new Date("2026-08-26T19:00:00.000Z")), question, 2, () => new Date("2026-08-26T19:00:00.000Z"));
    const answered = recordClaimantAnswer(pending, "A dishwasher leak");
    expect(() => applyCaseSessionAction(answered, question, 2, () => new Date("2026-08-26T19:00:00.000Z"))).toThrow();
  });

  it("rejects an invalid action, repeated fact key, and unsupported route", () => {
    expect(
      caseSessionActionSchema.safeParse({
        ...question,
        factKeys: ["incident_cause", "incident_cause"],
      }).success,
    ).toBe(false);
    expect(
      caseSessionActionSchema.safeParse({
        kind: "propose_route",
        route: "coverage_decision",
        rationale: "No.",
      }).success,
    ).toBe(false);
    expect(
      caseSessionActionSchema.safeParse({
        kind: "escalate_to_human",
        stopReason: "route_supported",
        rationale: "No.",
      }).success,
    ).toBe(false);
  });

  it("rejects a session that is both pending and terminal or already expired", () => {
    const common = {
      version: 1,
      issuedAt: "2026-08-26T19:00:00.000Z",
      caseState,
      clarificationHistory: [],
      actionTrace: [],
    };

    expect(
      caseSessionStateSchema.safeParse({
        ...common,
        expiresAt: "2026-08-26T19:30:00.000Z",
        pendingAction: question,
        terminal: {
          kind: "escalate_to_human",
          stopReason: "unresolved_ambiguity",
          rationale: "A person should review this.",
        },
      }).success,
    ).toBe(false);
    expect(
      caseSessionStateSchema.safeParse({
        ...common,
        expiresAt: "2026-08-26T18:30:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("uses named safe defaults and rejects missing secret or invalid budget", () => {
    expect(getCaseSessionConfig({ CASE_SESSION_SIGNING_SECRET: "test-secret" })).toMatchObject({
      ttlSeconds: 1800,
      maxInputTokens: 12000,
      maxWallClockMs: 10000,
      maxClarifications: 2,
    });
    expect(() => getCaseSessionConfig({})).toThrow("CASE_SESSION_SIGNING_SECRET");
    expect(() =>
      getCaseSessionConfig({
        CASE_SESSION_SIGNING_SECRET: "test-secret",
        CASE_SESSION_MAX_CLARIFICATIONS: "0",
      }),
    ).toThrow("CASE_SESSION_MAX_CLARIFICATIONS");
  });

  it("allows one eligible water-source question, records the answer, and prevents a repeat", () => {
    const now = new Date("2026-08-26T19:00:00.000Z");
    const session = createCaseSession(caseState, 1_800, () => now);

    expect(isWaterSourceClarificationEligible(session, 2)).toBe(true);

    const pending = applyCaseSessionAction(session, question, 2, () => now);
    const answered = recordClaimantAnswer(pending, "It may be coming from the upstairs neighbor.");

    expect(answered.pendingAction).toBeUndefined();
    expect(answered.clarificationHistory).toHaveLength(1);
    expect(isWaterSourceClarificationEligible(answered, 2)).toBe(true);
  });

  it("turns one claimant-supplied first-party source into a provenance-marked property route", () => {
    const pending = applyCaseSessionAction(createCaseSession(caseState, 1_800), question, 2);
    const answered = recordClaimantAnswer(pending, "A pipe under my kitchen sink burst.");
    const resolvedState = withFact(
      {
        ...answered.caseState,
        proposedRoute: {
          kind: "property_adjuster_review",
          rationale: "The claimant identified a first-party burst pipe.",
          confidence: 0.9,
        },
      },
      "incident_cause",
      "collected",
      "A pipe under the kitchen sink burst.",
    );
    const caseStateWithResponseProvenance: CaseState = {
      ...resolvedState,
      facts: resolvedState.facts.map((fact) =>
        fact.key === "incident_cause" ? { ...fact, source: "claimant_response" as const } : fact,
      ),
    };
    const terminal = applyCaseSessionAction(
      { ...answered, caseState: caseStateWithResponseProvenance },
      {
        kind: "propose_route",
        route: "property_adjuster_review",
        rationale: "The first-party source is now established.",
      },
      2,
    );

    expect(terminal.caseState.facts.find((fact) => fact.key === "incident_cause")?.source).toBe(
      "claimant_response",
    );
    expect(terminal.terminal?.stopReason).toBe("route_supported");
    expect(terminal.actionTrace.map((entry) => entry.kind)).toEqual([
      "ask_clarifying_question",
      "propose_route",
    ]);
  });

  it("keeps claimant-stated possible third-party involvement as an intake route, not a fault finding", () => {
    const thirdPartyState = withFact(
      withFact(
        {
          ...caseState,
          proposedRoute: {
            kind: "liability_review",
            rationale: "The claimant states that a neighbor may be involved.",
            confidence: 0.82,
          },
        },
        "incident_cause",
        "collected",
        "Water may be coming from the upstairs neighbor.",
      ),
      "injury_or_third_party",
      "collected",
      "The upstairs neighbor may be involved.",
    );
    const terminal = applyCaseSessionAction(
      createCaseSession(thirdPartyState, 1_800),
      {
        kind: "propose_route",
        route: "liability_review",
        rationale: "The claimant-stated third-party involvement needs liability review.",
      },
      2,
    );

    expect(terminal.terminal).toMatchObject({
      kind: "propose_route",
      stopReason: "route_supported",
    });
    expect(terminal.terminal?.rationale).not.toMatch(/fault|responsib/i);
  });

  it("rejects an ineligible question and a tampered or expired session token", () => {
    const now = new Date("2026-08-26T19:00:00.000Z");
    const session = createCaseSession(caseState, 60, () => now);

    expect(() =>
      applyCaseSessionAction(
        {
          ...session,
          caseState: {
            ...session.caseState,
            facts: session.caseState.facts.map((fact) =>
              fact.key === "incident_cause"
                ? { ...fact, status: "collected" as const, value: "A burst pipe." }
                : fact,
            ),
          },
        },
        question,
        2,
        () => now,
      ),
    ).toThrow("not eligible");

    const token = signCaseSession(session, "test-secret");
    expect(verifyCaseSession(token, "test-secret", () => now)).toEqual(session);
    expect(() => verifyCaseSession(`${token}x`, "test-secret", () => now)).toThrow("signature");
    expect(() =>
      verifyCaseSession(token, "test-secret", () => new Date("2026-08-26T19:01:01.000Z")),
    ).toThrow("expired");
  });

  it("routes clear first-party water damage and ends with an auditable terminal trace", () => {
    const clearWaterState = withFact(
      {
        ...caseState,
        proposedRoute: {
          kind: "property_adjuster_review",
          rationale: "A burst pipe in the claimant's home caused the damage.",
          confidence: 0.9,
        },
      },
      "incident_cause",
      "collected",
      "A burst pipe under the kitchen sink.",
    );
    const session = createCaseSession(clearWaterState, 1_800);
    const terminal = applyCaseSessionAction(
      session,
      {
        kind: "propose_route",
        route: "property_adjuster_review",
        rationale: "The first-party water source is established.",
      },
      2,
    );

    expect(terminal.terminal).toMatchObject({
      kind: "propose_route",
      stopReason: "route_supported",
    });
    expect(terminal.actionTrace).toHaveLength(1);
    expect(() =>
      applyCaseSessionAction(terminal, { kind: "escalate_to_human", stopReason: "unresolved_ambiguity", rationale: "No." }, 2),
    ).toThrow("terminal");
  });

  it("escalates no-response, safety uncertainty, unresolved ambiguity, and gibberish safely", () => {
    const noResponsePending = applyCaseSessionAction(createCaseSession(caseState, 1_800), question, 2);
    const noResponse = recordClaimantAnswer(noResponsePending, "no_response");
    const noResponseTerminal = applyCaseSessionAction(
      noResponse,
      {
        kind: "escalate_to_human",
        stopReason: "claimant_cannot_answer",
        rationale: "The claimant could not identify the source.",
      },
      2,
    );
    const safetyState = withFact(caseState, "active_loss_or_safety", "unclear");
    const gibberishState: CaseState = {
      ...caseState,
      claimType: "other_or_unclear",
      summary: "dsfmbbgvjhksd dfasghjasgbkv",
      proposedRoute: { kind: "human_triage_review", rationale: "No reliable facts are available.", confidence: 0 },
    };

    expect(noResponseTerminal.terminal?.stopReason).toBe("claimant_cannot_answer");
    expect(isWaterSourceClarificationEligible(createCaseSession(safetyState, 1_800), 2)).toBe(true);
    expect(
      applyCaseSessionAction(
        createCaseSession(safetyState, 1_800),
        {
          kind: "escalate_to_human",
          stopReason: "safety_review",
          rationale: "The active loss or safety status needs human review.",
        },
        2,
      ).terminal?.stopReason,
    ).toBe("safety_review");
    expect(isWaterSourceClarificationEligible(createCaseSession(gibberishState, 1_800), 2)).toBe(true);
    expect(
      applyCaseSessionAction(
        createCaseSession(gibberishState, 1_800),
        {
          kind: "escalate_to_human",
          stopReason: "unresolved_ambiguity",
          rationale: "A person should review the unsupported account.",
        },
        2,
      ).terminal?.stopReason,
    ).toBe("unresolved_ambiguity");
  });

  it("rejects a proposed route while active loss or safety status remains unclear, even if the route kind matches", () => {
    const safetyState = withFact(caseState, "active_loss_or_safety", "unclear");
    const resolvedCauseSafetyState = withFact(
      safetyState,
      "incident_cause",
      "collected",
      "A pipe under the kitchen sink burst.",
    );

    expect(() =>
      applyCaseSessionAction(
        createCaseSession(resolvedCauseSafetyState, 1_800),
        {
          kind: "propose_route",
          route: resolvedCauseSafetyState.proposedRoute.kind,
          rationale: "The first-party source is established.",
        },
        2,
      ),
    ).toThrow("not supported");
  });
});
