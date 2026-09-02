/** Clearway version scope: V2. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config) => config) },
}));

import { generateText } from "ai";

import {
  CaseSessionSafetyBudgetError,
  selectNextCaseSessionAction,
} from "@/lib/claims/session-agent";
import { createCaseSession } from "@/lib/claims/session-engine";
import type { CaseState } from "@/lib/claims/schema";

const mockedGenerateText = vi.mocked(generateText);

const ambiguousWaterState: CaseState = {
  claimType: "water_damage",
  summary: "Water damaged the kitchen floor, but its source is unclear.",
  classificationConfidence: 0.7,
  facts: [
    { key: "incident_cause", label: "What caused the incident", status: "unclear", source: "claimant_narrative" },
    { key: "damage_description", label: "What was damaged", status: "collected", value: "Kitchen floor", source: "claimant_narrative" },
    { key: "affected_property", label: "Affected property", status: "collected", value: "Kitchen floor", source: "claimant_narrative" },
    { key: "loss_timing", label: "When it happened", status: "missing", source: "claimant_narrative" },
    { key: "active_loss_or_safety", label: "Active loss or safety concern", status: "missing", source: "claimant_narrative" },
    { key: "injury_or_third_party", label: "Injury or third-party involvement", status: "missing", source: "claimant_narrative" },
  ],
  missingFactKeys: ["incident_cause", "loss_timing", "active_loss_or_safety", "injury_or_third_party"],
  proposedRoute: { kind: "human_triage_review", rationale: "The source remains unclear.", confidence: 0.4 },
};

describe("V2 session-agent tool selection", () => {
  beforeEach(() => {
    mockedGenerateText.mockReset();
  });

  it("allows an eligible clarification tool and validates its mocked result", async () => {
    mockedGenerateText.mockResolvedValue({
      toolCalls: [
        {
          toolName: "ask_clarifying_question",
          input: {
            question: "Do you know where the water came from?",
            factKeys: ["incident_cause"],
            whyItMatters: "This helps us choose the appropriate review path.",
          },
        },
      ],
      usage: { inputTokens: 120 },
    } as never);

    const action = await selectNextCaseSessionAction(createCaseSession(ambiguousWaterState, 1_800), 2, 12_000, 10_000);

    expect(action.kind).toBe("ask_clarifying_question");
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        toolChoice: "required",
        tools: expect.objectContaining({ ask_clarifying_question: expect.any(Object) }),
      }),
    );
    expect(mockedGenerateText.mock.calls[0]?.[0].tools).not.toHaveProperty("propose_route");
    expect(mockedGenerateText.mock.calls[0]?.[0].tools).not.toHaveProperty("escalate_to_human");
  });

  it("fails safely when a mocked model action exceeds the configured input-token budget", async () => {
    mockedGenerateText.mockResolvedValue({ toolCalls: [], usage: { inputTokens: 12_001 } } as never);

    await expect(
      selectNextCaseSessionAction(createCaseSession(ambiguousWaterState, 1_800), 2, 12_000, 10_000),
    ).rejects.toBeInstanceOf(CaseSessionSafetyBudgetError);
  });
});
