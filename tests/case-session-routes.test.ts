/** Clearway version scope: V2. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/claims/session-agent", () => ({
  analyzeClaimNarrative: vi.fn(),
  refreshCaseStateFromClarification: vi.fn(),
  selectNextCaseSessionAction: vi.fn(),
}));

import { POST as respond } from "@/app/api/case-session/respond/route";
import { POST as start } from "@/app/api/case-session/start/route";
import {
  analyzeClaimNarrative,
  refreshCaseStateFromClarification,
  selectNextCaseSessionAction,
} from "@/lib/claims/session-agent";
import {
  applyCaseSessionAction,
  createCaseSession,
  recordClaimantAnswer,
  signCaseSession,
} from "@/lib/claims/session-engine";
import type { CaseState } from "@/lib/claims/schema";
import type { CaseSessionAction } from "@/lib/claims/session-schema";

const mockedAnalyze = vi.mocked(analyzeClaimNarrative);
const mockedRefresh = vi.mocked(refreshCaseStateFromClarification);
const mockedSelect = vi.mocked(selectNextCaseSessionAction);
const sessionSecret = "test-session-secret";

const waterCaseState: CaseState = {
  claimType: "water_damage",
  summary: "Water damaged the kitchen floor, but its source is unknown.",
  classificationConfidence: 0.72,
  facts: [
    { key: "incident_cause", label: "What caused the incident", status: "unclear", source: "claimant_narrative" },
    { key: "damage_description", label: "What was damaged", status: "collected", value: "Kitchen floor", source: "claimant_narrative" },
    { key: "affected_property", label: "Affected property", status: "collected", value: "Kitchen floor", source: "claimant_narrative" },
    { key: "loss_timing", label: "When it happened", status: "missing", source: "claimant_narrative" },
    { key: "active_loss_or_safety", label: "Active loss or safety concern", status: "missing", source: "claimant_narrative" },
    { key: "injury_or_third_party", label: "Injury or third-party involvement", status: "missing", source: "claimant_narrative" },
  ],
  missingFactKeys: ["incident_cause", "loss_timing", "active_loss_or_safety", "injury_or_third_party"],
  proposedRoute: { kind: "human_triage_review", rationale: "The source is unclear.", confidence: 0.45 },
};

const sourceQuestion: CaseSessionAction = {
  kind: "ask_clarifying_question",
  answerType: "free_text",
  question: "Do you know where the water came from?",
  factKeys: ["incident_cause"],
  whyItMatters: "This helps us send your intake to the right review team.",
};

function request(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("V2 case-session routes", () => {
  beforeEach(() => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
    vi.stubEnv("CASE_SESSION_SIGNING_SECRET", sessionSecret);
    mockedAnalyze.mockReset();
    mockedRefresh.mockReset();
    mockedSelect.mockReset();
  });

  it("starts a signed session from V1-grounded state and one validated action", async () => {
    mockedAnalyze.mockResolvedValue(waterCaseState);
    mockedSelect.mockResolvedValue(sourceQuestion);

    const response = await start(
      request("http://localhost/api/case-session/start", {
        narrative: "Water appeared across the kitchen floor, but I do not know where it came from.",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      session: { pendingAction: sourceQuestion },
      sessionToken: expect.any(String),
    });
    expect(mockedAnalyze).toHaveBeenCalledOnce();
    expect(mockedSelect).toHaveBeenCalledOnce();
  });

  it("rejects an invalid start request without calling an agent", async () => {
    const response = await start(request("http://localhost/api/case-session/start", { narrative: "Short" }));

    expect(response.status).toBe(400);
    expect(mockedAnalyze).not.toHaveBeenCalled();
    expect(mockedSelect).not.toHaveBeenCalled();
  });

  it("asks about the next unresolved fact after a no-response, instead of escalating past it", async () => {
    // Regression test: an explicit no-response only resolves the fact the claimant
    // was actually asked about (incident_cause). Three other facts (loss_timing,
    // active_loss_or_safety, injury_or_third_party) were never asked, so the route
    // must consult the model for the next action rather than instantly escalating.
    const session = applyCaseSessionAction(createCaseSession(waterCaseState, 1_800), sourceQuestion, 2);
    const token = signCaseSession(session, sessionSecret);

    const refreshedCaseState: CaseState = {
      ...waterCaseState,
      facts: waterCaseState.facts.map((fact) =>
        fact.key === "incident_cause" ? { ...fact, status: "unclear" as const } : fact,
      ),
    };
    const timingQuestion: CaseSessionAction = {
      kind: "ask_clarifying_question",
      answerType: "free_text",
      question: "Is the damage still happening or is anyone unsafe?",
      factKeys: ["active_loss_or_safety"],
      whyItMatters: "This determines whether the case needs urgent routing.",
    };
    mockedRefresh.mockResolvedValue(refreshedCaseState);
    mockedSelect.mockResolvedValue(timingQuestion);

    const response = await respond(
      request("http://localhost/api/case-session/respond", { sessionToken: token, answer: "no_response" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      session: { pendingAction: timingQuestion },
    });
    expect(mockedRefresh).toHaveBeenCalledOnce();
    expect(mockedSelect).toHaveBeenCalledOnce();
  });

  it("escalates a no-response only once every unresolved fact has actually been asked", async () => {
    // Build a session where the other three unresolved facts (loss_timing,
    // active_loss_or_safety, injury_or_third_party) were already asked and
    // answered in prior turns, so only incident_cause remains — asking it and
    // getting a no-response makes every fact "asked", so escalation is now valid.
    const timingQuestion: CaseSessionAction = {
      kind: "ask_clarifying_question",
      answerType: "free_text",
      question: "When did this happen?",
      factKeys: ["loss_timing"],
      whyItMatters: "This helps determine urgency.",
    };
    const safetyQuestion: CaseSessionAction = {
      kind: "ask_clarifying_question",
      answerType: "free_text",
      question: "Is the damage still happening or is anyone unsafe?",
      factKeys: ["active_loss_or_safety"],
      whyItMatters: "This determines whether the case needs urgent routing.",
    };
    const injuryQuestion: CaseSessionAction = {
      kind: "ask_clarifying_question",
      answerType: "free_text",
      question: "Was anyone injured or is another party involved?",
      factKeys: ["injury_or_third_party"],
      whyItMatters: "This affects liability review.",
    };

    let priorTurns = createCaseSession(waterCaseState, 1_800);
    for (const question of [timingQuestion, safetyQuestion, injuryQuestion]) {
      priorTurns = applyCaseSessionAction(priorTurns, question, 10);
      priorTurns = recordClaimantAnswer(priorTurns, "I'm not sure.");
    }
    const session = applyCaseSessionAction(priorTurns, sourceQuestion, 10);
    const token = signCaseSession(session, sessionSecret);

    mockedRefresh.mockResolvedValue(waterCaseState);
    mockedSelect.mockResolvedValue({
      kind: "escalate_to_human",
      stopReason: "claimant_cannot_answer",
      rationale: "The claimant could not identify the source.",
    });

    const response = await respond(
      request("http://localhost/api/case-session/respond", { sessionToken: token, answer: "no_response" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      session: {
        terminal: { kind: "escalate_to_human", stopReason: "claimant_cannot_answer" },
      },
    });
    expect(mockedRefresh).toHaveBeenCalledOnce();
    expect(mockedSelect).toHaveBeenCalledOnce();
  });

  it("rejects an invalid session token before continuing", async () => {
    const response = await respond(
      request("http://localhost/api/case-session/respond", { sessionToken: "tampered", answer: "A pipe burst." }),
    );

    expect(response.status).toBe(409);
    expect(mockedRefresh).not.toHaveBeenCalled();
  });
});
