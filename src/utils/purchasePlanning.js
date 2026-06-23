import {
  BOBBIN_CONFIGS,
  calculateCost,
  getBobbinKey,
  parseNumber,
} from './calculations';
import {
  addMonths,
  formatDateBR,
  formatMonth,
  getMonthKey,
  parseDate,
  parseMonthKey,
} from './dateUtils';
import { normalizeText } from './normalization';

export const PURCHASE_PLANNING_CONFIG = {
  bobbins: BOBBIN_CONFIGS,
  thresholds: {
    critical: 35,
    attention: 60,
  },
};

const MONTH_NAMES = {
  janeiro: 1,
  jan: 1,
  fevereiro: 2,
  fev: 2,
  marco: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  maio: 5,
  mai: 5,
  junho: 6,
  jun: 6,
  julho: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  setembro: 9,
  set: 9,
  outubro: 10,
  out: 10,
  novembro: 11,
  nov: 11,
  dezembro: 12,
  dez: 12,
};

const FIELD_ALIASES = {
  purchaseMonth: ['mes compra', 'mes de compra', 'competencia compra'],
  consumptionMonth: ['mes consumo', 'mes de consumo', 'competencia consumo', 'mes atendido'],
  transactions: ['transacoes mes compra', 'transacoes do mes', 'qtd transacoes', 'qt transacoes'],
  requestDate: ['data solicitacao', 'data de solicitacao', 'dt solicitacao'],
  purchaseDate: ['data compra', 'data de compra', 'dt compra'],
  deliveryDate: [
    'data entrega prevista',
    'previsao de entrega',
    'data prevista entrega',
    'dt entrega prevista',
  ],
  boxes16: ['caixas 56 mm x 16 m', 'caixas 16 m', 'qt 16 m', 'qtd 16 m'],
  units16: ['unidades 56 mm x 16 m', 'unidades 16 m', 'qt unidades 16 m'],
  value16: ['valor 56 mm x 16 m', 'valor 16 m', 'custo 16 m'],
  boxes30: ['caixas 56 mm x 30 m', 'caixas 30 m', 'qt 30 m', 'qtd 30 m'],
  units30: ['unidades 56 mm x 30 m', 'unidades 30 m', 'qt unidades 30 m'],
  value30: ['valor 56 mm x 30 m', 'valor 30 m', 'custo 30 m'],
  consumption: ['consumo', 'consumo atual', 'demanda', 'demanda mensal'],
  balance: ['saldo', 'saldo projetado', 'saldo operacional'],
  observation: ['observacao', 'obs', 'nota'],
};

const MONTH_FIELDS = new Set(['purchaseMonth', 'consumptionMonth']);
const DATE_FIELDS = new Set(['requestDate', 'purchaseDate', 'deliveryDate']);
const NUMBER_FIELDS = new Set([
  'transactions',
  'boxes16',
  'units16',
  'value16',
  'boxes30',
  'units30',
  'value30',
  'consumption',
  'balance',
]);
const NORMALIZED_ROW_CACHE = new WeakMap();

function valueOrZero(value) {
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asDate(value) {
  return parseDate(value);
}

function dateToInputValue(value) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonthsToDate(date, offset) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth() + offset, date.getDate());
}

function parseMonthValue(value, fallbackYear = '') {
  if (!value && value !== 0) {
    return '';
  }

  if (value instanceof Date) {
    return getMonthKey(value);
  }

  const text = normalizeText(value);
  const iso = text.match(/^(\d{4})[-/](\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}`;
  }

  const br = text.match(/^(\d{1,2})[-/](\d{2,4})$/);
  if (br) {
    const year = br[2].length === 2 ? `20${br[2]}` : br[2];
    return `${year}-${String(Number(br[1])).padStart(2, '0')}`;
  }

  const named = text.match(/^([a-z]+)(?:\s+de)?\s*[/ -]?\s*(\d{2,4})?$/);
  if (named && MONTH_NAMES[named[1]]) {
    const yearText = named[2] || fallbackYear;
    if (!yearText) {
      return '';
    }
    const year = String(yearText).length === 2 ? `20${yearText}` : String(yearText);
    return `${year}-${String(MONTH_NAMES[named[1]]).padStart(2, '0')}`;
  }

  const date = parseDate(value);
  return date ? getMonthKey(date) : '';
}

function buildNormalizedRow(original = {}) {
  if (original && typeof original === 'object' && NORMALIZED_ROW_CACHE.has(original)) {
    return NORMALIZED_ROW_CACHE.get(original);
  }

  const normalized = Object.entries(original).reduce((map, [header, value]) => {
    const key = normalizeText(header);
    if (!map.has(key)) {
      map.set(key, value);
    }
    return map;
  }, new Map());

  if (original && typeof original === 'object') {
    NORMALIZED_ROW_CACHE.set(original, normalized);
  }
  return normalized;
}

function readAliasedValue(original, field) {
  const row = buildNormalizedRow(original);
  const aliases = FIELD_ALIASES[field] || [];
  for (const alias of aliases) {
    if (row.has(alias)) {
      const value = row.get(alias);
      return {
        found: value !== null && value !== undefined && String(value).trim() !== '',
        value,
      };
    }
  }
  return { found: false, value: '' };
}

function createSourceFields() {
  return Object.keys(FIELD_ALIASES).reduce((fields, field) => {
    fields[field] = false;
    return fields;
  }, {});
}

function identifyPlanningFields(records) {
  const identified = createSourceFields();

  records.forEach((record) => {
    Object.keys(FIELD_ALIASES).forEach((field) => {
      if (!identified[field] && readAliasedValue(record.original, field).found) {
        identified[field] = true;
      }
    });
  });

  return identified;
}

function firstDate(current, next) {
  if (!next) {
    return current;
  }
  if (!current || next < current) {
    return next;
  }
  return current;
}

function lastDate(current, next) {
  if (!next) {
    return current;
  }
  if (!current || next > current) {
    return next;
  }
  return current;
}

function createDemandMonth(monthKey) {
  return {
    monthKey,
    transactions: 0,
    units16: 0,
    units30: 0,
    boxes16: 0,
    boxes30: 0,
    requestDate: null,
    latestRequestDate: null,
    destinationTransactions: new Map(),
  };
}

function buildDemandByMonth(records) {
  const months = new Map();

  records.forEach((record) => {
    const monthKey = record.openingMonth;
    if (!monthKey) {
      return;
    }

    if (!months.has(monthKey)) {
      months.set(monthKey, createDemandMonth(monthKey));
    }

    const month = months.get(monthKey);
    const quantity = Number.isFinite(record.quantity) ? Math.max(record.quantity, 0) : 0;
    const typeKey = getBobbinKey(record.bobbinType);
    if (typeKey === '16') {
      month.units16 += quantity;
      month.boxes16 += quantity / BOBBIN_CONFIGS['16'].unitsPerBox;
    } else if (typeKey === '30') {
      month.units30 += quantity;
      month.boxes30 += quantity / BOBBIN_CONFIGS['30'].unitsPerBox;
    }

    month.requestDate = firstDate(month.requestDate, record.openingDate);
    month.latestRequestDate = lastDate(month.latestRequestDate, record.openingDate);

    const transactionField = readAliasedValue(record.original, 'transactions');
    const destination = record.destination || `linha-${record.rowNumber}`;
    if (transactionField.found) {
      const transactions = valueOrZero(transactionField.value);
      month.destinationTransactions.set(
        destination,
        Math.max(month.destinationTransactions.get(destination) || 0, transactions),
      );
    }
  });

  months.forEach((month) => {
    month.transactions = Array.from(month.destinationTransactions.values())
      .reduce((total, value) => total + value, 0);
    month.destinationTransactions = undefined;
  });

  return months;
}

function createSheetPlan(monthKey) {
  return {
    month: monthKey,
    consumptionMonth: '',
    transactions: 0,
    requestDate: null,
    purchaseDate: null,
    deliveryDate: null,
    boxes16: 0,
    units16: 0,
    value16: 0,
    boxes30: 0,
    units30: 0,
    value30: 0,
    consumption: 0,
    balance: 0,
    observation: '',
    provided: createSourceFields(),
  };
}

function buildSheetPlans(records, defaultYear) {
  const plans = new Map();

  records.forEach((record) => {
    const purchaseMonthValue = readAliasedValue(record.original, 'purchaseMonth');
    if (!purchaseMonthValue.found) {
      return;
    }

    const monthKey = parseMonthValue(purchaseMonthValue.value, defaultYear);
    if (!monthKey) {
      return;
    }

    if (!plans.has(monthKey)) {
      plans.set(monthKey, createSheetPlan(monthKey));
    }
    const plan = plans.get(monthKey);

    Object.keys(FIELD_ALIASES).forEach((field) => {
      const source = readAliasedValue(record.original, field);
      if (!source.found) {
        return;
      }
      plan.provided[field] = true;

      if (NUMBER_FIELDS.has(field)) {
        plan[field] += valueOrZero(source.value);
      } else if (DATE_FIELDS.has(field)) {
        plan[field] = firstDate(plan[field], asDate(source.value));
      } else if (MONTH_FIELDS.has(field)) {
        plan[field] = parseMonthValue(source.value, defaultYear) || plan[field];
      } else if (field === 'observation' && !plan.observation) {
        plan.observation = String(source.value).trim();
      }
    });
  });

  return plans;
}

function createManualMonth(monthKey) {
  return {
    month: monthKey,
    requestDate: '',
    purchaseDate: '',
    deliveryDate: '',
    boxes16: 0,
    boxes30: 0,
    note: '',
    initialStockUnits: 0,
    initialStockBoxes: 0,
    sourceIds: [],
  };
}

function buildManualPlans(purchases) {
  const plans = new Map();

  purchases.forEach((purchase) => {
    if (!purchase?.month) {
      return;
    }
    if (!plans.has(purchase.month)) {
      plans.set(purchase.month, createManualMonth(purchase.month));
    }

    const plan = plans.get(purchase.month);
    plan.sourceIds.push(purchase.id);
    plan.requestDate ||= purchase.requestDate || '';
    plan.purchaseDate ||= purchase.purchaseDate || '';
    plan.deliveryDate ||= purchase.deliveryDate || '';
    plan.note ||= purchase.note || purchase.observation || '';
    plan.initialStockUnits = Math.max(plan.initialStockUnits, valueOrZero(purchase.initialStockUnits));
    plan.initialStockBoxes = Math.max(plan.initialStockBoxes, valueOrZero(purchase.initialStockBoxes));

    if (purchase.boxes16 !== undefined || purchase.boxes30 !== undefined) {
      plan.boxes16 += valueOrZero(purchase.boxes16);
      plan.boxes30 += valueOrZero(purchase.boxes30);
      return;
    }

    const typeKey = getBobbinKey(purchase.type);
    if (typeKey === '16') {
      plan.boxes16 += valueOrZero(purchase.boxes);
    } else if (typeKey === '30') {
      plan.boxes30 += valueOrZero(purchase.boxes);
    }
  });

  return plans;
}

function monthsForYear(year) {
  return Array.from({ length: 12 }, (_, index) => (
    `${year}-${String(index + 1).padStart(2, '0')}`
  ));
}

function resolveLatestYear(records, purchases) {
  const years = [
    ...records.map((record) => record.openingMonth?.slice(0, 4)),
    ...purchases.map((purchase) => purchase.month?.slice(0, 4)),
  ].filter(Boolean);

  return years.sort((a, b) => b.localeCompare(a))[0] || String(new Date().getFullYear());
}

function resolveValue(sheet, manual, field, fallback) {
  if (sheet?.provided?.[field]) {
    return sheet[field];
  }
  if (manual && manual[field] !== undefined && manual[field] !== '') {
    return manual[field];
  }
  return fallback;
}

function statusFromRow(row) {
  if (!row.hasConsumption && !row.hasPurchase && !row.hasInventoryReference) {
    return 'Sem dados suficientes';
  }
  if (row.hasConsumption && !row.hasPurchase) {
    return 'Sem compra planejada';
  }
  if (!row.hasInventoryReference) {
    return 'Sem dados suficientes';
  }
  if (row.balanceUnits < 0 || row.stockUnitsPercent < PURCHASE_PLANNING_CONFIG.thresholds.critical) {
    return 'Crítico';
  }
  if (
    row.stockUnitsPercent < PURCHASE_PLANNING_CONFIG.thresholds.attention
    || row.stockBoxesPercent < PURCHASE_PLANNING_CONFIG.thresholds.attention
  ) {
    return 'Atenção';
  }
  return 'Coberto';
}

function statusTone(status) {
  if (status === 'Coberto') {
    return 'success';
  }
  if (status === 'Atenção' || status === 'Sem compra planejada') {
    return 'warning';
  }
  if (status === 'Crítico') {
    return 'danger';
  }
  return 'muted';
}

function buildRows({
  year,
  demandByMonth,
  manualPlans,
  sheetPlans,
}) {
  const monthKeys = monthsForYear(year);
  const initialStockUnits = Array.from(manualPlans.values())
    .filter((plan) => plan.month.startsWith(`${year}-`))
    .reduce((maximum, plan) => Math.max(maximum, plan.initialStockUnits), 0);
  const initialStockBoxes = Array.from(manualPlans.values())
    .filter((plan) => plan.month.startsWith(`${year}-`))
    .reduce((maximum, plan) => Math.max(maximum, plan.initialStockBoxes), 0);
  const hasInitialStock = initialStockUnits > 0 || initialStockBoxes > 0;

  const arrivals = new Map();
  let previousBalanceUnits = initialStockUnits;
  let previousBalanceBoxes = initialStockBoxes;

  const baseRows = monthKeys.map((monthKey) => {
    const sheet = sheetPlans.get(monthKey);
    const manual = manualPlans.get(monthKey);
    const calendarDemand = demandByMonth.get(monthKey) || createDemandMonth(monthKey);
    const boxes16 = resolveValue(sheet, manual, 'boxes16', 0);
    const boxes30 = resolveValue(sheet, manual, 'boxes30', 0);
    const units16 = sheet?.provided?.units16
      ? sheet.units16
      : boxes16 * BOBBIN_CONFIGS['16'].unitsPerBox;
    const units30 = sheet?.provided?.units30
      ? sheet.units30
      : boxes30 * BOBBIN_CONFIGS['30'].unitsPerBox;
    const value16 = sheet?.provided?.value16
      ? sheet.value16
      : calculateCost(units16, BOBBIN_CONFIGS['16'].unitCost);
    const value30 = sheet?.provided?.value30
      ? sheet.value30
      : calculateCost(units30, BOBBIN_CONFIGS['30'].unitCost);
    const requestDate = resolveValue(sheet, manual, 'requestDate', calendarDemand.requestDate);
    const purchaseDate = resolveValue(sheet, manual, 'purchaseDate', null);
    const directDeliveryDate = resolveValue(sheet, manual, 'deliveryDate', null);
    const parsedPurchaseDate = asDate(purchaseDate);
    const deliveryDate = asDate(directDeliveryDate) || addMonthsToDate(parsedPurchaseDate, 1);
    const deliveryMonth = deliveryDate ? getMonthKey(deliveryDate) : addMonths(monthKey, 1);
    const consumptionMonth = sheet?.provided?.consumptionMonth
      ? sheet.consumptionMonth
      : addMonths(monthKey, 2);
    const transactionValue = sheet?.provided?.transactions
      ? sheet.transactions
      : calendarDemand.transactions;

    const plannedUnits = units16 + units30;
    const plannedBoxes = boxes16 + boxes30;
    if (plannedUnits || plannedBoxes) {
      const arrival = arrivals.get(deliveryMonth) || { units: 0, boxes: 0 };
      arrival.units += plannedUnits;
      arrival.boxes += plannedBoxes;
      arrivals.set(deliveryMonth, arrival);
    }

    return {
      id: monthKey,
      monthKey,
      monthLabel: formatMonth(monthKey),
      purchaseMonthLabel: formatMonth(monthKey).replace(' de ', '/').replace(/\D+(\d{4})$/, '/$1'),
      consumptionMonth,
      consumptionMonthLabel: formatMonth(consumptionMonth),
      transactions: transactionValue,
      requestDate: asDate(requestDate),
      purchaseDate: parsedPurchaseDate,
      deliveryDate,
      formalDeliveryDate: asDate(directDeliveryDate),
      boxes16,
      units16,
      value16,
      boxes30,
      units30,
      value30,
      totalUnits: plannedUnits,
      totalBoxes: plannedBoxes,
      totalValue: value16 + value30,
      note: sheet?.observation || manual?.note || '',
      sourceIds: manual?.sourceIds || [],
      source: sheet ? 'planilha' : manual ? 'manual' : 'calculado',
      demandCalendar: calendarDemand,
    };
  });

  return baseRows.map((row) => {
    const demand = demandByMonth.get(row.monthKey) || createDemandMonth(row.monthKey);
    const arrival = arrivals.get(row.monthKey) || { units: 0, boxes: 0 };
    const consumptionUnits = demand.units16 + demand.units30;
    const consumptionBoxes = demand.boxes16 + demand.boxes30;
    previousBalanceUnits += arrival.units - consumptionUnits;
    previousBalanceBoxes += arrival.boxes - consumptionBoxes;

    const hasConsumption = consumptionUnits > 0;
    const hasPurchase = row.totalUnits > 0;
    const stockUnitsPercent = hasInitialStock && hasConsumption
      ? (previousBalanceUnits / consumptionUnits) * 100
      : null;
    const stockBoxesPercent = hasInitialStock && consumptionBoxes > 0
      ? (previousBalanceBoxes / consumptionBoxes) * 100
      : null;
    const enriched = {
      ...row,
      boxesRequested: row.totalBoxes,
      unitsRequested: row.totalUnits,
      consumptionUnits,
      consumptionBoxes,
      receivedUnits: arrival.units,
      receivedBoxes: arrival.boxes,
      balanceUnits: hasInitialStock ? previousBalanceUnits : null,
      balanceBoxes: hasInitialStock ? previousBalanceBoxes : null,
      stockUnitsPercent,
      stockBoxesPercent,
      hasConsumption,
      hasPurchase,
      hasInventoryReference: hasInitialStock,
      demand16: demand.units16,
      demand30: demand.units30,
    };
    const status = statusFromRow(enriched);
    return {
      ...enriched,
      status,
      statusTone: statusTone(status),
    };
  });
}

function sumRows(rows) {
  return rows.reduce((summary, row) => ({
    units16: summary.units16 + row.units16,
    units30: summary.units30 + row.units30,
    boxes16: summary.boxes16 + row.boxes16,
    boxes30: summary.boxes30 + row.boxes30,
    value16: summary.value16 + row.value16,
    value30: summary.value30 + row.value30,
    transactions: summary.transactions + row.transactions,
    totalUnits: summary.totalUnits + row.totalUnits,
    totalBoxes: summary.totalBoxes + row.totalBoxes,
    totalValue: summary.totalValue + row.totalValue,
    consumptionUnits: summary.consumptionUnits + row.consumptionUnits,
  }), {
    units16: 0,
    units30: 0,
    boxes16: 0,
    boxes30: 0,
    value16: 0,
    value30: 0,
    transactions: 0,
    totalUnits: 0,
    totalBoxes: 0,
    totalValue: 0,
    consumptionUnits: 0,
  });
}

function buildAlerts(rows) {
  const alerts = [];

  if (!rows.some((row) => row.hasInventoryReference)) {
    alerts.push({
      id: 'missing-initial-stock',
      tone: 'warning',
      month: 'Ano',
      type: 'Estoque inicial não informado',
      affected: 'Saldo e cobertura',
      explanation: 'A base Bobinas informa consumo, mas não contém uma posição inicial de estoque.',
      recommendation: 'Informe o estoque inicial do ano em um planejamento mensal para habilitar saldo e percentuais.',
    });
  }

  rows.forEach((row) => {
    if (Number.isFinite(row.balanceUnits) && row.balanceUnits < 0) {
      alerts.push({
        id: `${row.id}-negative`,
        tone: 'danger',
        month: row.monthLabel,
        type: 'Saldo negativo',
        affected: `${Math.abs(Math.round(row.balanceUnits)).toLocaleString('pt-BR')} unidades`,
        explanation: 'O consumo acumulado ultrapassou o estoque inicial e as entregas previstas.',
        recommendation: 'Antecipar a próxima compra ou rever a data de entrega prevista.',
      });
    }
    if (row.hasConsumption && !row.hasPurchase) {
      alerts.push({
        id: `${row.id}-no-purchase`,
        tone: 'warning',
        month: row.monthLabel,
        type: 'Mês com consumo sem compra relacionada',
        affected: `${Math.round(row.consumptionUnits).toLocaleString('pt-BR')} unidades`,
        explanation: 'Há consumo real na base Bobinas, mas não existe compra cadastrada no mês.',
        recommendation: 'Confirmar se o estoque anterior cobre a demanda ou cadastrar o planejamento mensal.',
      });
    }
    if (row.hasPurchase && !row.formalDeliveryDate && !row.purchaseDate) {
      alerts.push({
        id: `${row.id}-delivery`,
        tone: 'warning',
        month: row.monthLabel,
        type: 'Compra sem data de entrega prevista',
        affected: `${Math.round(row.totalBoxes).toLocaleString('pt-BR')} caixas`,
        explanation: 'A compra possui quantidade, mas não tem data de compra ou entrega informada.',
        recommendation: 'Informe a data formal para melhorar a projeção cronológica do estoque.',
      });
    }
    if (row.hasPurchase && row.totalUnits < row.consumptionUnits) {
      alerts.push({
        id: `${row.id}-below-demand`,
        tone: 'warning',
        month: row.monthLabel,
        type: 'Compra abaixo da demanda',
        affected: `${Math.round(row.consumptionUnits - row.totalUnits).toLocaleString('pt-BR')} unidades`,
        explanation: 'As unidades planejadas no mês são menores que o consumo real do período.',
        recommendation: 'Reavaliar as caixas de 16 M e 30 M antes de confirmar a compra.',
      });
    }
  });

  return alerts;
}

export function buildPurchasePlanning(records = [], purchases = [], selectedYear = '') {
  const year = selectedYear || resolveLatestYear(records, purchases);
  const demandByMonth = buildDemandByMonth(records);
  const manualPlans = buildManualPlans(purchases);
  const sheetPlans = buildSheetPlans(records, year);
  const rows = buildRows({
    year,
    demandByMonth,
    manualPlans,
    sheetPlans,
  });
  const identifiedFields = identifyPlanningFields(records);
  const years = Array.from(new Set([
    ...records.map((record) => record.openingMonth?.slice(0, 4)),
    ...purchases.map((purchase) => purchase.month?.slice(0, 4)),
    String(new Date().getFullYear()),
  ].filter(Boolean))).sort((a, b) => b.localeCompare(a));

  return {
    year,
    years,
    rows,
    totals: sumRows(rows),
    alerts: buildAlerts(rows),
    identifiedFields,
    sourceSummary: {
      spreadsheetPlanningMonths: sheetPlans.size,
      manualPlanningMonths: manualPlans.size,
      demandMonths: demandByMonth.size,
    },
  };
}

export function filterPurchasePlanningRows(rows, filters) {
  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) {
      return false;
    }
    if (filters.onlyCritical && row.status !== 'Crítico') {
      return false;
    }
    if (filters.onlyWithoutPurchase && row.hasPurchase) {
      return false;
    }
    if (filters.onlyWithConsumption && !row.hasConsumption) {
      return false;
    }
    return true;
  });
}

export function getPlanningTotalsForType(rows, type) {
  const totals = sumRows(rows);
  if (type === '16') {
    return {
      ...totals,
      units30: 0,
      boxes30: 0,
      value30: 0,
      totalUnits: totals.units16,
      totalBoxes: totals.boxes16,
      totalValue: totals.value16,
    };
  }
  if (type === '30') {
    return {
      ...totals,
      units16: 0,
      boxes16: 0,
      value16: 0,
      totalUnits: totals.units30,
      totalBoxes: totals.boxes30,
      totalValue: totals.value30,
    };
  }
  return totals;
}

export function getOperationalMonth(rows, year) {
  const now = new Date();
  const currentMonthKey = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (String(now.getFullYear()) === String(year)) {
    return rows.find((row) => row.monthKey === currentMonthKey) || rows[0];
  }

  const withData = rows.filter((row) => row.hasPurchase || row.hasConsumption);
  return withData[withData.length - 1] || rows[0];
}

export function planningRowToForm(row) {
  return {
    id: row?.sourceIds?.[0] || '',
    month: row?.monthKey || '',
    requestDate: dateToInputValue(row?.requestDate),
    purchaseDate: dateToInputValue(row?.purchaseDate),
    deliveryDate: dateToInputValue(row?.formalDeliveryDate),
    boxes16: row?.boxes16 || '',
    boxes30: row?.boxes30 || '',
    note: row?.note || '',
    initialStockUnits: '',
    initialStockBoxes: '',
  };
}

export function formatPlanningDate(date) {
  return date ? formatDateBR(date) : '-';
}

export function formatPlanningMonth(monthKey) {
  const date = parseMonthKey(monthKey);
  if (!date) {
    return '-';
  }
  const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  return label.replace('.', '');
}

export function serializePlanningForJson(purchases) {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    purchases,
  };
}
