/** Clearway version scope: V0. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClaimCategories } from "@/components/claim-categories";
import { claimTypeOptions } from "@/lib/claims/display";

describe("ClaimCategories", () => {
  it("shows every supported claim category in a table", () => {
    render(<ClaimCategories />);
    expect(screen.getByRole("table", { name: "Supported claim categories" })).toBeInTheDocument();

    for (const category of claimTypeOptions) {
      expect(screen.getByRole("rowheader", { name: category.label })).toBeInTheDocument();
      expect(screen.getByText(category.description)).toBeInTheDocument();
    }
  });

  it("renders accessible table columns", () => {
    render(<ClaimCategories />);
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "What it covers" })).toBeInTheDocument();
  });
});
