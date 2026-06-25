import {
  addMonths,
  daysBetween,
  formatDateBR,
  formatMonth,
  getMonthKey,
  listMonthRange,
} from './dateUtils';

export const BOBBIN_CONFIGS = {
  '16': {
    key: '16',
    label: '56 MM X 16 M',
    unitsPerBox: 84,
    unitCost: 1.14,
  },
  '30': {
    key: '30',
    label: '56 MM X 30 M',
    unitsPerBox: 30,
    unitCost: 2.09,
  },
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) {
    return 0;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function median(values) {
  const valid = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!valid.length) {
    return 0;
  }

  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
}

function normalizeForType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  let text = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/[^\d,.-]/g, '');

  if (!text || text === '-' || text === ',' || text === '.') {
    return Number.NaN;
  }

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    text = lastComma > lastDot
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (lastComma > -1) {
    text = text.replace(',', '.');
  } else if ((text.match(/\./g) || []).length > 1) {
    text = text.replace(/\./g, '');
  } else if (lastDot > -1) {
    const decimals = text.length - lastDot - 1;
    if (decimals === 3 && /^-?\d{1,3}(\.\d{3})+$/.test(text)) {
      text = text.replace(/\./g, '');
    }
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : Number.NaN;
}

export function getBobbinKey(type) {
  const normalized = normalizeForType(type);
  if (/\b16\b/.test(normalized) || normalized.includes('16M')) {
    return '16';
  }
  if (/\b30\b/.test(normalized) || normalized.includes('30M')) {
    return '30';
  }
  return 'other';
}

export function getBobbinConfig(type) {
  const key = BOBBIN_CONFIGS[type] ? type : getBobbinKey(type);
  return BOBBIN_CONFIGS[key] || {
    key: 'other',
    label: type || 'Não informado',
    unitsPerBox: 1,
    unitCost: 0,
  };
}

export function ceilBoxes(units, unitsPerBox) {
  if (!Number.isFinite(units) || !Number.isFinite(unitsPerBox) || unitsPerBox <= 0) {
    return 0;
  }
  return Math.ceil(units / unitsPerBox);
}

export function calculateCost(units, unitCost) {
  if (!Number.isFinite(units) || !Number.isFinite(unitCost)) {
    return 0;
  }
  return units * unitCost;
}

export function formatCurrency(value) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatInteger(value) {
  return integerFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatDecimal(value) {
  return decimalFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value) {
  return `${percentFormatter.format(Number.isFinite(value) ? value : 0)}%`;
}

function safeQuantity(record) {
  return Number.isFinite(record.quantity) && record.quantity > 0 ? record.quantity : 0;
}

function normalizeStatus(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function createMonthlyBase(monthKey) {
  return {
    monthKey,
    month: formatMonth(monthKey),
    orders: 0,
    shipments: 0,
    units: 0,
    units16: 0,
    units30: 0,
    otherUnits: 0,
    cost16: 0,
    cost30: 0,
    totalCost: 0,
  };
}

function applyBobbinTotals(row, record) {
  const quantity = safeQuantity(record);
  const key = getBobbinKey(record.bobbinType);
  const config = getBobbinConfig(key);

  if (key === '16') {
    row.units16 += quantity;
    row.cost16 += calculateCost(quantity, config.unitCost);
  } else if (key === '30') {
    row.units30 += quantity;
    row.cost30 += calculateCost(quantity, config.unitCost);
  } else {
    row.otherUnits += quantity;
  }

  row.units += quantity;
  row.totalCost += calculateCost(quantity, config.unitCost);
}

function finalizeMonthlyDemand(row) {
  return {
    ...row,
    boxesEquivalent16: row.units16 / BOBBIN_CONFIGS['16'].unitsPerBox,
    minBoxes16: ceilBoxes(row.units16, BOBBIN_CONFIGS['16'].unitsPerBox),
    boxesEquivalent30: row.units30 / BOBBIN_CONFIGS['30'].unitsPerBox,
    minBoxes30: ceilBoxes(row.units30, BOBBIN_CONFIGS['30'].unitsPerBox),
    totalCost: row.cost16 + row.cost30,
  };
}

export function applyFilters(records, filters, referenceDateField = 'openingMonth') {
  return records.filter((record) => {
    const status = normalizeStatus(record.status);
    const referenceMonth = record[referenceDateField];
    if (
      filters.referenceYear
      && !referenceMonth?.startsWith(`${filters.referenceYear}-`)
    ) {
      return false;
    }
    if (filters.statusMode === 'sent' && status !== 'enviado') {
      return false;
    }
    if (filters.statusMode === 'pending' && status !== 'pendente') {
      return false;
    }
    if (filters.referenceMonth && referenceMonth !== filters.referenceMonth) {
      return false;
    }
    if (filters.openingFrom && (!record.openingMonth || record.openingMonth < filters.openingFrom)) {
      return false;
    }
    if (filters.openingTo && (!record.openingMonth || record.openingMonth > filters.openingTo)) {
      return false;
    }
    if (filters.exitFrom && (!record.exitMonth || record.exitMonth < filters.exitFrom)) {
      return false;
    }
    if (filters.exitTo && (!record.exitMonth || record.exitMonth > filters.exitTo)) {
      return false;
    }
    if (filters.bobbinType && record.bobbinType !== filters.bobbinType) {
      return false;
    }
    if (filters.uf && record.uf !== filters.uf) {
      return false;
    }
    if (filters.destination && record.destination !== filters.destination) {
      return false;
    }
    if (filters.status && record.status !== filters.status) {
      return false;
    }
    if (filters.shippingMethod && record.shippingMethod !== filters.shippingMethod) {
      return false;
    }
    if (filters.callType && record.callType !== filters.callType) {
      return false;
    }
    if (filters.minQuantity && safeQuantity(record) <= Number(filters.minQuantity)) {
      return false;
    }
    if (filters.onlyAbove50 && safeQuantity(record) <= 50) {
      return false;
    }
    return true;
  });
}

export function buildMonthlyDemand(records) {
  const map = new Map();

  records.forEach((record) => {
    if (!record.openingMonth) {
      return;
    }
    if (!map.has(record.openingMonth)) {
      map.set(record.openingMonth, createMonthlyBase(record.openingMonth));
    }
    const row = map.get(record.openingMonth);
    row.orders += 1;
    applyBobbinTotals(row, record);
  });

  return Array.from(map.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map(finalizeMonthlyDemand);
}

export function buildMonthlyShipping(records) {
  const rows = new Map();

  records.forEach((record) => {
    if (!record.exitMonth) {
      return;
    }
    if (!rows.has(record.exitMonth)) {
      rows.set(record.exitMonth, createMonthlyBase(record.exitMonth));
    }
    const row = rows.get(record.exitMonth);
    row.shipments += 1;
    applyBobbinTotals(row, record);
  });

  const result = Array.from(rows.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map(finalizeMonthlyDemand);

  return result.map((row, index) => {
    const previous = result[index - 1];
    const deltaUnits = previous ? row.units - previous.units : 0;
    const deltaPercent = previous && previous.units > 0 ? (deltaUnits / previous.units) * 100 : 0;
    return {
      ...row,
      previousUnits: previous?.units || 0,
      deltaUnits,
      deltaPercent,
    };
  });
}

function buildOpeningShippingComparison(records, referenceMonth = '') {
  const months = new Map();
  const nextMonthShipmentsByOpening = new Map();

  records.forEach((record) => {
    const quantity = safeQuantity(record);
    if (record.openingMonth) {
      if (!months.has(record.openingMonth)) {
        months.set(record.openingMonth, {
          monthKey: record.openingMonth,
          month: formatMonth(record.openingMonth),
          openedOrders: 0,
          requestedUnits: 0,
          shipments: 0,
          shippedUnits: 0,
        });
      }
      const row = months.get(record.openingMonth);
      row.openedOrders += 1;
      row.requestedUnits += quantity;
    }

    if (record.exitMonth) {
      if (!months.has(record.exitMonth)) {
        months.set(record.exitMonth, {
          monthKey: record.exitMonth,
          month: formatMonth(record.exitMonth),
          openedOrders: 0,
          requestedUnits: 0,
          shipments: 0,
          shippedUnits: 0,
        });
      }
      const row = months.get(record.exitMonth);
      row.shipments += 1;
      row.shippedUnits += quantity;
    }

    if (record.openingMonth && record.exitMonth === addMonths(record.openingMonth, 1)) {
      nextMonthShipmentsByOpening.set(
        record.openingMonth,
        (nextMonthShipmentsByOpening.get(record.openingMonth) || 0) + quantity,
      );
    }
  });

  return Array.from(months.values())
    .filter((row) => !referenceMonth || row.monthKey === referenceMonth)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((row) => {
      const difference = row.requestedUnits - row.shippedUnits;
      const nextMonthRecovered = nextMonthShipmentsByOpening.get(row.monthKey) || 0;
      const backlogRisk = row.requestedUnits > row.shippedUnits * 1.15 && nextMonthRecovered > row.requestedUnits * 0.15;
      return {
        ...row,
        difference,
        backlogRisk,
        indicator: backlogRisk ? 'Possível represamento' : difference > 0 ? 'Demanda acima da saída' : 'Sem sinal forte',
      };
    });
}

function groupTotals(records, field) {
  const totals = new Map();

  records.forEach((record) => {
    const label = record[field] || 'Não informado';
    if (!totals.has(label)) {
      totals.set(label, { name: label, count: 0, units: 0 });
    }
    const row = totals.get(label);
    row.count += 1;
    row.units += safeQuantity(record);
  });

  return Array.from(totals.values()).sort((a, b) => b.units - a.units || b.count - a.count);
}

function buildSummary(records) {
  const openingDates = records.map((record) => record.openingDate).filter(Boolean);
  const exitDates = records.map((record) => record.exitDate).filter(Boolean);
  const totalUnits = records.reduce((sum, record) => sum + safeQuantity(record), 0);

  const getPeriod = (dates) => {
    if (!dates.length) {
      return 'Não informado';
    }
    const sorted = [...dates].sort((a, b) => a - b);
    return `${formatDateBR(sorted[0])} a ${formatDateBR(sorted[sorted.length - 1])}`;
  };

  return {
    totalRecords: records.length,
    totalUnits,
    uniqueDestinations: new Set(records.map((record) => record.destination).filter(Boolean)).size,
    uniqueUFs: new Set(records.map((record) => record.uf).filter(Boolean)).size,
    openingPeriod: getPeriod(openingDates),
    exitPeriod: getPeriod(exitDates),
    byStatus: groupTotals(records, 'status'),
    byShippingMethod: groupTotals(records, 'shippingMethod'),
    byBobbinType: groupTotals(records, 'bobbinType'),
    byUF: groupTotals(records, 'uf'),
  };
}

function buildDelayAnalysis(records, referenceDateField = 'openingMonth') {
  const validRecords = records.filter((record) => Number.isFinite(record.delayDays) && record.delayDays >= 0);
  const delays = validRecords.map((record) => record.delayDays);
  const distribution = [
    { label: '0 dia', min: 0, max: 0, count: 0 },
    { label: '1 a 2 dias', min: 1, max: 2, count: 0 },
    { label: '3 a 5 dias', min: 3, max: 5, count: 0 },
    { label: '6 a 10 dias', min: 6, max: 10, count: 0 },
    { label: '11 a 20 dias', min: 11, max: 20, count: 0 },
    { label: '21 dias ou mais', min: 21, max: Infinity, count: 0 },
  ];

  validRecords.forEach((record) => {
    const bucket = distribution.find((item) => record.delayDays >= item.min && record.delayDays <= item.max);
    if (bucket) {
      bucket.count += 1;
    }
  });

  const monthlyMap = new Map();
  const typeMap = new Map();

  validRecords.forEach((record) => {
    const referenceMonth = record[referenceDateField];
    if (referenceMonth) {
      const list = monthlyMap.get(referenceMonth) || [];
      list.push(record.delayDays);
      monthlyMap.set(referenceMonth, list);
    }

    const type = record.bobbinType || 'Não informado';
    const typeList = typeMap.get(type) || [];
    typeList.push(record.delayDays);
    typeMap.set(type, typeList);
  });

  return {
    count: validRecords.length,
    average: average(delays),
    median: median(delays),
    max: delays.length ? Math.max(...delays) : 0,
    min: delays.length ? Math.min(...delays) : 0,
    distribution,
    monthlyAverage: Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, values]) => ({
        monthKey,
        month: formatMonth(monthKey),
        averageDelay: average(values),
        records: values.length,
      })),
    byType: Array.from(typeMap.entries())
      .map(([type, values]) => ({
        type,
        averageDelay: average(values),
        records: values.length,
      }))
      .sort((a, b) => b.averageDelay - a.averageDelay),
  };
}

function detectPartialMonth(records) {
  const openingDates = records.map((record) => record.openingDate).filter(Boolean);
  const sourceDates = openingDates.length
    ? openingDates
    : records.map((record) => record.exitDate).filter(Boolean);

  if (!sourceDates.length) {
    return {
      isPartial: false,
      monthKey: '',
      label: '',
      lastDate: null,
      source: openingDates.length ? 'abertura' : 'saída',
      message: '',
    };
  }

  const latestDate = sourceDates.reduce((latest, date) => (date > latest ? date : latest), sourceDates[0]);
  const monthKey = getMonthKey(latestDate);
  const lastDay = sourceDates
    .filter((date) => getMonthKey(date) === monthKey)
    .reduce((day, date) => Math.max(day, date.getDate()), 0);

  const isPartial = lastDay < 25;
  return {
    isPartial,
    monthKey,
    label: formatMonth(monthKey),
    lastDate: latestDate,
    source: openingDates.length ? 'abertura' : 'saída',
    message: isPartial
      ? `O mês de ${formatMonth(monthKey)} está parcial, pois possui dados somente até ${formatDateBR(latestDate)}.`
      : '',
  };
}

function buildBobbinAnalysis(records, bobbinKey, partialMonth, includePartialMonth) {
  const config = BOBBIN_CONFIGS[bobbinKey];
  const typeRecords = records.filter(
    (record) => getBobbinKey(record.bobbinType) === bobbinKey && record.openingMonth,
  );
  const map = new Map();

  typeRecords.forEach((record) => {
    if (!map.has(record.openingMonth)) {
      map.set(record.openingMonth, {
        monthKey: record.openingMonth,
        month: formatMonth(record.openingMonth),
        orders: 0,
        units: 0,
        bigOrders: 0,
        bigUnits: 0,
      });
    }

    const row = map.get(record.openingMonth);
    const quantity = safeQuantity(record);
    row.orders += 1;
    row.units += quantity;
    if (quantity > 50) {
      row.bigOrders += 1;
      row.bigUnits += quantity;
    }
  });

  const monthKeys = Array.from(map.keys()).sort();
  const filledMonths = monthKeys.length ? listMonthRange(monthKeys[0], monthKeys[monthKeys.length - 1]) : [];
  const monthly = filledMonths.map((monthKey) => {
    const row = map.get(monthKey) || {
      monthKey,
      month: formatMonth(monthKey),
      orders: 0,
      units: 0,
      bigOrders: 0,
      bigUnits: 0,
    };

    return {
      ...row,
      boxesEquivalent: row.units / config.unitsPerBox,
      minBoxes: ceilBoxes(row.units, config.unitsPerBox),
      cost: calculateCost(row.units, config.unitCost),
      isPartial: partialMonth.isPartial && partialMonth.monthKey === monthKey,
    };
  });

  const rowsForForecast = monthly.filter(
    (row) => includePartialMonth || !(partialMonth.isPartial && row.monthKey === partialMonth.monthKey),
  );
  const last3 = rowsForForecast.slice(-3);
  const last5 = rowsForForecast.slice(-5);
  const previous3 = rowsForForecast.slice(-6, -3);
  const avg3 = average(last3.map((row) => row.units));
  const avg5 = average(last5.map((row) => row.units));
  const maxMonth = monthly.reduce((max, row) => (row.units > max.units ? row : max), monthly[0] || {
    month: 'Não informado',
    units: 0,
  });
  const maxRecent = last5.reduce((max, row) => (row.units > max.units ? row : max), last5[0] || {
    month: 'Não informado',
    units: 0,
  });
  const last3Average = average(last3.map((row) => row.units));
  const previous3Average = average(previous3.map((row) => row.units));
  const trendDelta = previous3Average > 0 ? ((last3Average - previous3Average) / previous3Average) * 100 : 0;
  const trend = previous3.length < 2
    ? 'Dados insuficientes'
    : trendDelta > 5
      ? 'Alta'
      : trendDelta < -5
        ? 'Queda'
        : 'Estável';

  const hasForecastData = rowsForForecast.length >= 2 && last3.some((row) => row.units > 0);
  const recommendedBase = Math.max(avg3, maxRecent.units || 0);
  const recommendedUnits = recommendedBase * 1.08;
  const safeUnits = recommendedUnits * 1.12;
  const forecast = hasForecastData
    ? {
      status: 'ok',
      minimumBoxes: ceilBoxes(avg3, config.unitsPerBox),
      recommendedBoxes: ceilBoxes(recommendedUnits, config.unitsPerBox),
      safeBoxes: ceilBoxes(safeUnits, config.unitsPerBox),
      avg3,
      avg5,
      maxRecentUnits: maxRecent.units || 0,
      maxRecentMonth: maxRecent.month,
      explanation: `A previsão recomendada usa a maior referência entre a média dos últimos 3 meses completos (${formatInteger(avg3)} unidades) e o maior mês recente (${formatInteger(maxRecent.units || 0)} unidades), com margem de 8%.`,
    }
    : {
      status: 'insufficient',
      minimumBoxes: 0,
      recommendedBoxes: 0,
      safeBoxes: 0,
      avg3,
      avg5,
      maxRecentUnits: maxRecent.units || 0,
      maxRecentMonth: maxRecent.month,
      explanation: 'Dados insuficientes para uma previsão confiável.',
    };

  return {
    config,
    records: typeRecords,
    monthly,
    summary: {
      orders: typeRecords.length,
      units: typeRecords.reduce((sum, record) => sum + safeQuantity(record), 0),
      boxes: ceilBoxes(typeRecords.reduce((sum, record) => sum + safeQuantity(record), 0), config.unitsPerBox),
      cost: calculateCost(typeRecords.reduce((sum, record) => sum + safeQuantity(record), 0), config.unitCost),
      avg3,
      avg5,
      maxMonth,
      trend,
      trendDelta,
      bigOrders: typeRecords.filter((record) => safeQuantity(record) > 50).length,
      bigUnits: typeRecords
        .filter((record) => safeQuantity(record) > 50)
        .reduce((sum, record) => sum + safeQuantity(record), 0),
    },
    forecast,
  };
}

function buildLargeOrders(records) {
  const totalByMonth = new Map();
  const largeByMonth = new Map();

  records.forEach((record) => {
    if (!record.openingMonth) {
      return;
    }
    const quantity = safeQuantity(record);
    totalByMonth.set(record.openingMonth, (totalByMonth.get(record.openingMonth) || 0) + quantity);

    if (quantity <= 50) {
      return;
    }

    if (!largeByMonth.has(record.openingMonth)) {
      largeByMonth.set(record.openingMonth, {
        monthKey: record.openingMonth,
        month: formatMonth(record.openingMonth),
        orders: 0,
        units: 0,
        units16: 0,
        units30: 0,
      });
    }

    const row = largeByMonth.get(record.openingMonth);
    row.orders += 1;
    row.units += quantity;
    const key = getBobbinKey(record.bobbinType);
    if (key === '16') {
      row.units16 += quantity;
    } else if (key === '30') {
      row.units30 += quantity;
    }
  });

  const result = Array.from(largeByMonth.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((row) => ({
      ...row,
      participation: totalByMonth.get(row.monthKey) ? (row.units / totalByMonth.get(row.monthKey)) * 100 : 0,
    }));

  return result.map((row, index) => {
    const previous = result[index - 1];
    return {
      ...row,
      deltaUnits: previous ? row.units - previous.units : 0,
      deltaPercent: previous && previous.units > 0 ? ((row.units - previous.units) / previous.units) * 100 : 0,
    };
  });
}

export function enrichPurchases(purchases) {
  const expandedPurchases = purchases.flatMap((purchase) => {
    if (purchase.boxes16 === undefined && purchase.boxes30 === undefined) {
      return [purchase];
    }

    return [
      {
        ...purchase,
        id: `${purchase.id}-16`,
        type: BOBBIN_CONFIGS['16'].label,
        boxes: Number(purchase.boxes16) || 0,
      },
      {
        ...purchase,
        id: `${purchase.id}-30`,
        type: BOBBIN_CONFIGS['30'].label,
        boxes: Number(purchase.boxes30) || 0,
      },
    ];
  });

  return expandedPurchases
    .filter((purchase) => purchase.month && Number(purchase.boxes) > 0)
    .map((purchase) => {
      const config = getBobbinConfig(purchase.type);
      const boxes = Number(purchase.boxes);
      const units = boxes * config.unitsPerBox;
      const cost = calculateCost(units, config.unitCost);
      return {
        ...purchase,
        type: config.label,
        typeKey: config.key,
        boxes,
        units,
        cost,
        deliveryMonth: addMonths(purchase.month, 1),
        servedMonth: addMonths(purchase.month, 2),
        orderMonthLabel: formatMonth(purchase.month),
        deliveryMonthLabel: formatMonth(addMonths(purchase.month, 1)),
        servedMonthLabel: formatMonth(addMonths(purchase.month, 2)),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month) || a.type.localeCompare(b.type));
}

function buildCoverage(purchases, monthlyDemand, partialMonth) {
  const demandByMonthAndType = new Map();

  monthlyDemand.forEach((row) => {
    demandByMonthAndType.set(`${row.monthKey}:16`, row.units16);
    demandByMonthAndType.set(`${row.monthKey}:30`, row.units30);
  });

  return purchases.map((purchase) => {
    const config = getBobbinConfig(purchase.type);
    const demandUnits = demandByMonthAndType.get(`${purchase.servedMonth}:${purchase.typeKey}`) || 0;
    const differenceUnits = purchase.units - demandUnits;
    const differenceBoxes = differenceUnits / config.unitsPerBox;
    const consumptionCost = calculateCost(demandUnits, config.unitCost);
    const financialBalance = purchase.cost - consumptionCost;
    let status = 'Cobriu com sobra';

    if (partialMonth.isPartial && partialMonth.monthKey === purchase.servedMonth) {
      status = 'Mês ainda parcial';
    } else if (differenceUnits < 0 && differenceUnits >= demandUnits * -0.05) {
      status = 'Cobriu no limite';
    } else if (differenceUnits < demandUnits * -0.05) {
      status = 'Ficou abaixo';
    }

    return {
      ...purchase,
      demandUnits,
      differenceUnits,
      differenceBoxes,
      consumptionCost,
      financialBalance,
      status,
    };
  });
}

function buildDestinations(records) {
  const map = new Map();

  records.forEach((record) => {
    const key = `${record.destination || 'Não informado'}|${record.uf || 'Não informado'}`;
    if (!map.has(key)) {
      map.set(key, {
        destination: record.destination || 'Não informado',
        uf: record.uf || 'Não informado',
        orders: 0,
        units: 0,
        units16: 0,
        units30: 0,
        openingDates: [],
        exitDates: [],
      });
    }

    const row = map.get(key);
    const quantity = safeQuantity(record);
    row.orders += 1;
    row.units += quantity;
    if (getBobbinKey(record.bobbinType) === '16') {
      row.units16 += quantity;
    }
    if (getBobbinKey(record.bobbinType) === '30') {
      row.units30 += quantity;
    }
    if (record.openingDate) {
      row.openingDates.push(record.openingDate);
    }
    if (record.exitDate) {
      row.exitDates.push(record.exitDate);
    }
  });

  return Array.from(map.values())
    .map((row) => {
      const sortedOpening = row.openingDates.sort((a, b) => a - b);
      const sortedExit = row.exitDates.sort((a, b) => a - b);
      return {
        ...row,
        firstOpening: sortedOpening[0] || null,
        lastOpening: sortedOpening[sortedOpening.length - 1] || null,
        firstExit: sortedExit[0] || null,
        lastExit: sortedExit[sortedExit.length - 1] || null,
        averagePerOrder: row.orders ? row.units / row.orders : 0,
      };
    })
    .sort((a, b) => b.units - a.units || a.destination.localeCompare(b.destination));
}

function buildAlerts(monthlyDemand, delay, coverage, largeOrders, partialMonth) {
  const alerts = [];

  if (partialMonth.isPartial) {
    alerts.push({
      type: 'warning',
      title: 'Mês parcial',
      message: partialMonth.message,
    });
  }

  const completeDemand = monthlyDemand.filter((row) => !(partialMonth.isPartial && row.monthKey === partialMonth.monthKey));
  const latestDemand = completeDemand[completeDemand.length - 1];
  const previousDemand = completeDemand.slice(-4, -1);
  const previousAverage = average(previousDemand.map((row) => row.units));
  if (latestDemand && previousAverage > 0 && latestDemand.units > previousAverage * 1.15) {
    alerts.push({
      type: 'warning',
      title: 'Alta demanda',
      message: `A demanda de ${latestDemand.month} foi de ${formatInteger(latestDemand.units)} unidades, acima da média recente de ${formatInteger(previousAverage)} unidades.`,
    });
  }

  const latestDelay = delay.monthlyAverage[delay.monthlyAverage.length - 1];
  const previousDelayAverage = average(delay.monthlyAverage.slice(-4, -1).map((row) => row.averageDelay));
  if (latestDelay && previousDelayAverage > 0 && latestDelay.averageDelay > previousDelayAverage * 1.3) {
    alerts.push({
      type: 'danger',
      title: 'Mês com possível atraso',
      message: `O prazo médio em ${latestDelay.month} foi de ${formatDecimal(latestDelay.averageDelay)} dias, acima da média anterior de ${formatDecimal(previousDelayAverage)} dias.`,
    });
  }

  const uncovered = coverage.filter((row) => row.status === 'Ficou abaixo');
  if (uncovered.length) {
    alerts.push({
      type: 'danger',
      title: 'Compra abaixo da demanda',
      message: `${uncovered.length} compra(s) planejada(s) não cobriram a demanda do mês atendido.`,
    });
  }

  const latestLarge = largeOrders[largeOrders.length - 1];
  const previousLarge = largeOrders[largeOrders.length - 2];
  if (latestLarge && previousLarge && latestLarge.participation > previousLarge.participation * 1.25 && latestLarge.participation >= 20) {
    alerts.push({
      type: 'warning',
      title: 'Atenção: pedidos acima de 50 unidades',
      message: `A participação dos pedidos grandes chegou a ${formatPercent(latestLarge.participation)} em ${latestLarge.month}.`,
    });
  }

  return alerts;
}

export function buildAnalytics(records, purchases = [], includePartialMonth = false, options = {}) {
  const {
    referenceDateField = 'openingMonth',
    referenceMonth = '',
  } = options;
  const monthlyDemand = buildMonthlyDemand(records);
  const monthlyShipping = buildMonthlyShipping(records);
  const partialMonth = detectPartialMonth(records);
  const delay = buildDelayAnalysis(records, referenceDateField);
  const largeOrders = buildLargeOrders(records);
  const enrichedPurchases = enrichPurchases(purchases);
  const coverage = buildCoverage(enrichedPurchases, monthlyDemand, partialMonth);

  return {
    records,
    summary: buildSummary(records),
    monthlyDemand,
    monthlyShipping,
    comparison: buildOpeningShippingComparison(records, referenceMonth),
    delay,
    partialMonth,
    bobbin16: buildBobbinAnalysis(records, '16', partialMonth, includePartialMonth),
    bobbin30: buildBobbinAnalysis(records, '30', partialMonth, includePartialMonth),
    largeOrders,
    purchases: enrichedPurchases,
    coverage,
    destinations: buildDestinations(records),
    alerts: buildAlerts(monthlyDemand, delay, coverage, largeOrders, partialMonth),
  };
}
