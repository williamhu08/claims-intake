/** Clearway version scope: V3. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CaseHandoffPanel } from "@/components/case-handoff-panel";

const baseCaseState = {
  claimType: "water_damage" as const,
  summary: "A pipe burst under the kitchen sink and damaged the cabinet and floor.",
  classificationConfidence: 0.9,
  facts: [
    { key: "incident_cause", label: "What caused the incident", status: "collected", value: "A pipe burst.", source: "claimant_narrative" },
    { key: "damage_description", label: "What was damaged", status: "collected", value: "The kitchen cabinet and floor.", source: "claimant_narrative" },
    { key: "affected_property", label: "Affected property", status: "collected", value: "Kitchen cabinet and floor.", source: "claimant_narrative" },
    { key: "loss_timing", label: "When it happened", status: "collected", value: "This morning.", source: "claimant_narrative" },
    { key: "active_loss_or_safety", label: "Active loss or safety concern", status: "collected", value: "Resolved: the water is shut off.", source: "claimant_narrative" },
    { key: "injury_or_third_party", label: "Injury or third-party involvement", status: "not_applicable", source: "claimant_narrative" },
  ],
  missingFactKeys: [],
  proposedRoute: {
    kind: "property_adjuster_review" as const,
    rationale: "The narrative describes property damage from a burst pipe.",
    confidence: 0.85,
  },
};

const baseV2Terminal = {
  kind: "propose_route" as const,
  stopReason: "route_supported" as const,
  rationale: "A non-binding intake recommendation.",
};

function buildHandoff(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    caseState: baseCaseState,
    clarificationHistory: [],
    v2Terminal: baseV2Terminal,
    mockPolicyContext: {
      fixtureId: "water-standard-001",
      fixtureVersion: 1,
      policyContextStatus: "route_supported",
      rationale: "The claim matches a supported property-adjuster route.",
    },
    urgency: {
      level: "standard",
      evidenceFact: {
        key: "active_loss_or_safety",
        label: "Active loss or safety concern",
        status: "collected",
        value: "Resolved: the water is shut off.",
        source: "claimant_narrative",
      },
      rationale: "The claimant confirmed the water is shut off.",
    },
    finalDisposition: "property_adjuster_review",
    rationale: "This case is ready for property adjuster review.",
    ...overrides,
  };
}

const standardHandoff = buildHandoff();

const urgentHandoff = buildHandoff({
  v2Terminal: { kind: "escalate_to_human", stopReason: "safety_review", rationale: "An active safety concern was reported." },
  mockPolicyContext: {
    fixtureId: null,
    fixtureVersion: null,
    policyContextStatus: "no_mock_record",
    rationale: "No local mock-policy fixture matched this case.",
  },
  urgency: {
    level: "urgent",
    evidenceFact: {
      key: "active_loss_or_safety",
      label: "Active loss or safety concern",
      status: "collected",
      value: "Active: water is still leaking.",
      source: "claimant_narrative",
    },
    rationale: "The claimant reported an active, ongoing loss.",
  },
  finalDisposition: "human_review",
  rationale: "This case needs urgent human review because the loss may still be active.",
});

const humanReviewHandoff = buildHandoff({
  v2Terminal: { kind: "escalate_to_human", stopReason: "claimant_cannot_answer", rationale: "The claimant could not confirm a required detail." },
  mockPolicyContext: {
    fixtureId: null,
    fixtureVersion: null,
    policyContextStatus: "no_mock_record",
    rationale: "No local mock-policy fixture matched this case.",
  },
  urgency: {
    level: "human_review",
    evidenceFact: {
      key: "active_loss_or_safety",
      label: "Active loss or safety concern",
      status: "missing",
      source: "claimant_narrative",
    },
    rationale: "The safety detail could not be confirmed.",
  },
  finalDisposition: "human_review",
  rationale: "A person should review this case because a required detail is unresolved.",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockHandoffResponse(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

describe("CaseHandoffPanel", () => {
  it("renders nothing when disabled", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<CaseHandoffPanel sessionToken="token-disabled" enabled={false} />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a loading state while the handoff request is pending", async () => {
    let resolveRequest: (value: unknown) => void;
    const pendingResponse = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingResponse));

    render(<CaseHandoffPanel sessionToken="token-loading" enabled />);

    expect(await screen.findByRole("status")).toHaveTextContent("Preparing your next step…");
    resolveRequest!({ ok: true, json: async () => ({ handoff: standardHandoff }) });
    expect(await screen.findByRole("heading", { name: "Ready for property adjuster review" })).toBeInTheDocument();
  });

  it("renders a standard property-adjuster handoff", async () => {
    mockHandoffResponse({ handoff: standardHandoff });

    render(<CaseHandoffPanel sessionToken="token-standard" enabled />);

    expect(await screen.findByRole("heading", { name: "Ready for property adjuster review" })).toBeInTheDocument();
    expect(screen.getByText(standardHandoff.rationale)).toBeInTheDocument();
    expect(screen.getByText("Resolved: the water is shut off.")).toBeInTheDocument();
    expect(
      screen.getByText("This is preliminary operational guidance, not a coverage, fault, payment, or acceptance decision."),
    ).toBeInTheDocument();
  });

  it("renders an urgent human-review handoff", async () => {
    mockHandoffResponse({ handoff: urgentHandoff });

    render(<CaseHandoffPanel sessionToken="token-urgent" enabled />);

    expect(await screen.findByRole("heading", { name: "Urgent human review" })).toBeInTheDocument();
    expect(screen.getByText("Active: water is still leaking.")).toBeInTheDocument();
  });

  it("renders a standard human-review handoff", async () => {
    mockHandoffResponse({ handoff: humanReviewHandoff });

    render(<CaseHandoffPanel sessionToken="token-human-review" enabled />);

    expect(await screen.findByRole("heading", { name: "Human review recommended" })).toBeInTheDocument();
    expect(screen.getByText("No safety detail was confirmed.")).toBeInTheDocument();
  });

  it("does not display an ineligible handoff response", async () => {
    mockHandoffResponse({ error: "This case is not eligible for the water-damage handoff. A person can review it instead." }, 422);

    render(<CaseHandoffPanel sessionToken="token-malformed" enabled />);

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("This case is not eligible for the water-damage handoff. A person can review it instead.")).not.toBeInTheDocument();
  });

  it("shows a retryable error when the handoff request fails to reach the service", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", fetchMock);

    render(<CaseHandoffPanel sessionToken="token-network-failure" enabled />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "Try again" });

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ handoff: standardHandoff }) });
    await userEvent.setup().click(retryButton);

    expect(await screen.findByRole("heading", { name: "Ready for property adjuster review" })).toBeInTheDocument();
  });

  it("requests the handoff only once for the same session token even if it re-renders", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ handoff: standardHandoff }) });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<CaseHandoffPanel sessionToken="token-dedupe" enabled />);
    await screen.findByRole("heading", { name: "Ready for property adjuster review" });

    rerender(<CaseHandoffPanel sessionToken="token-dedupe" enabled />);
    rerender(<CaseHandoffPanel sessionToken="token-dedupe" enabled />);

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
