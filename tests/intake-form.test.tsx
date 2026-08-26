import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntakeForm } from "@/components/intake-form";
import { claimTypeOptions } from "@/lib/claims/display";

const validNarrative = "A pipe burst under the kitchen sink and damaged the cabinet and floor.";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockJsonResponse(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      json: async () => body,
    }),
  );
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
    mockJsonResponse({ claimType: "not_a_claim_type", summary: "", confidence: 4 });

    render(<IntakeForm />);
    await submitNarrative();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We received an incomplete assessment. Please try again.",
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
      "We received an unreadable response. Please try again.",
    );
  });

  it("shows a safe error when the request cannot reach the service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    render(<IntakeForm />);
    await submitNarrative();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't reach the assessment service. Check your connection and try again.",
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
      json: async () => ({
        claimType: "water_damage",
        summary: "Mocked water assessment.",
        confidence: 0.9,
      }),
    });

    expect(await screen.findByRole("heading", { name: "Water damage" })).toBeInTheDocument();
  });
});
