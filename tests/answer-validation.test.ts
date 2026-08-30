/** Clearway version scope: V2. */
import { describe, expect, it } from "vitest";

import {
  isDateCandidate,
  isMoneyCandidate,
  isValidCalendarDate,
  isValidMoney,
} from "@/lib/claims/answer-validation";

describe("clarification answer validation", () => {
  it("accepts existing calendar dates and rejects impossible dates", () => {
    expect(isValidCalendarDate("2024-02-29")).toBe(true);
    expect(isValidCalendarDate("2025-08-52")).toBe(false);
    expect(isValidCalendarDate("0234-52-13")).toBe(false);
  });

  it("accepts money with up to two decimal places", () => {
    expect(isValidMoney("2100.35")).toBe(true);
    expect(isValidMoney("200.35.0")).toBe(false);
    expect(isMoneyCandidate(".200.35")).toBe(false);
  });

  it("filters malformed date candidates", () => {
    expect(isDateCandidate("2025-08-5")).toBe(true);
    expect(isDateCandidate("2025-08-31")).toBe(true);
    expect(isDateCandidate("2025-08-52")).toBe(false);
    expect(isDateCandidate("2025--08")).toBe(false);
    expect(isDateCandidate("2025-0a-02")).toBe(false);
  });
});
