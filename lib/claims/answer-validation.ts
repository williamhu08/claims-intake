const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{0,2})?$/;
// Integer part of a percentage: "0", "100", or 1-99 with no leading zero
// ("07" is rejected, "7" is accepted).
const PERCENTAGE_INTEGER_PART = /^(?:0|100|[1-9]\d?)$/;
const PERCENTAGE_PATTERN = /^(\d+)(?:\.(\d+))?$/;
const POSTAL_CODE_PATTERN = /^\d{5}$/;

/**
 * Percentage validity: an integer part of 0-100 (no leading zeros, e.g. "07"
 * is rejected) with an optional decimal part of any number of digits — except
 * when the integer part is exactly 100, in which case every decimal digit
 * must be 0 (100.00 is valid, 100.5 is not, since values over 100% aren't a
 * valid percentage).
 */
export function isValidPercentage(value: string): boolean {
  const match = PERCENTAGE_PATTERN.exec(value);
  if (!match) return false;

  const [, integerPart, decimalPart] = match;
  if (!PERCENTAGE_INTEGER_PART.test(integerPart)) return false;
  if (integerPart === "100" && decimalPart && /[1-9]/.test(decimalPart)) return false;

  return true;
}

/**
 * A postal code is exactly 5 digits, "00000" through "99999". The input only
 * ever lets digits be typed and stops accepting keystrokes once 5 digits are
 * reached (see isPostalCodeCandidate), so this mirrors that same constraint
 * for the final validity check.
 */
export function isValidPostalCode(value: string): boolean {
  return POSTAL_CODE_PATTERN.test(value);
}

/**
 * Keystroke-level filter for the postal code field: only digits, and only up
 * to 5 of them. Used in the input's onChange to reject non-numeric characters
 * and any digit typed past the 5th, rather than allowing them to be typed and
 * then flagged invalid afterward.
 */
export function isPostalCodeCandidate(value: string): boolean {
  return /^\d{0,5}$/.test(value);
}

/**
 * Keystroke-level filter for the integer field: only digits are ever
 * accepted, so a letter or symbol never lands in the field in the first
 * place (rather than being typed and then flagged invalid).
 */
export function isIntegerCandidate(value: string): boolean {
  return /^(?:|0|[1-9]\d*)$/.test(value);
}

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

const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/**
 * A date_time answer is a calendar date plus an hour/minute/second, each
 * chosen from its own dropdown (see DateTimeAnswerSelect), encoded as
 * "YYYY-MM-DDTHH:MM:SS". Valid only once every one of the six parts has been
 * chosen and the date and time portions are each in range — mirrors
 * isValidCalendarDate's strictness rather than the looser Date.parse, since
 * the dropdown UI can only ever produce this exact shape.
 */
export function isValidDateTime(value: string): boolean {
  const match = DATE_TIME_PATTERN.exec(value);
  if (!match) return false;

  const [, year, month, day, hour, minute, second] = match;
  if (!isValidCalendarDate(`${year}-${month}-${day}`)) return false;

  return Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59;
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
  if (type === "date_time") return isValidDateTime(trimmed);
  if (type === "integer") return /^(?:0|[1-9]\d*)$/.test(trimmed);
  if (type === "percentage") return isValidPercentage(trimmed);
  if (type === "phone") return /^[+\d][\d ()-]{6,24}$/.test(trimmed);
  if (type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  if (type === "postal_code") return isValidPostalCode(trimmed);
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
