"use client";

import type { ChangeEvent } from "react";
import {
  isDateCandidate,
  isMoneyCandidate,
  isValidCalendarDate,
  isValidMoney,
} from "@/lib/claims/answer-validation";

export type ClarificationAnswerType =
  | "free_text" | "money" | "date" | "yes_no" | "single_choice" | "multi_choice"
  | "integer" | "percentage" | "phone" | "email" | "date_time" | "postal_code"
  | "address" | "currency" | "duration" | "url";

type Option = { value: string; label: string };
interface Props {
  answerType: ClarificationAnswerType;
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
  disabled?: boolean;
  describedBy?: string;
}

const patterns: Partial<Record<ClarificationAnswerType, RegExp>> = {
  integer: /^\d+$/,
  percentage: /^(?:100|\d{1,2})(?:\.\d{1,2})?$/,
  phone: /^[+\d][\d ()-]{6,24}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  postal_code: /^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/,
  url: /^https?:\/\/[^\s]+$/i,
  duration: /^\d+\s*(?:minutes?|hours?|days?|weeks?|months?)$/i,
};

export function isClarificationAnswerValid(type: ClarificationAnswerType, value: string) {
  const trimmed = value.trim();
  if (type === "free_text" || type === "address") return trimmed.length > 0;
  if (type === "money" || type === "currency") return isValidMoney(trimmed);
  if (type === "date") return isValidCalendarDate(trimmed);
  if (type === "yes_no") return trimmed === "yes" || trimmed === "no";
  if (type === "single_choice") return trimmed.length > 0;
  if (type === "multi_choice") return trimmed.split(",").filter(Boolean).length > 0;
  if (type === "date_time") return !Number.isNaN(Date.parse(trimmed));
  return patterns[type]?.test(trimmed) ?? false;
}

export function ClarificationInput({ answerType, value, onChange, options = [], disabled, describedBy }: Props) {
  if (answerType === "yes_no") {
    return <select aria-label="Your answer" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-describedby={describedBy} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground"><option value="">Select an answer</option><option value="yes">Yes</option><option value="no">No</option></select>;
  }
  if (answerType === "single_choice") {
    return <select aria-label="Your answer" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-describedby={describedBy} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground"><option value="">Select an option</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  }
  if (answerType === "multi_choice") {
    const selected = new Set(value ? value.split(",") : []);
    return <fieldset className="mt-2 flex flex-col gap-3" aria-describedby={describedBy}><legend className="sr-only">Select one or more options</legend>{options.map((option) => <label key={option.value} className="flex items-center gap-2 text-foreground"><input type="checkbox" checked={selected.has(option.value)} disabled={disabled} onChange={(e) => { const next = new Set(selected); if (e.target.checked) { next.add(option.value); } else { next.delete(option.value); } onChange([...next].join(",")); }} />{option.label}</label>)}</fieldset>;
  }
  const inputType = answerType === "email" ? "email" : answerType === "url" ? "url" : answerType === "date_time" ? "datetime-local" : answerType === "address" || answerType === "free_text" ? "text" : "text";
  const inputMode: "numeric" | "text" = ["money", "currency", "integer", "percentage", "date", "postal_code"].includes(answerType) ? "numeric" : "text";
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = event.target.value;
    if (answerType === "money" || answerType === "currency") { if (!isMoneyCandidate(next)) return; }
    if (answerType === "date" && !isDateCandidate(next)) return;
    onChange(next);
  }
  const common = { value, onChange: handleChange, disabled, inputMode, "aria-describedby": describedBy, "aria-invalid": value.length > 0 && !isClarificationAnswerValid(answerType, value), className: "mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" };
  if (answerType === "free_text" || answerType === "address") return <textarea {...common} rows={answerType === "address" ? 3 : 2} placeholder={answerType === "address" ? "Enter the address" : "Type your answer"} />;
  return <input {...common} type={inputType} placeholder={answerType === "date" ? "YYYY-MM-DD" : answerType === "money" || answerType === "currency" ? "0.00" : undefined} />;
}
