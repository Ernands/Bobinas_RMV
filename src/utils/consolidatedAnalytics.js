import { BOBBIN_CONFIGS, formatInteger } from './calculations';
import {
  CONSOLIDATED_MONTHS,
  TRANSACTION_RANGES,
  getConsolidatedMonthLabel,
} from './consolidatedConstants';
import { normalizeText } from './normalization';

export const EMPTY_CONSOLIDATED_FILTERS = {
  year: '',
  month: '',
  search: '',
  uf: '',
  status: '',
  bobbinType: 'all',
  minTransactions: '',
  maxTransactions: '',
  transactionRange: '',
  onlyDivergences: false,
  onlyWithoutCorreios: false,
  onlyCorreiosLower: false,
  onlyCorreiosHigher: false,
  onlyCorreiosCost: false,
  onlyPositiveTotalCost: false,
};

const BOBBIN_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '16', label: '56 MM X 16 M' },
  { value: '30', label: '56 MM X 30 M' },
];

const STATUS_ORDER = [
  'Sem envio Correios',
  'Correios menor que solicitação',
  'Correios maior que solicitação',
  'OK',
  'Sem movimentação',
];

function sumBy(rows, selector) {
  return rows.reduce((sum, row) => sum + selector(row), 0);
}

function average(total, count) {
  return count ? total / count : 0;
}

function uniqueSorted(records, field) {
  return Array.from(new Set(records.map((record) => record[field]).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function getConsolidatedYearOptions(records) {
  const years = uniqueSorted(records, 'year');
  return years.length ? years : [String(new Date().getFullYear())];
}

export function resolveDefaultConsolidatedYear(records) {
  const years = getConsolidatedYearOptions(records);
  return years[years.length - 1] || String(new Date().getFullYear());
}

function getMonthValue(record, monthKey) {
  return Number(record.months?.[monthKey]) || 0;
}

function getMonthTotal(record) {
  return CONSOLIDATED_MONTHS.reduce((total, month) => total + getMonthValue(record, month.key), 0);
}

function getMonthShare(record, monthKey) {
  const total = getMonthTotal(record);
  return total > 0 ? getMonthValue(record, monthKey) / total : 0;
}

function getRequestedValue(record, filters) {
  if (filters.month) {
    return getMonthValue(record, filters.month);
  }
  if (filters.bobbinType === '16') {
    return record.boxes16;
  }
  if (filters.bobbinType === '30') {
    return record.boxes30;
  }
  return record.requested;
}

function equivalentBoxes(units, bobbinType) {
  const unitsPerBox = BOBBIN_CONFIGS[bobbinType]?.unitsPerBox;
  return unitsPerBox ? (Number(units) || 0) / unitsPerBox : 0;
}

function getFilteredUnits(record, field, filters) {
  const share = filters.month ? getMonthShare(record, filters.month) : 1;
  return (Number(record[field]) || 0) * share;
}

function getBoxesValue(record, filters) {
  if (filters.bobbinType === '16') {
    return equivalentBoxes(getFilteredUnits(record, 'units16', filters), '16');
  }
  if (filters.bobbinType === '30') {
    return equivalentBoxes(getFilteredUnits(record, 'units30', filters), '30');
  }
  return (
    equivalentBoxes(getFilteredUnits(record, 'units16', filters), '16')
    + equivalentBoxes(getFilteredUnits(record, 'units30', filters), '30')
  );
}

function getBobbinCostValue(record, filters) {
  if (filters.bobbinType === '16') {
    return record.cost16;
  }
  if (filters.bobbinType === '30') {
    return record.cost30;
  }
  return record.bobbinCost;
}

function hasSelectedBobbin(record, bobbinType) {
  if (bobbinType === '16') {
    return record.units16 > 0 || record.boxes16 > 0 || record.cost16 > 0;
  }
  if (bobbinType === '30') {
    return record.units30 > 0 || record.boxes30 > 0 || record.cost30 > 0;
  }
  return true;
}

function applyConsolidatedFilters(records, filters, selectedYear) {
  const search = normalizeText(filters.search);
  const minTransactions = filters.minTransactions === '' ? null : Number(filters.minTransactions);
  const maxTransactions = filters.maxTransactions === '' ? null : Number(filters.maxTransactions);

  return records.filter((record) => {
    if (selectedYear && record.year && String(record.year) !== String(selectedYear)) {
      return false;
    }
    if (filters.month && getMonthValue(record, filters.month) <= 0) {
      return false;
    }
    if (search) {
      const haystack = normalizeText(`${record.destination} ${record.uf} ${record.status}`);
      if (!haystack.includes(search)) {
        return false;
      }
    }
    if (filters.uf && record.uf !== filters.uf) {
      return false;
    }
    if (filters.status && record.status !== filters.status) {
      return false;
    }
    if (filters.bobbinType !== 'all' && !hasSelectedBobbin(record, filters.bobbinType)) {
      return false;
    }
    if (Number.isFinite(minTransactions) && record.transactions < minTransactions) {
      return false;
    }
    if (Number.isFinite(maxTransactions) && record.transactions > maxTransactions) {
      return false;
    }
    if (filters.transactionRange && record.transactionRange !== filters.transactionRange) {
      return false;
    }
    if (filters.onlyDivergences && record.difference === 0) {
      return false;
    }
    if (filters.onlyWithoutCorreios && record.status !== 'Sem envio Correios') {
      return false;
    }
    if (filters.onlyCorreiosLower && record.status !== 'Correios menor que solicitação') {
      return false;
    }
    if (filters.onlyCorreiosHigher && record.status !== 'Correios maior que solicitação') {
      return false;
    }
    if (filters.onlyCorreiosCost && record.correiosCost <= 0) {
      return false;
    }
    if (filters.onlyPositiveTotalCost && record.operationCost <= 0) {
      return false;
    }
    return true;
  });
}

function createOptions(records) {
  return {
    years: getConsolidatedYearOptions(records),
    months: CONSOLIDATED_MONTHS.map((month) => ({
      value: month.key,
      label: month.label,
    })),
    ufs: uniqueSorted(records, 'uf'),
    statuses: STATUS_ORDER.filter((status) => records.some((record) => record.status === status)),
    bobbinTypes: BOBBIN_TYPE_OPTIONS,
    transactionRanges: TRANSACTION_RANGES.map((range) => ({
      value: range.key,
      label: range.label,
    })),
  };
}

function buildSummary(records, filters) {
  const requested = sumBy(records, (record) => getRequestedValue(record, filters));
  const correios = sumBy(records, (record) => record.correios);
  const difference = sumBy(records, (record) => record.difference);
  const transactions = sumBy(records, (record) => record.transactions);
  const boxes = sumBy(records, (record) => getBoxesValue(record, filters));
  const bobbinCost = sumBy(records, (record) => getBobbinCostValue(record, filters));
  const correiosCost = sumBy(records, (record) => record.correiosCost);
  const operationCost = sumBy(records, (record) => record.operationCost);
  const divergenceRows = records.filter((record) => record.difference !== 0);
  const withoutCorreiosRows = records.filter((record) => record.status === 'Sem envio Correios');

  return {
    destinations: records.length,
    requested,
    correios,
    difference,
    boxes,
    transactions,
    bobbinCost,
    correiosCost,
    operationCost,
    divergenceDestinations: divergenceRows.length,
    withoutCorreiosDestinations: withoutCorreiosRows.length,
    averageTransactions: average(transactions, records.length),
  };
}

function buildMonthly(records) {
  return CONSOLIDATED_MONTHS.map((month) => {
    const requested = sumBy(records, (record) => getMonthValue(record, month.key));
    const shipments = sumBy(records, (record) => record.correios * getMonthShare(record, month.key));
    const boxes16 = sumBy(records, (record) => equivalentBoxes(record.units16 * getMonthShare(record, month.key), '16'));
    const boxes30 = sumBy(records, (record) => equivalentBoxes(record.units30 * getMonthShare(record, month.key), '30'));
    const bobbinCost = sumBy(records, (record) => record.bobbinCost * getMonthShare(record, month.key));
    const correiosCost = sumBy(records, (record) => record.correiosCost * getMonthShare(record, month.key));
    const operationCost = sumBy(records, (record) => record.operationCost * getMonthShare(record, month.key));

    return {
      id: month.key,
      monthKey: month.key,
      month: month.label,
      shortMonth: month.shortLabel,
      requested,
      shipments,
      boxes16,
      boxes30,
      bobbinCost,
      correiosCost,
      operationCost,
      destinations: records.filter((record) => getMonthValue(record, month.key) > 0).length,
    };
  });
}

function buildTypeComparison(records, filters) {
  const units16 = sumBy(records, (record) => getFilteredUnits(record, 'units16', filters));
  const units30 = sumBy(records, (record) => getFilteredUnits(record, 'units30', filters));

  return [
    {
      id: '16',
      type: '56 MM X 16 M',
      requests: sumBy(records, (record) => record.boxes16),
      boxes: equivalentBoxes(units16, '16'),
      units: units16,
      cost: sumBy(records, (record) => record.cost16),
    },
    {
      id: '30',
      type: '56 MM X 30 M',
      requests: sumBy(records, (record) => record.boxes30),
      boxes: equivalentBoxes(units30, '30'),
      units: units30,
      cost: sumBy(records, (record) => record.cost30),
    },
  ];
}

function buildUfSummary(records, filters) {
  const map = new Map();

  records.forEach((record) => {
    const key = record.uf || 'Não informado';
    const current = map.get(key) || {
      id: key,
      uf: key,
      destinations: 0,
      transactions: 0,
      requested: 0,
      correios: 0,
      difference: 0,
      boxes: 0,
      boxes16: 0,
      boxes30: 0,
      bobbinCost: 0,
      correiosCost: 0,
      operationCost: 0,
    };

    current.destinations += 1;
    current.transactions += record.transactions;
    current.requested += getRequestedValue(record, filters);
    current.correios += record.correios;
    current.difference += record.difference;
    current.boxes += getBoxesValue(record, filters);
    current.boxes16 += equivalentBoxes(getFilteredUnits(record, 'units16', filters), '16');
    current.boxes30 += equivalentBoxes(getFilteredUnits(record, 'units30', filters), '30');
    current.bobbinCost += getBobbinCostValue(record, filters);
    current.correiosCost += record.correiosCost;
    current.operationCost += record.operationCost;
    map.set(key, current);
  });

  return Array.from(map.values())
    .sort((a, b) => b.requested - a.requested || b.operationCost - a.operationCost || a.uf.localeCompare(b.uf, 'pt-BR'));
}

function buildRankings(records, filters) {
  const rankingRows = records.map((record) => ({
    ...record,
    requestedView: getRequestedValue(record, filters),
    boxesView: getBoxesValue(record, filters),
    bobbinCostView: getBobbinCostValue(record, filters),
  }));

  return {
    byRequested: [...rankingRows]
      .sort((a, b) => b.requestedView - a.requestedView || b.transactions - a.transactions)
      .slice(0, 12),
    byCost: [...rankingRows]
      .sort((a, b) => b.operationCost - a.operationCost || b.bobbinCostView - a.bobbinCostView)
      .slice(0, 12),
    byDifference: [...rankingRows]
      .filter((record) => record.difference !== 0)
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 12),
    byTransactions: [...rankingRows]
      .sort((a, b) => b.transactions - a.transactions)
      .slice(0, 12),
  };
}

function buildRangeAnalysis(records, filters) {
  const map = new Map(TRANSACTION_RANGES.map((range) => [range.key, {
    id: range.key,
    range: range.label,
    destinations: 0,
    transactions: 0,
    requested: 0,
    correios: 0,
    difference: 0,
    boxes16: 0,
    boxes30: 0,
    bobbinCost: 0,
    correiosCost: 0,
    operationCost: 0,
  }]));

  records.forEach((record) => {
    const current = map.get(record.transactionRange);
    if (!current) {
      return;
    }

    current.destinations += 1;
    current.transactions += record.transactions;
    current.requested += getRequestedValue(record, filters);
    current.correios += record.correios;
    current.difference += record.difference;
    current.boxes16 += record.boxes16;
    current.boxes30 += record.boxes30;
    current.bobbinCost += record.bobbinCost;
    current.correiosCost += record.correiosCost;
    current.operationCost += record.operationCost;
  });

  return Array.from(map.values());
}

function buildStatusSummary(records, filters) {
  const map = new Map(STATUS_ORDER.map((status) => [status, {
    id: status,
    status,
    destinations: 0,
    requested: 0,
    correios: 0,
    difference: 0,
    operationCost: 0,
  }]));

  records.forEach((record) => {
    const current = map.get(record.status) || {
      id: record.status,
      status: record.status,
      destinations: 0,
      requested: 0,
      correios: 0,
      difference: 0,
      operationCost: 0,
    };

    current.destinations += 1;
    current.requested += getRequestedValue(record, filters);
    current.correios += record.correios;
    current.difference += record.difference;
    current.operationCost += record.operationCost;
    map.set(record.status, current);
  });

  return Array.from(map.values()).filter((row) => row.destinations > 0);
}

function buildAlerts(records, summary, statusSummary, selectedMonthLabel) {
  const alerts = [];
  const withoutCorreios = statusSummary.find((row) => row.status === 'Sem envio Correios');
  const lower = statusSummary.find((row) => row.status === 'Correios menor que solicitação');
  const higher = statusSummary.find((row) => row.status === 'Correios maior que solicitação');
  const topCost = [...records].sort((a, b) => b.operationCost - a.operationCost)[0];

  if (!records.length) {
    return [{
      type: 'info',
      title: 'Sem registros no recorte',
      message: 'Ajuste os filtros ou carregue a base Consolidado Bobinas para visualizar a análise.',
    }];
  }

  if (withoutCorreios?.destinations) {
    alerts.push({
      type: 'warning',
      title: 'Destinos sem envio Correios',
      message: `${formatInteger(withoutCorreios.destinations)} destino(s) possuem solicitação de bobinas, mas não possuem envio Correios registrado.`,
    });
  }

  if (lower?.destinations) {
    alerts.push({
      type: 'danger',
      title: 'Correios menor que solicitação',
      message: `${formatInteger(lower.destinations)} destino(s) estão com envio Correios menor que a solicitação consolidada.`,
    });
  }

  if (higher?.destinations) {
    alerts.push({
      type: 'warning',
      title: 'Correios maior que solicitação',
      message: `${formatInteger(higher.destinations)} destino(s) estão com envio Correios maior que a solicitação consolidada.`,
    });
  }

  if (summary.operationCost > 0 && topCost) {
    alerts.push({
      type: 'info',
      title: 'Maior custo operacional',
      message: `${topCost.destination} concentra o maior custo total do recorte ${selectedMonthLabel ? `(${selectedMonthLabel})` : ''}.`,
    });
  }

  return alerts;
}

export function buildConsolidatedAnalytics(records = [], filters = EMPTY_CONSOLIDATED_FILTERS) {
  const options = createOptions(records);
  const selectedYear = filters.year || resolveDefaultConsolidatedYear(records);
  const selectedMonthLabel = filters.month ? getConsolidatedMonthLabel(filters.month) : '';
  const normalizedFilters = {
    ...EMPTY_CONSOLIDATED_FILTERS,
    ...filters,
    bobbinType: filters.bobbinType || 'all',
  };
  const filteredRecords = applyConsolidatedFilters(records, normalizedFilters, selectedYear);
  const summary = buildSummary(filteredRecords, normalizedFilters);
  const monthly = buildMonthly(filteredRecords);
  const typeComparison = buildTypeComparison(filteredRecords, normalizedFilters);
  const ufSummary = buildUfSummary(filteredRecords, normalizedFilters);
  const rankings = buildRankings(filteredRecords, normalizedFilters);
  const rangeAnalysis = buildRangeAnalysis(filteredRecords, normalizedFilters);
  const statusSummary = buildStatusSummary(filteredRecords, normalizedFilters);

  return {
    records,
    filteredRecords,
    filters: normalizedFilters,
    options,
    selectedYear,
    selectedMonthLabel,
    summary,
    monthly,
    typeComparison,
    ufSummary,
    rankings,
    rangeAnalysis,
    statusSummary,
    alerts: buildAlerts(filteredRecords, summary, statusSummary, selectedMonthLabel),
  };
}
