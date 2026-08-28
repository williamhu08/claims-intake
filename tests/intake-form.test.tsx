import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntakeForm } from "@/components/intake-form";
import { claimTypeOptions } from "@/lib/claims/display";

const validNarrative = "A pipe burst under the kitchen sink and damaged the cabinet and floor.";

const incompleteCaseState = {
  claimType: "water_damage",
  summary: "A pipe damaged the kitchen cabinet and floor.",
  classificationConfidence: 0.86,
  facts: [
    { key: "incident_cause", label: "What caused the incident", status: "collected", value: "A pipe burst.", source: "claimant_narrative" },
    { key: "damage_description", label: "What was damaged", status: "collected", value: "The kitchen cabinet and floor.", source: "claimant_narrative" },
    { key: "affected_property", label: "Affected property", status: "collected", value: "Kitchen cabinet and floor.", source: "claimant_narrative" },
    { key: "loss_timing", label: "When it happened", status: "unclear", source: "claimant_narrative" },
    { key: "active_loss_or_safety", label: "Active loss or safety concern", status: "missing", source: "claimant_narrative" },
    { key: "injury_or_third_party", label: "Injury or third-party involvement", status: "not_applicable", source: "claimant_narrative" },
  ],
  missingFactKeys: ["loss_timing", "active_loss_or_safety"],
  proposedRoute: {
    kind: "property_adjuster_review",
    rationale: "The narrative describes property damage from a burst pipe.",
    confidence: 0.8,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockJsonResponse(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      json: async () => toCaseStateFixture(body),
    }),
  );
}

function toCaseStateFixture(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const result = body as Record<string, unknown>;
  if (
    typeof result.claimType !== "string" ||
    typeof result.summary !== "string" ||
    typeof result.confidence !== "number"
  ) return body;

  return {
    claimType: result.claimType,
    summary: result.summary,
    classificationConfidence: result.confidence,
    facts: [
      { key: "incident_cause", label: "What caused the incident", status: "collected", value: "A mocked cause." , source: "claimant_narrative" },
      { key: "damage_description", label: "What was damaged", status: "collected", value: "Mocked damage.", source: "claimant_narrative" },
      { key: "affected_property", label: "What property is affected", status: "collected", value: "Mocked property.", source: "claimant_narrative" },
      { key: "loss_timing", label: "When it happened", status: "collected", value: "Recently.", source: "claimant_narrative" },
      { key: "active_loss_or_safety", label: "Whether loss or safety risk is active", status: "collected", value: "No active risk stated.", source: "claimant_narrative" },
      { key: "injury_or_third_party", label: "Injury or third-party involvement", status: "not_applicable", source: "claimant_narrative" },
    ],
    missingFactKeys: [],
    proposedRoute: { kind: "property_adjuster_review", rationale: "A mocked, non-binding intake recommendation.", confidence: 0.8 },
  };
}

async function submitNarrative(narrative = validNarrative) {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "Describe what happened" }), narrative);
  await user.click(screen.getByRole("button", { name: "Get initial assessment" }));
}

describe("IntakeForm", () => {
  it.each(claimTypeOptions)("renders a mocked $label assessment", async (category) => {
    mockJsonResponse({
      claimType: category.value,
      summary: `Mocked ${category.label.toLowerCase()} assessment.`,
      confidence: 0.91,
    });

    render(<IntakeForm />);
    await submitNarrative();

    expect(
      await screen.findByRole("heading", { name: category.label }),
    ).toBeInTheDocument();
    expect(screen.getByText(`Mocked ${category.label.toLowerCase()} assessment.`)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/case-analysis",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it.each([
    [
      "an ambiguous input",
      "I noticed a strange odor in the hallway and I am not sure what caused it or whether anything is damaged.",
    ],
    ["the exact gibberish input", "dsfmbbgvjhksd dfasghjasgbkv"],
  ])("renders other_or_unclear for %s when the API returns that safe result", async (_, narrative) => {
    mockJsonResponse({
      claimType: "other_or_unclear",
      summary: "The account does not contain enough meaningful information to classify the incident.",
      confidence: 0.12,
    });

    render(<IntakeForm />);
    await submitNarrative(narrative);

    expect(await screen.findByRole("heading", { name: "Other or unclear" })).toBeInTheDocument();
  });

  it("shows inline validation and does not submit a short narrative", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<IntakeForm />);
    await user.type(screen.getByRole("textbox", { name: "Describe what happened" }), "Too short");

    expect(screen.getByText(/At least 20 characters/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get initial assessment" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a safe error for a provider failure", async () => {
    mockJsonResponse({ error: "We couldn't complete the initial assessment. Please try again." }, 502);

    render(<IntakeForm />);
    await submitNarrative();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't complete the initial assessment. Please try again.",
    );
  });

  it("shows a safe error for a malformed successful response", async () => {
    mockJsonResponse({
      claimType: "water_damage",
      summary: "A response with an incomplete state.",
      classificationConfidence: 0.8,
      facts: [],
      missingFactKeys: [],
      proposedRoute: { kind: "property_adjuster_review" },
    });

    render(<IntakeForm />);
    await submitNarrative();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The session response didn't match the expected shape. Check /api/case-session/start for a schema mismatch between the server payload and caseSessionStateSchema.",
    );
  });

  it("shows a safe error for an unreadable response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      }),
    );

    render(<IntakeForm />);
    await submitNarrative();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server sent a response that wasn't valid JSON. Check the server logs for a route crash or an unhandled error in /api/case-session/start.",
    );
  });

  it("shows a safe error when the request cannot reach the service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    render(<IntakeForm />);
    await submitNarrative();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The request to /api/case-session/start failed before a response arrived. Check your network connection or the dev server console for a crashed request; your narrative is still available above.",
    );
  });

  it("shows the loading state while the request is pending", async () => {
    let resolveRequest: (value: unknown) => void;
    const pendingResponse = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingResponse));

    render(<IntakeForm />);
    await submitNarrative();

    expect(screen.getByRole("button", { name: "Assessing…" })).toBeDisabled();
    resolveRequest!({
      ok: true,
      json: async () => toCaseStateFixture({
        claimType: "water_damage",
        summary: "Mocked water assessment.",
        confidence: 0.9,
      }),
    });

    expect(await screen.findByRole("heading", { name: "Water damage" })).toBeInTheDocument();
  });

  it("renders claimant-facing collected and still-needed facts from a CaseState", async () => {
    mockJsonResponse(incompleteCaseState);

    render(<IntakeForm />);
    await submitNarrative();

    expect(await screen.findByRole("heading", { name: "Collected facts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Still needed" })).toBeInTheDocument();
    expect(screen.getByText("Is the damage still happening or is anyone unsafe?")).toBeInTheDocument();
    expect(screen.getByText("It was mentioned, but the detail is still unclear.")).toBeInTheDocument();
    expect(
      screen.getByText(/We don't know yet—for example, whether water is still leaking/),
    ).toBeInTheDocument();
    expect(screen.getByText("Property adjuster review")).toBeInTheDocument();
  });

  it("keeps the case-state update accessible and responsive", async () => {
    mockJsonResponse(incompleteCaseState);

    render(<IntakeForm />);
    await submitNarrative();

    const caseStateLabel = await screen.findByText("Case state");
    expect(caseStateLabel.closest("section")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("heading", { name: "Collected facts" }).parentElement?.parentElement).toHaveClass(
      "sm:grid-cols-2",
    );
  });
});
