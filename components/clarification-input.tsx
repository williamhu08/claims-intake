"use client";

import type { ChangeEvent } from "react";
import {
  isDateCandidate,
  isMoneyCandidate,
  isValidCalendarDate,
  isValidMoney,
} from "@/lib/claims/answer-validation";

export type ClarificationAnswerType = "free_text" | "money" | "date";

interface ClarificationInputProps {
  answerType: ClarificationAnswerType;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  describedBy?: string;
}

export function isClarificationAnswerValid(answerType: ClarificationAnswerType, value: string) {
  if (answerType === "free_text") return value.trim().length > 0;
  if (answerType === "money") return isValidMoney(value);
  return isValidCalendarDate(value);
}

export function ClarificationInput({
  answerType,
  value,
  onChange,
  disabled,
  describedBy,
}: ClarificationInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    if (answerType === "money" && !isMoneyCandidate(nextValue)) return;
    if (answerType === "date" && !isDateCandidate(nextValue)) return;
    onChange(nextValue);
  }

  return (
    <input
      id="clarification-answer"
      value={value}
      onChange={handleChange}
      inputMode={answerType === "money" || answerType === "date" ? "numeric" : "text"}
      placeholder={answerType === "date" ? "YYYY-MM-DD" : answerType === "money" ? "0.00" : "Type your answer"}
      aria-describedby={describedBy}
      aria-invalid={value.length > 0 && !isClarificationAnswerValid(answerType, value)}
      disabled={disabled}
      className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
