import {
  BOBBIN_CONFIGS,
  calculateCost,
  ceilBoxes,
  getBobbinKey,
} from './calculations';
import {
  formatDateBR,
  formatMonth,
  parseMonthKey,
} from './dateUtils';

export const PURCHASE_PLANNING_CONFIG = {
  bobbins: BOBBIN_CONFIGS,
  thresholds: {
    critical: 35,
    attention: 60,
  },
};

function monthKeysForYear(year) {
  return Array.from({ length: 12 }, (_, index) => (
    `${year}-${String(index + 1).padStart(2, '0')}`
  ));
}

function emptyMonth(monthKey) {
  const consumptionDate = new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1, 1);
  const purchaseDate = new Date(consumptionDate.getFullYear(), consumptionDate.getMonth() - 2, 1);
  const purchaseMonth = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`;

  return {
    id: `empty-${monthKey}`,
    rowType: 'monthly',
    monthKey,
    consumptionMonth: monthKey,
    purchaseMonth,
    transactions: 0,
    units16: 0,
    boxes16: 0,
    value16: 0,
    units30: 0,
    boxes30: 0,
    value30: 0,
    totalUnits: 0,
    totalBoxes: 0,
    totalValue: 0,
    consumption16Units: null,
    balance16Units: null,
    consumption30Units: null,
    balance30Units: null,
    consumptionUnits: null,
    balanceUnits: null,
    orderDate: null,
    deliveryDate: null,
    hasPurchaseData: false,
    source: 'sheet',
  };
}

function monthlyManualFallback(purchases, year) {
  const byMonth = new Map();

  purchases.forEach((purchase) => {
    if (!purchase.month) {
      return;
    }
    const purchaseDate = new Date(Number(purchase.month.slice(0, 4)), Number(purchase.month.slice(5, 7)) - 1, 1);
    const consumptionDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + 2, 1);
    const consumptionMonth = `${consumptionDate.getFullYear()}-${String(consumptionDate.getMonth() + 1).padStart(2, '0')}`;
    if (!consumptionMonth.startsWith(`${year}-`)) {
      return;
    }
    const current = byMonth.get(consumptionMonth) || emptyMonth(consumptionMonth);
    const typeKey = getBobbinKey(purchase.type);
    const boxes16 = Number(purchase.boxes16) || (typeKey === '16' ? Number(purchase.boxes) || 0 : 0);
    const boxes30 = Number(purchase.boxes30) || (typeKey === '30' ? Number(purchase.boxes) || 0 : 0);
    current.boxes16 += boxes16;
    current.boxes30 += boxes30;
    current.units16 = current.boxes16 * BOBBIN_CONFIGS['16'].unitsPerBox;
    current.units30 = current.boxes30 * BOBBIN_CONFIGS['30'].unitsPerBox;
    current.value16 = calculateCost(current.units16, BOBBIN_CONFIGS['16'].unitCost);
    current.value30 = calculateCost(current.units30, BOBBIN_CONFIGS['30'].unitCost);
    current.totalUnits = current.units16 + current.units30;
    current.totalBoxes = current.boxes16 + current.boxes30;
    current.totalValue = current.value16 + current.value30;
    current.orderDate = purchase.purchaseDate ? new Date(`${purchase.purchaseDate}T00:00:00`) : current.orderDate;
    current.deliveryDate = purchase.deliveryDate ? new Date(`${purchase.deliveryDate}T00:00:00`) : current.deliveryDate;
    current.purchaseMonth = purchase.month;
    current.hasPurchaseData = current.totalUnits > 0;
    current.source = 'manual';
    byMonth.set(consumptionMonth, current);
  });

  return byMonth;
}

function normalizeStatus(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function statusMatches(record, statusMode) {
  const status = normalizeStatus(record.status);
  if (statusMode === 'sent') {
    return status === 'enviado';
  }
  if (statusMode === 'pending') {
    return status === 'pendente';
  }
  return true;
}

function buildBobbinConsumption(records, year, statusMode = 'sent') {
  const months = new Map();
  records.forEach((record) => {
    if (!record.openingMonth?.startsWith(`${year}-`)) {
      return;
    }
    if (!statusMatches(record, statusMode)) {
      return;
    }
    const current = months.get(record.openingMonth) || {
      units16: 0,
      units30: 0,
      totalUnits: 0,
    };
    const quantity = Number(record.quantity) || 0;
    const typeKey = getBobbinKey(record.bobbinType);
    if (typeKey === '16') {
      current.units16 += quantity;
    } else if (typeKey === '30') {
      current.units30 += quantity;
    }
    current.totalUnits += quantity;
    months.set(record.openingMonth, current);
  });
  return months;
}

function typedTotal(first, second, fallback = null) {
  const hasTypedValue = Number.isFinite(first) || Number.isFinite(second);
  if (hasTypedValue) {
    return (Number(first) || 0) + (Number(second) || 0);
  }
  return Number.isFinite(fallback) ? fallback : null;
}

function signedCeilBoxes(units, type) {
  const unitsPerBox = BOBBIN_CONFIGS[type]?.unitsPerBox || 1;
  if (!Number.isFinite(units) || units === 0) {
    return 0;
  }
  const boxes = ceilBoxes(Math.abs(units), unitsPerBox);
  return units < 0 ? -boxes : boxes;
}

function statusForRow(row) {
  const hasConsumption = Number.isFinite(row.consumptionUnits) && row.consumptionUnits > 0;
  if (!row.hasPurchaseData && !hasConsumption && !Number.isFinite(row.balanceUnits)) {
    return { status: 'Sem dados suficientes', statusTone: 'muted' };
  }
  if (hasConsumption && !row.hasPurchaseData) {
    return { status: 'Sem compra planejada', statusTone: 'warning' };
  }
  if (Number.isFinite(row.balanceUnits) && row.balanceUnits < 0) {
    return { status: 'Crítico', statusTone: 'danger' };
  }

  const coverage = hasConsumption && Number.isFinite(row.balanceUnits)
    ? (row.balanceUnits / row.consumptionUnits) * 100
    : null;
  if (Number.isFinite(coverage) && coverage < PURCHASE_PLANNING_CONFIG.thresholds.critical) {
    return { status: 'Crítico', statusTone: 'danger' };
  }
  if (Number.isFinite(coverage) && coverage < PURCHASE_PLANNING_CONFIG.thresholds.attention) {
    return { status: 'Atenção', statusTone: 'warning' };
  }
  return { status: 'Coberto', statusTone: 'success' };
}

function enrichMonthlyRow(row) {
  const consumptionUnits = typedTotal(row.consumption16Units, row.consumption30Units, row.consumptionUnits);
  const balanceUnits = typedTotal(row.balance16Units, row.balance30Units, row.balanceUnits);
  const baseRow = {
    ...row,
    consumptionUnits,
    balanceUnits,
  };
  const status = statusForRow(baseRow);
  return {
    ...baseRow,
    consumption16Boxes: signedCeilBoxes(row.consumption16Units, '16'),
    consumption30Boxes: signedCeilBoxes(row.consumption30Units, '30'),
    balance16Boxes: signedCeilBoxes(row.balance16Units, '16'),
    balance30Boxes: signedCeilBoxes(row.balance30Units, '30'),
    ...status,
    monthLabel: formatMonth(row.monthKey),
    consumptionMonthLabel: formatMonth(row.consumptionMonth),
    hasConsumption: Number.isFinite(row.consumptionUnits) && row.consumptionUnits > 0,
    hasPurchase: row.hasPurchaseData || row.totalUnits > 0,
    purchaseDate: row.orderDate,
    requestDate: row.orderDate,
    formalDeliveryDate: row.deliveryDate,
  };
}

function sumMonthlyRows(rows) {
  return rows.reduce((total, row) => ({
    boxes16: total.boxes16 + row.boxes16,
    units16: total.units16 + row.units16,
    value16: total.value16 + row.value16,
    boxes30: total.boxes30 + row.boxes30,
    units30: total.units30 + row.units30,
    value30: total.value30 + row.value30,
    totalBoxes: total.totalBoxes + row.totalBoxes,
    totalUnits: total.totalUnits + row.totalUnits,
    totalValue: total.totalValue + row.totalValue,
    transactions: total.transactions + row.transactions,
    consumptionUnits: total.consumptionUnits + (row.consumptionUnits || 0),
  }), {
    boxes16: 0,
    units16: 0,
    value16: 0,
    boxes30: 0,
    units30: 0,
    value30: 0,
    totalBoxes: 0,
    totalUnits: 0,
    totalValue: 0,
    transactions: 0,
    consumptionUnits: 0,
  });
}

function buildAlerts(rows) {
  const alerts = [];
  rows.forEach((row) => {
    if (row.status === 'Crítico') {
      alerts.push({
        id: `${row.monthKey}-critical`,
        tone: 'danger',
        month: row.monthLabel,
        type: 'Saldo crítico',
        affected: Number.isFinite(row.balanceUnits) ? `${row.balanceUnits.toLocaleString('pt-BR')} unidades` : '-',
        explanation: 'O saldo informado na planilha está negativo ou abaixo de 35% do consumo.',
        recommendation: 'Revisar a quantidade planejada e a data prevista de entrega.',
      });
    }
    if (row.status === 'Sem compra planejada') {
      alerts.push({
        id: `${row.monthKey}-no-purchase`,
        tone: 'warning',
        month: row.monthLabel,
        type: 'Consumo sem compra',
        affected: `${(row.consumptionUnits || 0).toLocaleString('pt-BR')} unidades`,
        explanation: 'A planilha contém consumo para o período, mas não contém compra planejada.',
        recommendation: 'Confirmar se o saldo existente cobre o consumo informado.',
      });
    }
    if (row.hasPurchase && !row.deliveryDate) {
      alerts.push({
        id: `${row.monthKey}-no-delivery`,
        tone: 'warning',
        month: row.monthLabel,
        type: 'Entrega não informada',
        affected: `${row.totalBoxes.toLocaleString('pt-BR')} caixas`,
        explanation: 'A linha possui compra, mas a data de entrega prevista está vazia.',
        recommendation: 'Preencher a data na aba Compras_Bobinas.',
      });
    }
  });
  return alerts;
}

function selectedAnnualTotals(annualRows, year, monthlyRows) {
  const annual = annualRows.find((row) => row.year === year);
  if (annual) {
    return {
      ...annual,
      totalUnits: annual.units16 + annual.units30,
      consumptionUnits: monthlyRows.reduce((sum, row) => sum + (row.consumptionUnits || 0), 0),
    };
  }
  return sumMonthlyRows(monthlyRows);
}

export function buildPurchasePlanning(
  planningRecords = [],
  bobbinRecords = [],
  purchases = [],
  selectedYear = '',
  options = {},
) {
  const {
    consumptionStatusMode = 'sent',
  } = options;
  const annualRows = planningRecords.filter((record) => record.rowType === 'annual');
  const sheetMonthlyRows = planningRecords.filter((record) => record.rowType === 'monthly');
  const years = Array.from(new Set([
    ...annualRows.filter((row) => !row.isTotal).map((row) => row.year),
    ...sheetMonthlyRows.map((row) => row.monthKey?.slice(0, 4)),
  ].filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const year = selectedYear && years.includes(selectedYear)
    ? selectedYear
    : years[0] || String(new Date().getFullYear());
  const sheetByMonth = new Map(
    sheetMonthlyRows
      .filter((row) => row.consumptionMonth?.startsWith(`${year}-`))
      .map((row) => [row.consumptionMonth, row]),
  );
  const manualByMonth = monthlyManualFallback(purchases, year);
  const bobbinConsumption = buildBobbinConsumption(bobbinRecords, year, consumptionStatusMode);
  const hasFilteredConsumptionSource = bobbinRecords.length > 0;

  const rows = monthKeysForYear(year).map((monthKey) => {
    const sheetRow = sheetByMonth.get(monthKey);
    if (sheetRow) {
      const filteredConsumption = bobbinConsumption.get(monthKey);
      return enrichMonthlyRow({
        ...emptyMonth(monthKey),
        ...sheetRow,
        filteredConsumptionAvailable: hasFilteredConsumptionSource,
        filteredConsumption16Units: filteredConsumption?.units16 || 0,
        filteredConsumption30Units: filteredConsumption?.units30 || 0,
        filteredConsumptionUnits: filteredConsumption?.totalUnits || 0,
        source: 'sheet',
      });
    }
    const manualRow = manualByMonth.get(monthKey);
    const filteredConsumption = bobbinConsumption.get(monthKey);
    if (manualRow) {
      return enrichMonthlyRow({
        ...manualRow,
        consumption16Units: filteredConsumption?.units16 ?? null,
        consumption30Units: filteredConsumption?.units30 ?? null,
        consumptionUnits: filteredConsumption?.totalUnits ?? null,
        filteredConsumptionAvailable: hasFilteredConsumptionSource,
        filteredConsumption16Units: filteredConsumption?.units16 || 0,
        filteredConsumption30Units: filteredConsumption?.units30 || 0,
        filteredConsumptionUnits: filteredConsumption?.totalUnits || 0,
      });
    }
    return enrichMonthlyRow({
      ...emptyMonth(monthKey),
      consumption16Units: filteredConsumption?.units16 ?? null,
      consumption30Units: filteredConsumption?.units30 ?? null,
      consumptionUnits: filteredConsumption?.totalUnits ?? null,
      filteredConsumptionAvailable: hasFilteredConsumptionSource,
      filteredConsumption16Units: filteredConsumption?.units16 || 0,
      filteredConsumption30Units: filteredConsumption?.units30 || 0,
      filteredConsumptionUnits: filteredConsumption?.totalUnits || 0,
      source: planningRecords.length ? 'sheet' : 'empty',
    });
  });

  return {
    year,
    years: years.length ? years : [year],
    rows,
    annualRows,
    annualTotal: annualRows.find((row) => row.isTotal) || null,
    totals: selectedAnnualTotals(annualRows, year, rows),
    alerts: buildAlerts(rows),
    sourceSummary: {
      annualYears: annualRows.filter((row) => !row.isTotal).length,
      purchaseMonths: sheetMonthlyRows.filter((row) => row.hasPurchaseData).length,
      monthlyRows: sheetMonthlyRows.length,
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

export function getPlanningTotalsForType(totals, type) {
  if (type === '16') {
    return {
      ...totals,
      boxes30: 0,
      units30: 0,
      value30: 0,
      totalBoxes: totals.boxes16,
      totalUnits: totals.units16,
      totalValue: totals.value16,
    };
  }
  if (type === '30') {
    return {
      ...totals,
      boxes16: 0,
      units16: 0,
      value16: 0,
      totalBoxes: totals.boxes30,
      totalUnits: totals.units30,
      totalValue: totals.value30,
    };
  }
  return totals;
}

export function getOperationalMonth(rows, year) {
  const now = new Date();
  const currentKey = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (String(now.getFullYear()) === String(year)) {
    return rows.find((row) => row.monthKey === currentKey) || rows[0];
  }
  const populated = rows.filter((row) => row.hasPurchase || row.hasConsumption);
  return populated[populated.length - 1] || rows[0];
}

export function formatPlanningDate(date) {
  return date ? formatDateBR(date) : '-';
}

export function formatPlanningMonth(monthKey) {
  const date = parseMonthKey(monthKey);
  if (!date) {
    return '-';
  }
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}

export function serializePlanningForJson(purchases) {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    purchases,
  };
}
