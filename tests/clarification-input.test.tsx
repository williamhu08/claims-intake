import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ClarificationInput } from "@/components/clarification-input";

function ControlledDateInput({ initial = "", disabled = false }: { initial?: string; disabled?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <ClarificationInput
      answerType="date"
      value={value}
      onChange={setValue}
      disabled={disabled}
      describedBy="hint"
    />
  );
}

describe("ClarificationInput date-of-loss selects", () => {
  it("renders three cascading dropdowns with month and day disabled until their prerequisite is chosen", () => {
    render(<ControlledDateInput />);
    expect(screen.getByRole("combobox", { name: "Year of loss" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Month of loss" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toBeDisabled();
  });

  it("offers years descending from the current year to 2000", () => {
    render(<ControlledDateInput />);
    const yearSelect = screen.getByRole("combobox", { name: "Year of loss" });
    const years = Array.from(yearSelect.querySelectorAll("option"))
      .map((option) => option.value)
      .filter(Boolean);
    const currentYear = new Date().getFullYear();
    expect(years[0]).toBe(String(currentYear));
    expect(years[years.length - 1]).toBe("2000");
    expect(years).toEqual([...years].sort((a, b) => Number(b) - Number(a)));
  });

  it("enables month after year is chosen, and enables day after month is chosen", async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Year of loss" }), "2024");
    expect(screen.getByRole("combobox", { name: "Month of loss" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "Month of loss" }), "03");
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toBeEnabled();
  });

  it("resets month and day when the year changes", async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Year of loss" }), "2024");
    await user.selectOptions(screen.getByRole("combobox", { name: "Month of loss" }), "03");
    await user.selectOptions(screen.getByRole("combobox", { name: "Day of loss" }), "15");
    expect(screen.getByRole("combobox", { name: "Month of loss" })).toHaveValue("03");
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toHaveValue("15");

    await user.selectOptions(screen.getByRole("combobox", { name: "Year of loss" }), "2023");
    expect(screen.getByRole("combobox", { name: "Month of loss" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toBeDisabled();
  });

  it("resets only day when the month changes", async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Year of loss" }), "2024");
    await user.selectOptions(screen.getByRole("combobox", { name: "Month of loss" }), "03");
    await user.selectOptions(screen.getByRole("combobox", { name: "Day of loss" }), "15");

    await user.selectOptions(screen.getByRole("combobox", { name: "Month of loss" }), "04");
    expect(screen.getByRole("combobox", { name: "Year of loss" })).toHaveValue("2024");
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toHaveValue("");
  });

  it("offers 29 days in February of a leap year and 28 in a non-leap year", async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Year of loss" }), "2024");
    await user.selectOptions(screen.getByRole("combobox", { name: "Month of loss" }), "02");
    const leapDayOptions = screen.getByRole("combobox", { name: "Day of loss" }).querySelectorAll("option");
    expect(leapDayOptions.length).toBe(30); // 29 real days + the blank placeholder
    expect(leapDayOptions[leapDayOptions.length - 1]).toHaveValue("29");
  });

  it("does not report a complete date until year, month, and day are all chosen", async () => {
    const user = userEvent.setup();
    render(<ControlledDateInput />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Year of loss" }), "2024");
    await user.selectOptions(screen.getByRole("combobox", { name: "Month of loss" }), "02");
    await user.selectOptions(screen.getByRole("combobox", { name: "Day of loss" }), "29");
    expect(screen.getByRole("combobox", { name: "Year of loss" })).toHaveValue("2024");
    expect(screen.getByRole("combobox", { name: "Month of loss" })).toHaveValue("02");
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toHaveValue("29");
  });

  it("renders a disabled, greyed-out set of selects for a previously answered full date", () => {
    render(<ControlledDateInput initial="2024-02-29" disabled />);
    expect(screen.getByRole("combobox", { name: "Year of loss" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Year of loss" })).toHaveValue("2024");
    expect(screen.getByRole("combobox", { name: "Month of loss" })).toHaveValue("02");
    expect(screen.getByRole("combobox", { name: "Day of loss" })).toHaveValue("29");
  });

  it("renders a plain read-only line instead of dropdowns for a declined ('I don't know') answer", () => {
    render(<ControlledDateInput initial="I don't know" disabled />);
    expect(screen.queryByRole("combobox", { name: "Year of loss" })).not.toBeInTheDocument();
    expect(screen.getByText("I don't know")).toBeInTheDocument();
  });
});
