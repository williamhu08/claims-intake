import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClaimCategories } from "@/components/claim-categories";
import { claimTypeOptions } from "@/lib/claims/display";

describe("ClaimCategories", () => {
  it("renders every supported claim category", () => {
    render(<ClaimCategories />);

    for (const category of claimTypeOptions) {
      expect(screen.getByRole("heading", { name: category.label })).toBeInTheDocument();
      expect(screen.getByText(category.description)).toBeInTheDocument();
    }
  });

  it("uses the responsive two-column layout at the small-screen breakpoint", () => {
    render(<ClaimCategories />);

    expect(screen.getByRole("list", { name: "Possible claim categories" })).toHaveClass(
      "sm:grid-cols-2",
    );
  });
});
