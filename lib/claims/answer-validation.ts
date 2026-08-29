const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{0,2})?$/;

/**
 * Number of days in a given month (1-12) of a given calendar year, leap-year
 * aware for February. Shared by the date-of-loss dropdowns (to build the "day"
 * option list) and isValidCalendarDate (to validate a full YYYY-MM-DD string).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;

  return day <= getDaysInMonth(year, month);
}

export function isValidMoney(value: string): boolean {
  return MONEY_PATTERN.test(value) && Number.isFinite(Number(value));
}

export function isMoneyCandidate(value: string): boolean {
  return value === "" || MONEY_PATTERN.test(value);
}

export function isValidClarificationAnswer(type: string, value: string, options?: Array<{ value: string }>): boolean {
  const trimmed = value.trim();
  if (type === "free_text" || type === "address") return trimmed.length > 0;
  if (type === "money" || type === "currency") return isValidMoney(trimmed);
  if (type === "date") return isValidCalendarDate(trimmed);
  if (type === "yes_no") return trimmed === "yes" || trimmed === "no";
  if (type === "single_choice") return options?.some((option) => option.value === trimmed) ?? false;
  if (type === "multi_choice") {
    const values = trimmed.split(",").filter(Boolean);
    return values.length > 0 && new Set(values).size === values.length && values.every((value) => options?.some((option) => option.value === value));
  }
  if (type === "date_time") return !Number.isNaN(Date.parse(trimmed));
  if (type === "integer") return /^\d+$/.test(trimmed);
  if (type === "percentage") return /^(?:100|\d{1,2})(?:\.\d{1,2})?$/.test(trimmed) && Number(trimmed) <= 100;
  if (type === "phone") return /^[+\d][\d ()-]{6,24}$/.test(trimmed);
  if (type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  if (type === "postal_code") return /^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(trimmed);
  if (type === "url") return /^https?:\/\/[^\s]+$/i.test(trimmed);
  if (type === "duration") return /^\d+\s*(?:minutes?|hours?|days?|weeks?|months?)$/i.test(trimmed);
  return false;
}

export function isDateCandidate(value: string): boolean {
  if (value.length > 10) return false;
  if (value.includes("-") && !/^\d{4}(?:-[0-9]{1,2}(?:-[0-9]{1,2})?)?$/.test(value)) return false;
  if (!/^\d{0,4}(?:-\d{0,2}(?:-\d{0,2})?)?$/.test(value)) return false;

  const parts = value.split("-");
  if (parts[0]?.length === 4 && Number(parts[0]) < 1) return false;
  if (parts[1]?.length === 2 && (Number(parts[1]) < 1 || Number(parts[1]) > 12)) return false;
  if (parts[2]?.length === 2 && (Number(parts[2]) < 1 || Number(parts[2]) > 31)) return false;
  return true;
}
