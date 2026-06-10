const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR');

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function makeLocalDate(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day);
  date.setHours(0, 0, 0, 0);
  return isValidDate(date) ? date : null;
}

function parseExcelSerial(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) {
    return null;
  }

  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const date = new Date(utcValue);
  return makeLocalDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function parseDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return makeLocalDate(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'number') {
    return parseExcelSerial(value);
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    return parseExcelSerial(Number(text));
  }

  const datePart = text.split(/[T\s]/)[0];
  const brMatch = datePart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (brMatch) {
    const [, dayText, monthText, yearText] = brMatch;
    const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const date = makeLocalDate(year, month, day);
    if (date && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  }

  const isoMatch = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    const year = Number(yearText);
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const date = makeLocalDate(year, month, day);
    if (date && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  }

  const fallback = new Date(text);
  return isValidDate(fallback)
    ? makeLocalDate(fallback.getFullYear(), fallback.getMonth(), fallback.getDate())
    : null;
}

export function getMonthKey(date) {
  if (!isValidDate(date)) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function parseMonthKey(monthKey) {
  const [yearText, monthText] = String(monthKey || '').split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null;
  }
  return makeLocalDate(year, month - 1, 1);
}

export function formatMonth(monthKey) {
  const date = parseMonthKey(monthKey);
  if (!date) {
    return 'Não informado';
  }

  const label = MONTH_LABEL_FORMATTER.format(
    new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDateBR(date) {
  return isValidDate(date) ? DATE_LABEL_FORMATTER.format(date) : 'Não informado';
}

export function addMonths(monthKey, offset) {
  const date = parseMonthKey(monthKey);
  if (!date) {
    return '';
  }

  return getMonthKey(makeLocalDate(date.getFullYear(), date.getMonth() + offset, 1));
}

export function daysBetween(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return null;
  }

  const start = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((end - start) / 86400000);
}

export function listMonthRange(startMonth, endMonth) {
  const start = parseMonthKey(startMonth);
  const end = parseMonthKey(endMonth);
  if (!start || !end || start > end) {
    return [];
  }

  const months = [];
  let current = getMonthKey(start);
  while (current <= endMonth) {
    months.push(current);
    current = addMonths(current, 1);
  }
  return months;
}
