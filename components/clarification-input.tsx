"use client";

import type { ChangeEvent } from "react";
import {
  getDaysInMonth,
  isIntegerCandidate,
  isMoneyCandidate,
  isPostalCodeCandidate,
  isValidCalendarDate,
  isValidCurrency,
  isValidDateTime,
  isValidMoney,
  isValidPercentage,
  isValidPhone,
  isValidPostalCode,
} from "@/lib/claims/answer-validation";

// The array is the source of truth; ClarificationAnswerType is derived from it
// so runtime code (e.g. the testing-mode answer-type showcase, which iterates
// every type) and the static type can never drift apart.
export const clarificationAnswerTypeValues = [
  "free_text", "money", "date", "yes_no", "single_choice", "multi_choice",
  "integer", "percentage", "phone", "email", "date_time", "postal_code",
  "address", "currency", "url",
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
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/[^\s]+$/i,
};

export function isClarificationAnswerValid(type: ClarificationAnswerType, value: string) {
  const trimmed = value.trim();
  if (type === "free_text" || type === "address") return trimmed.length > 0;
  if (type === "money") return isValidMoney(trimmed);
  if (type === "currency") return isValidCurrency(trimmed);
  if (type === "date") return isValidCalendarDate(trimmed);
  if (type === "yes_no") return trimmed === "yes" || trimmed === "no";
  if (type === "single_choice") return trimmed.length > 0;
  if (type === "multi_choice") return trimmed.split(",").filter(Boolean).length > 0;
  if (type === "date_time") return isValidDateTime(trimmed);
  if (type === "percentage") return isValidPercentage(trimmed);
  if (type === "phone") return isValidPhone(trimmed);
  if (type === "postal_code") return isValidPostalCode(trimmed);
  return patterns[type]?.test(trimmed) ?? false;
}

const MIN_LOSS_DATE_YEAR = 2000;
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

const selectClassName = "w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground disabled:opacity-60";

/**
 * Encodes a date_time answer as "YYYY-MM-DDTHH:MM:SS" with any not-yet-chosen
 * part left blank (e.g. "2024-05-" with an empty time, or "-01:30-05" once
 * time is picked before date). Mirrors parseDateParts/DateAnswerSelect's
 * approach: the value string is the single source of truth, so the existing
 * controlled value/onChange contract and answer reset between questions keep
 * working unchanged.
 */
function parseDateTimeParts(value: string): { year: string; month: string; day: string; hour: string; minute: string; second: string } {
  const [datePart = "", timePart = ""] = value.split("T");
  const [year = "", month = "", day = ""] = datePart.split("-");
  const [hour = "", minute = "", second = ""] = timePart.split(":");
  return { year, month, day, hour, minute, second };
}

function encodeDateTimeParts(parts: { year: string; month: string; day: string; hour: string; minute: string; second: string }): string {
  const { year, month, day, hour, minute, second } = parts;
  if (!year && !month && !day && !hour && !minute && !second) return "";
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Two independent controls sharing one encoded value: a calendar date
 * (year → month → day, cascading exactly like DateAnswerSelect) and a time
 * of day (hour, minute, and second text inputs constrained to two digits).
 * Values outside 00-23/00-59/00-59 remain visible in red and cannot validate.
 */
function DateTimeAnswerSelect({ value, onChange, disabled, describedBy }: Pick<Props, "value" | "onChange" | "disabled" | "describedBy">) {
  const currentYear = new Date().getFullYear();
  const { year, month, day, hour, minute, second } = parseDateTimeParts(value);

  // A previously-submitted "I don't know" answer is rendered as a literal
  // string (see intake-form.tsx) rather than an encoded date_time, so it
  // can't be decomposed into parts. Show it as plain read-only text instead
  // of six dropdowns with nothing meaningful to select.
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
  function handleDatePartChange(part: "year" | "month" | "day", nextRaw: string) {
    if (disabled) return;
    // Choosing a date part resets every date part after it, same as
    // DateAnswerSelect, but leaves the time part untouched since date and
    // time are independent of each other.
    const nextParts = { year, month, day, hour, minute, second };
    if (part === "year") {
      nextParts.year = nextRaw;
      nextParts.month = "";
      nextParts.day = "";
    } else if (part === "month") {
      nextParts.month = nextRaw;
      nextParts.day = "";
    } else {
      nextParts.day = nextRaw;
    }
    onChange(encodeDateTimeParts(nextParts));
  }

  function handleTimePartChange(part: "hour" | "minute" | "second", nextRaw: string, input: HTMLInputElement) {
    if (disabled || !/^\d{0,2}$/.test(nextRaw)) return;
    onChange(encodeDateTimeParts({ year, month, day, hour, minute, second, [part]: nextRaw }));
    if (nextRaw.length === 2) {
      const nextInput = input.parentElement?.querySelectorAll<HTMLInputElement>("input")[(["hour", "minute", "second"].indexOf(part) + 1)];
      nextInput?.focus();
    }
  }

  function dateSelectProps(part: "year" | "month" | "day", currentValue: string, prerequisiteMet: boolean) {
    return {
      "aria-label": `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
      value: currentValue,
      onChange: (event: ChangeEvent<HTMLSelectElement>) => handleDatePartChange(part, event.target.value),
      disabled: disabled || !prerequisiteMet,
      "aria-disabled": disabled || !prerequisiteMet,
      className: selectClassName,
    };
  }

  function timeInputProps(part: "hour" | "minute" | "second", currentValue: string, index: number) {
    const hasValue = currentValue.length > 0;
    const numericValue = Number(currentValue);
    const isInvalid = hasValue && (currentValue.length !== 2 || (part === "hour" ? numericValue > 23 : numericValue > 59));
    return {
      "aria-label": `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
      value: currentValue,
      onChange: (event: ChangeEvent<HTMLInputElement>) => handleTimePartChange(part, event.target.value, event.currentTarget),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Backspace" && currentValue === "") {
          event.currentTarget.parentElement?.querySelectorAll<HTMLInputElement>("input")[index - 1]?.focus();
        }
      },
      disabled,
      inputMode: "numeric" as const,
      maxLength: 2,
      "aria-invalid": isInvalid,
      "aria-describedby": describedBy,
      className: `w-12 rounded-lg border border-input bg-background px-2 py-3 text-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${isInvalid ? "border-destructive text-destructive focus:border-destructive" : ""}`,
      placeholder: part === "hour" ? "HH" : part === "minute" ? "MM" : "SS",
    };
  }

  return (
    <div aria-describedby={describedBy} className="mt-2 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <select {...dateSelectProps("year", year, true)}>
          <option value="" disabled={disabled && year !== ""}>Year</option>
          {yearOptions.map((option) => (
            <option key={option} value={option} disabled={disabled && year !== option}>
              {option}
            </option>
          ))}
        </select>
        <select {...dateSelectProps("month", month, year !== "")}>
          <option value="" disabled={disabled && month !== ""}>Month</option>
          {monthOptions.map((option, index) => (
            <option key={option} value={option} disabled={disabled && month !== option}>
              {option} · {MONTH_LABELS[index]}
            </option>
          ))}
        </select>
        <select {...dateSelectProps("day", day, year !== "" && month !== "")}>
          <option value="" disabled={disabled && day !== ""}>Day</option>
          {dayOptions.map((option) => (
            <option key={option} value={option} disabled={disabled && day !== option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div aria-label="Time" className="flex items-center gap-2">
        <span className="sr-only">Time in hours, minutes, and seconds</span>
        <input {...timeInputProps("hour", hour, 0)} />
        <span aria-hidden="true" className="text-lg text-muted-foreground">:</span>
        <input {...timeInputProps("minute", minute, 1)} />
        <span aria-hidden="true" className="text-lg text-muted-foreground">:</span>
        <input {...timeInputProps("second", second, 2)} />
      </div>
    </div>
  );
}

function PhoneAnswerInput({ value, onChange, disabled, describedBy }: Pick<Props, "value" | "onChange" | "disabled" | "describedBy">) {
  const phoneParts = value.match(/^\(?([0-9]{0,3})\)?-?([0-9]{0,3})-?([0-9]{0,4})$/);
  const areaCode = phoneParts?.[1] ?? "";
  const prefix = phoneParts?.[2] ?? "";
  const lineNumber = phoneParts?.[3] ?? "";
  const formattedAreaCode = value.startsWith("(") ? areaCode : areaCode;
  const isInvalid = value.length > 0 && !isValidPhone(value);
  const refs: Array<HTMLInputElement | null> = [];

  function updatePart(part: "area" | "prefix" | "line", next: string) {
    if (disabled || !/^\d{0,4}$/.test(next)) return;
    const nextArea = part === "area" ? next : areaCode;
    const nextPrefix = part === "prefix" ? next : prefix;
    const nextLine = part === "line" ? next : lineNumber;
    const nextValue = value.startsWith("(") ? `(${nextArea})-${nextPrefix}-${nextLine}` : `${nextArea}-${nextPrefix}-${nextLine}`;
    onChange(nextValue);
    if (next.length === (part === "line" ? 4 : 3)) {
      refs[{ area: 0, prefix: 1, line: 2 }[part] + 1]?.focus();
    }
  }

  const inputClass = (part: "area" | "prefix" | "line") => `w-${part === "line" ? "16" : "12"} rounded-lg border bg-background px-2 py-3 text-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring ${isInvalid ? "border-destructive text-destructive" : "border-input"}`;
  const inputProps = (part: "area" | "prefix" | "line", current: string, maxLength: number, index: number) => ({
    ref: (element: HTMLInputElement | null) => { refs[index] = element; },
    value: current,
    maxLength,
    inputMode: "numeric" as const,
    placeholder: part === "area" ? "123" : part === "prefix" ? "456" : "7890",
    disabled,
    "aria-invalid": isInvalid,
    "aria-describedby": describedBy,
    "aria-label": part === "area" ? "Area code" : part === "prefix" ? "Phone prefix" : "Line number",
    className: inputClass(part),
    onChange: (event: ChangeEvent<HTMLInputElement>) => updatePart(part, event.target.value),
  });

  return (
    <div aria-label="Phone number" className="mt-2 flex items-center gap-1">
      <span aria-hidden="true" className="text-lg text-muted-foreground">(</span>
      <input {...inputProps("area", formattedAreaCode, 3, 0)} />
      <span aria-hidden="true" className="text-lg text-muted-foreground">)</span>
      <span aria-hidden="true" className="text-lg text-muted-foreground">-</span>
      <input {...inputProps("prefix", prefix, 3, 1)} />
      <span aria-hidden="true" className="text-lg text-muted-foreground">-</span>
      <input {...inputProps("line", lineNumber, 4, 2)} />
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
  if (answerType === "date_time") {
    return <DateTimeAnswerSelect value={value} onChange={onChange} disabled={disabled} describedBy={describedBy} />;
  }
  if (answerType === "phone") {
    return <PhoneAnswerInput value={value} onChange={onChange} disabled={disabled} describedBy={describedBy} />;
  }
  const inputType = answerType === "email" ? "email" : answerType === "url" ? "url" : answerType === "address" || answerType === "free_text" ? "text" : "text";
  const inputMode: "numeric" | "text" = ["money", "currency", "integer", "percentage", "postal_code"].includes(answerType) ? "numeric" : "text";
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = event.target.value;
    // Filtered at the keystroke level (rather than only flagged invalid
    // afterward) so a non-numeric character, or a 6th postal-code digit,
    // never lands in the field in the first place.
    if (answerType === "money" || answerType === "currency") { if (!isMoneyCandidate(next)) return; }
    if (answerType === "integer") { if (!isIntegerCandidate(next)) return; }
    if (answerType === "postal_code") { if (!isPostalCodeCandidate(next)) return; }
    onChange(next);
  }
  const common = { value, onChange: handleChange, disabled, inputMode, "aria-describedby": describedBy, "aria-invalid": value.length > 0 && !isClarificationAnswerValid(answerType, value), className: "mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" };
  if (answerType === "free_text" || answerType === "address") return <textarea {...common} rows={answerType === "address" ? 3 : 2} placeholder={answerType === "address" ? "Enter the address" : "Type your answer"} />;
  return <input {...common} type={inputType} placeholder={answerType === "money" || answerType === "currency" ? "0.00" : undefined} />;
}
