import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ClaimCategories } from "@/components/claim-categories";
import { claimTypeOptions } from "@/lib/claims/display";

describe("ClaimCategories", () => {
  it("reveals every supported claim category when expanded", async () => {
    render(<ClaimCategories />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /supported claim categories/i }));

    for (const category of claimTypeOptions) {
      expect(screen.getByRole("heading", { name: category.label })).toBeInTheDocument();
      expect(screen.getByText(category.description)).toBeInTheDocument();
    }
  });

  it("uses the responsive two-column layout at the small-screen breakpoint", async () => {
    render(<ClaimCategories />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /supported claim categories/i }));

    expect(screen.getByRole("list", { name: "Possible claim categories" })).toHaveClass(
      "sm:grid-cols-2",
    );
  });
});
