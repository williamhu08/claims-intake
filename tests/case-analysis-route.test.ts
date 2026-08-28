import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config) => config) },
}));

import { generateText } from "ai";

import { POST } from "@/app/api/case-analysis/route";

const mockedGenerateText = vi.mocked(generateText);
const validNarrative = "A pipe burst under the kitchen sink and damaged the cabinet and floor.";

const validModelOutput = {
  claimType: "water_damage",
  summary: "A burst pipe damaged the kitchen cabinet and floor.",
  classificationConfidence: 0.93,
  facts: [
    { key: "incident_cause", status: "collected", value: "A pipe burst under the kitchen sink." },
    { key: "damage_description", status: "collected", value: "The cabinet and floor were damaged." },
    { key: "affected_property", status: "collected", value: "Kitchen cabinet and floor." },
    { key: "loss_timing", status: "missing", value: null },
    { key: "active_loss_or_safety", status: "missing", value: null },
    { key: "injury_or_third_party", status: "not_applicable", value: null },
  ],
  proposedRoute: {
    kind: "property_adjuster_review",
    rationale: "The claimant describes property damage from a burst pipe.",
    confidence: 0.91,
  },
} as const;

function request(body: unknown) {
  return new Request("http://localhost/api/case-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/case-analysis", () => {
  beforeEach(() => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
    vi.unstubAllGlobals();
    mockedGenerateText.mockReset();
  });

  it("returns an application-normalized CaseState from a mocked model result", async () => {
    mockedGenerateText.mockResolvedValue({ output: validModelOutput } as never);

    const response = await POST(request({ narrative: validNarrative }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      claimType: "water_damage",
      missingFactKeys: ["loss_timing", "active_loss_or_safety"],
      proposedRoute: { kind: "property_adjuster_review" },
    });
    expect(mockedGenerateText).toHaveBeenCalledOnce();
  });

  it("rejects a malformed JSON request without calling the model", async () => {
    const response = await POST(
      new Request("http://localhost/api/case-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Send a JSON request with a claim narrative." });
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("rejects an invalid narrative without calling the model", async () => {
    const response = await POST(request({ narrative: "Too short" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Describe what happened in at least 20 characters.",
    });
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("returns a safe error when a mocked model result has an unsupported route", async () => {
    mockedGenerateText.mockResolvedValue({
      output: {
        ...validModelOutput,
        proposedRoute: { ...validModelOutput.proposedRoute, kind: "unsupported_route" },
      },
    } as never);

    const response = await POST(request({ narrative: validNarrative }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "We couldn't complete the case analysis. Check the server logs for the underlying AI Gateway or model error, then try again.",
    });
  });

  it("returns a safe error when the AI SDK request fails", async () => {
    mockedGenerateText.mockRejectedValue(new Error("Gateway unavailable"));

    const response = await POST(request({ narrative: validNarrative }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "We couldn't complete the case analysis. Check the server logs for the underlying AI Gateway or model error, then try again.",
    });
  });
});
