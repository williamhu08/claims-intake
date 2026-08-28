const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{0,2})?$/;

export function isValidCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

export function isValidMoney(value: string): boolean {
  return MONEY_PATTERN.test(value) && Number.isFinite(Number(value));
}

export function isMoneyCandidate(value: string): boolean {
  return value === "" || MONEY_PATTERN.test(value);
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
