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
  question: "Do you know where the water came from?",
  factKeys: ["incident_cause"],
  whyItMatters: "This helps us send your intake to the right review team.",
};

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
    expect(isWaterSourceClarificationEligible(answered, 2)).toBe(false);
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
});
