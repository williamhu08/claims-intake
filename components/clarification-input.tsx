"use client";

import type { ChangeEvent } from "react";
import {
  getDaysInMonth,
  isMoneyCandidate,
  isValidCalendarDate,
  isValidMoney,
} from "@/lib/claims/answer-validation";

// The array is the source of truth; ClarificationAnswerType is derived from it
// so runtime code (e.g. the testing-mode answer-type showcase, which iterates
// every type) and the static type can never drift apart.
export const clarificationAnswerTypeValues = [
  "free_text", "money", "date", "yes_no", "single_choice", "multi_choice",
  "integer", "percentage", "phone", "email", "date_time", "postal_code",
  "address", "currency", "duration", "url",
] as const;
export type ClarificationAnswerType = (typeof clarificationAnswerTypeValues)[number];

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

const MIN_LOSS_DATE_YEAR = 2000;
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Encodes a date-of-loss answer as "YYYY-MM-DD" with any not-yet-chosen part
 * left blank (e.g. "2024--" for year-only, "2024-05-" for year+month). This
 * reuses the plain "date" answer's value prop as the single source of truth —
 * no separate component state — so the existing controlled value/onChange
 * contract, the "date" validity check (isValidCalendarDate, which only
 * matches a fully-populated YYYY-MM-DD), and the parent's answer reset
 * between questions all keep working unchanged.
 */
function parseDateParts(value: string): { year: string; month: string; day: string } {
  const [year = "", month = "", day = ""] = value.split("-");
  return { year, month, day };
}

function DateAnswerSelect({ value, onChange, disabled, describedBy }: Pick<Props, "value" | "onChange" | "disabled" | "describedBy">) {
  const currentYear = new Date().getFullYear();
  const { year, month, day } = parseDateParts(value);

  // A previously-submitted "I don't know" answer is rendered as this literal
  // string (see intake-form.tsx) rather than a real date, so it can't be
  // decomposed into year/month/day. Show it as plain read-only text instead
  // of three dropdowns with nothing meaningful to select.
  if (disabled && value && !year.match(/^\d{4}$/)) {
    return (
      <p aria-describedby={describedBy} className="mt-2 rounded-lg border border-input bg-muted/40 px-3 py-3 text-foreground">
        {value}
      </p>
    );
  }

  const yearOptions = Array.from({ length: currentYear - MIN_LOSS_DATE_YEAR + 1 }, (_, index) => String(currentYear - index));
  const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
  const dayCount = year && month ? getDaysInMonth(Number(year), Number(month)) : 31;
  const dayOptions = Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, "0"));

  function handlePartChange(part: "year" | "month" | "day", nextRaw: string) {
    if (disabled) return;
    // Choosing a part resets every part after it: a new year invalidates the
    // previously-selected month and day (the day count may differ, e.g. Feb
    // 29 no longer applies), and a new month invalidates the previously
    // selected day for the same reason.
    if (part === "year") onChange(nextRaw ? `${nextRaw}--` : "");
    else if (part === "month") onChange(nextRaw ? `${year}-${nextRaw}-` : `${year}--`);
    else onChange(nextRaw ? `${year}-${month}-${nextRaw}` : `${year}-${month}-`);
  }

  function selectProps(part: "year" | "month" | "day", currentValue: string, prerequisiteMet: boolean) {
    return {
      "aria-label": `${part.charAt(0).toUpperCase()}${part.slice(1)} of loss`,
      value: currentValue,
      onChange: (event: ChangeEvent<HTMLSelectElement>) => handlePartChange(part, event.target.value),
      disabled: disabled || !prerequisiteMet,
      "aria-disabled": disabled || !prerequisiteMet,
      className:
        "w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground disabled:opacity-60",
    };
  }

  return (
    <div aria-describedby={describedBy} className="mt-2 grid grid-cols-3 gap-3">
      <select {...selectProps("year", year, true)}>
        <option value="" disabled={disabled && year !== ""}>Year</option>
        {yearOptions.map((option) => (
          <option key={option} value={option} disabled={disabled && year !== option}>
            {option}
          </option>
        ))}
      </select>
      <select {...selectProps("month", month, year !== "")}>
        <option value="" disabled={disabled && month !== ""}>Month</option>
        {monthOptions.map((option, index) => (
          <option key={option} value={option} disabled={disabled && month !== option}>
            {option} · {MONTH_LABELS[index]}
          </option>
        ))}
      </select>
      <select {...selectProps("day", day, year !== "" && month !== "")}>
        <option value="" disabled={disabled && day !== ""}>Day</option>
        {dayOptions.map((option) => (
          <option key={option} value={option} disabled={disabled && day !== option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ClarificationInput({ answerType, value, onChange, options = [], disabled, describedBy }: Props) {
  const readOnlySelectProps = {
    "aria-disabled": disabled,
    "aria-describedby": describedBy,
    className: "mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground disabled:opacity-60",
  };
  const handleSelectChange = (nextValue: string) => {
    if (!disabled) onChange(nextValue);
  };

  if (answerType === "date") {
    return <DateAnswerSelect value={value} onChange={onChange} disabled={disabled} describedBy={describedBy} />;
  }
  if (answerType === "yes_no") {
    return (
      <select
        aria-label="Your answer"
        value={value}
        onChange={(event) => handleSelectChange(event.target.value)}
        {...readOnlySelectProps}
      >
        <option value="" disabled={disabled && value !== ""}>Select an answer</option>
        <option value="yes" disabled={disabled && value !== "yes"}>Yes</option>
        <option value="no" disabled={disabled && value !== "no"}>No</option>
      </select>
    );
  }
  if (answerType === "single_choice") {
    return (
      <select
        aria-label="Your answer"
        value={value}
        onChange={(event) => handleSelectChange(event.target.value)}
        {...readOnlySelectProps}
      >
        <option value="" disabled={disabled && value !== ""}>Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={disabled && value !== option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (answerType === "multi_choice") {
    const selected = new Set(value ? value.split(",") : []);
    return <fieldset className="mt-2 flex flex-col gap-3" aria-describedby={describedBy}><legend className="sr-only">Select one or more options</legend>{options.map((option) => <label key={option.value} className="flex items-center gap-2 text-foreground"><input type="checkbox" checked={selected.has(option.value)} disabled={disabled} onChange={(e) => { const next = new Set(selected); if (e.target.checked) { next.add(option.value); } else { next.delete(option.value); } onChange([...next].join(",")); }} />{option.label}</label>)}</fieldset>;
  }
  const inputType = answerType === "email" ? "email" : answerType === "url" ? "url" : answerType === "date_time" ? "datetime-local" : answerType === "address" || answerType === "free_text" ? "text" : "text";
  const inputMode: "numeric" | "text" = ["money", "currency", "integer", "percentage", "postal_code"].includes(answerType) ? "numeric" : "text";
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = event.target.value;
    if (answerType === "money" || answerType === "currency") { if (!isMoneyCandidate(next)) return; }
    onChange(next);
  }
  const common = { value, onChange: handleChange, disabled, inputMode, "aria-describedby": describedBy, "aria-invalid": value.length > 0 && !isClarificationAnswerValid(answerType, value), className: "mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" };
  if (answerType === "free_text" || answerType === "address") return <textarea {...common} rows={answerType === "address" ? 3 : 2} placeholder={answerType === "address" ? "Enter the address" : "Type your answer"} />;
  return <input {...common} type={inputType} placeholder={answerType === "money" || answerType === "currency" ? "0.00" : undefined} />;
}
