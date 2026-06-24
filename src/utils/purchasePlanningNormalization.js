import { BOBBIN_CONFIGS, parseNumber } from './calculations';
import { parseDate } from './dateUtils';
import { normalizeText } from './normalization';

const MONTH_NUMBERS = {
  jan: '01',
  janeiro: '01',
  fev: '02',
  fevereiro: '02',
  mar: '03',
  marco: '03',
  abr: '04',
  abril: '04',
  mai: '05',
  maio: '05',
  jun: '06',
  junho: '06',
  jul: '07',
  julho: '07',
  ago: '08',
  agosto: '08',
  set: '09',
  setembro: '09',
  out: '10',
  outubro: '10',
  nov: '11',
  novembro: '11',
  dez: '12',
  dezembro: '12',
};

const ANNUAL_ALIASES = {
  year: ['ano'],
  boxes16: ['total cx 16m', 'total caixas 16m'],
  value16: ['valor 16m'],
  boxes30: ['total cx 30m', 'total caixas 30m'],
  value30: ['valor 30m'],
  totalBoxes: ['total caixas'],
  transactions: ['total transacoes'],
  totalValue: ['total valor'],
};

const MONTHLY_ALIASES = {
  purchaseMonth: ['mes compra'],
  consumptionMonth: ['mes de consumo', 'mes consumo'],
  transactions: ['trans mes compra', 'transacoes mes compra'],
  units16: ['unidades 16m'],
  boxes16: ['caixa 16m', 'caixas 16m'],
  value16: ['valor 16m'],
  units30: ['unidades 30m'],
  boxes30: ['caixa 30m', 'caixas 30m'],
  value30: ['valor 30m'],
  totalUnits: ['total 16 m e 30m', 'total 16m e 30m'],
  totalBoxes: ['total caixas'],
  totalValue: ['total valor'],
  consumption: ['consumo'],
  balance: ['saldo'],
  orderDate: ['data pedido'],
  deliveryDate: ['data entrega prevista'],
};

function safeNumber(value) {
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toColumnKey(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function normalizedEntries(row) {
  return Object.entries(row || {}).map(([key, value]) => ({
    key,
    normalizedKey: toColumnKey(key),
    value,
  }));
}

function readAnnualValue(row, aliases) {
  const aliasSet = new Set(aliases.map(toColumnKey));
  return normalizedEntries(row).find((entry) => aliasSet.has(entry.normalizedKey))?.value ?? '';
}

function buildMonthlyColumnMap(headerRow) {
  return Object.entries(headerRow || {}).reduce((map, [key, label]) => {
    const normalizedLabel = toColumnKey(label);
    if (normalizedLabel) {
      map.set(normalizedLabel, key);
    }
    return map;
  }, new Map());
}

function readMonthlyValue(row, columnMap, aliases) {
  for (const alias of aliases) {
    const key = columnMap.get(toColumnKey(alias));
    if (key !== undefined) {
      return row[key] ?? '';
    }
  }
  return '';
}

function parseMonthCell(value) {
  const normalized = normalizeText(value);
  const match = normalized.match(/^([a-z]+)\.?\/(\d{2,4})$/);
  if (!match) {
    return '';
  }

  const month = MONTH_NUMBERS[match[1]];
  if (!month) {
    return '';
  }
  const year = match[2].length === 2 ? `20${match[2]}` : match[2];
  return `${year}-${month}`;
}

function isAnnualRow(row) {
  const year = normalizeText(readAnnualValue(row, ANNUAL_ALIASES.year));
  return /^\d{4}$/.test(year) || year === 'total';
}

function isMonthlyHeader(row) {
  return normalizeText(readAnnualValue(row, ANNUAL_ALIASES.year)) === 'mes compra';
}

function normalizeAnnualRow(row, index) {
  const yearValue = String(readAnnualValue(row, ANNUAL_ALIASES.year) || '').trim();
  const boxes16 = safeNumber(readAnnualValue(row, ANNUAL_ALIASES.boxes16));
  const boxes30 = safeNumber(readAnnualValue(row, ANNUAL_ALIASES.boxes30));

  return {
    id: `annual-${yearValue || index}`,
    rowType: 'annual',
    year: yearValue.toUpperCase() === 'TOTAL' ? 'TOTAL' : yearValue,
    isTotal: yearValue.toUpperCase() === 'TOTAL',
    boxes16,
    units16: boxes16 * BOBBIN_CONFIGS['16'].unitsPerBox,
    value16: safeNumber(readAnnualValue(row, ANNUAL_ALIASES.value16)),
    boxes30,
    units30: boxes30 * BOBBIN_CONFIGS['30'].unitsPerBox,
    value30: safeNumber(readAnnualValue(row, ANNUAL_ALIASES.value30)),
    totalBoxes: safeNumber(readAnnualValue(row, ANNUAL_ALIASES.totalBoxes)),
    transactions: safeNumber(readAnnualValue(row, ANNUAL_ALIASES.transactions)),
    totalValue: safeNumber(readAnnualValue(row, ANNUAL_ALIASES.totalValue)),
  };
}

function normalizeMonthlyRow(row, columnMap, index) {
  const purchaseMonth = parseMonthCell(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.purchaseMonth));
  const consumptionMonth = parseMonthCell(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.consumptionMonth));
  const orderDate = parseDate(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.orderDate));
  const deliveryDate = parseDate(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.deliveryDate));

  return {
    id: `monthly-${purchaseMonth || index}`,
    rowType: 'monthly',
    monthKey: purchaseMonth,
    consumptionMonth,
    transactions: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.transactions)),
    units16: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.units16)),
    boxes16: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.boxes16)),
    value16: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.value16)),
    units30: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.units30)),
    boxes30: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.boxes30)),
    value30: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.value30)),
    totalUnits: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.totalUnits)),
    totalBoxes: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.totalBoxes)),
    totalValue: safeNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.totalValue)),
    consumptionUnits: optionalNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.consumption)),
    balanceUnits: optionalNumber(readMonthlyValue(row, columnMap, MONTHLY_ALIASES.balance)),
    orderDate,
    deliveryDate,
    hasPurchaseData: Boolean(
      orderDate
      || deliveryDate
      || readMonthlyValue(row, columnMap, MONTHLY_ALIASES.units16)
      || readMonthlyValue(row, columnMap, MONTHLY_ALIASES.units30),
    ),
  };
}

export function normalizePurchasePlanningRows(rawRows) {
  const rows = rawRows.filter((row) => (
    Object.values(row || {}).some((value) => String(value ?? '').trim() !== '')
  ));
  const annualRows = rows.filter(isAnnualRow).map(normalizeAnnualRow);
  const monthlyHeaderIndex = rows.findIndex(isMonthlyHeader);
  const monthlyHeader = monthlyHeaderIndex >= 0 ? rows[monthlyHeaderIndex] : null;
  const monthlyColumnMap = buildMonthlyColumnMap(monthlyHeader);
  const monthlyRows = monthlyHeader
    ? rows.slice(monthlyHeaderIndex + 1)
      .map((row, index) => normalizeMonthlyRow(row, monthlyColumnMap, index))
      .filter((row) => row.monthKey)
    : [];

  return {
    records: [...annualRows, ...monthlyRows],
    meta: {
      totalRows: rows.length,
      totalRecords: annualRows.length + monthlyRows.length,
      annualRows: annualRows.length,
      monthlyRows: monthlyRows.length,
      missingColumns: monthlyHeader ? [] : ['Cabeçalho do planejamento mensal'],
      identifiedColumns: {
        'Resumo anual': annualRows.length ? 'Identificado' : 'Não identificado',
        'Planejamento mensal': monthlyRows.length ? 'Identificado' : 'Não identificado',
      },
    },
  };
}
