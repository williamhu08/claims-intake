/** Clearway version scope: V0. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClaimCategories } from "@/components/claim-categories";
import { claimTypeOptions } from "@/lib/claims/display";

describe("ClaimCategories", () => {
  it("shows every supported claim category as a card", () => {
    render(<ClaimCategories />);
    expect(screen.getByRole("list", { name: "Supported claim categories" })).toBeInTheDocument();

    for (const category of claimTypeOptions) {
      expect(screen.getByRole("heading", { name: category.label })).toBeInTheDocument();
      expect(screen.getByText(category.description)).toBeInTheDocument();
    }
  });

  it("keeps each category in its own list item", () => {
    render(<ClaimCategories />);
    expect(screen.getAllByRole("listitem")).toHaveLength(claimTypeOptions.length);
  });
});
