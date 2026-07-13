import { CONSOLIDATED_MONTHS } from './consolidatedConstants';
import { formatDateBR, parseDate } from './dateUtils';
import { normalizeText } from './normalization';
import { extractSubstitutionCallNumber } from './substitutionNormalization';

export const SUBSTITUTION_EQUIPMENT_COLUMNS = [
  'POS VERIFONE VX 520 ETH',
  'POS VERIFONE VX 520',
  'SMARTPOS',
  'LCB POS MINISCAN CHECK II - CM-160-R',
  'LCB PISTOLA JI-200',
];

export const EMPTY_SUBSTITUTION_FILTERS = {
  year: '',
  month: '',
  uf: '',
  error: '',
  equipment: '',
  query: '',
  dateFrom: '',
  dateTo: '',
};

function monthKeyToMonthConfig(monthKey) {
  const monthIndex = Number(String(monthKey || '').slice(5, 7)) - 1;
  return CONSOLIDATED_MONTHS[monthIndex] || null;
}

function makeMonthValues(factory = () => 0) {
  return Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [month.key, factory(month)]));
}

function sumRows(rows, selector) {
  return rows.reduce((sum, row) => sum + (Number(selector(row)) || 0), 0);
}

function canonical(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function getCorreiosCallKeys(record) {
  return [
    record.callNumber,
    record.chamadoRaw,
    record.callType,
    record.original?.Chamado,
    record.original?.chamado,
  ]
    .map(extractSubstitutionCallNumber)
    .filter(Boolean);
}

function buildCorreiosCallIndex(records = []) {
  const map = new Map();

  records.forEach((record) => {
    const keys = [...new Set(getCorreiosCallKeys(record))];
    keys.forEach((key) => {
      const current = map.get(key) || {
        cost: 0,
        weight: 0,
        shipments: 0,
        records: [],
      };

      current.cost += Number(record.serviceValue) || 0;
      current.weight += Number(record.weightKg) || 0;
      current.shipments += 1;
      current.records.push(record);
      map.set(key, current);
    });
  });

  return map;
}

function enrichRecords(records, correiosRecords) {
  const correiosByCall = buildCorreiosCallIndex(correiosRecords);

  return records.map((record) => {
    const correios = record.callNumber ? correiosByCall.get(record.callNumber) : null;
    return {
      ...record,
      shipmentCost: correios?.cost || 0,
      shipmentWeight: correios?.weight || 0,
      shipmentCount: correios?.shipments || 0,
      matchedCorreios: Boolean(correios),
      dateLabel: formatDateBR(record.date),
    };
  });
}

export function getSubstitutionYearOptions(records = []) {
  return Array.from(new Set(
    records
      .map((record) => record.monthKey?.slice(0, 4))
      .filter(Boolean),
  )).sort((a, b) => b.localeCompare(a));
}

export function resolveDefaultSubstitutionYear(records = []) {
  return getSubstitutionYearOptions(records)[0] || String(new Date().getFullYear());
}

function applyFilters(records, filters) {
  const query = canonical(filters.query);
  const from = filters.dateFrom ? parseDate(filters.dateFrom) : null;
  const to = filters.dateTo ? parseDate(filters.dateTo) : null;

  return records.filter((record) => {
    if (filters.year && record.monthKey?.slice(0, 4) !== String(filters.year)) {
      return false;
    }
    if (filters.month && record.monthKey?.slice(5, 7) !== String(filters.month).padStart(2, '0')) {
      return false;
    }
    if (filters.uf && record.uf !== filters.uf) {
      return false;
    }
    if (filters.error && record.error !== filters.error) {
      return false;
    }
    if (filters.equipment && record.equipment !== filters.equipment) {
      return false;
    }
    if (from && (!record.date || record.date < from)) {
      return false;
    }
    if (to && (!record.date || record.date > to)) {
      return false;
    }
    if (query) {
      const searchable = [
        record.destination,
        record.coban,
        record.callNumber,
        record.callCode,
        record.error,
        record.uf,
      ].map(canonical).join(' ');
      if (!searchable.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

function buildMonthlyShipping(rows) {
  const base = makeMonthValues(() => ({ count: 0, cost: 0 }));

  rows.forEach((record) => {
    const month = monthKeyToMonthConfig(record.monthKey);
    if (!month) {
      return;
    }
    base[month.key].count += 1;
    base[month.key].cost += record.shipmentCost;
  });

  return {
    id: 'shipping-costs',
    months: base,
    totalCount: sumRows(Object.values(base), (row) => row.count),
    totalCost: sumRows(Object.values(base), (row) => row.cost),
  };
}

function buildRowsByMonth(rows, groupKey, labelKey) {
  const map = new Map();

  rows.forEach((record) => {
    const label = record[groupKey] || 'Não informado';
    const current = map.get(label) || {
      id: label,
      [labelKey]: label,
      months: makeMonthValues(() => 0),
      total: 0,
    };
    const month = monthKeyToMonthConfig(record.monthKey);
    if (month) {
      current.months[month.key] += 1;
      current.total += 1;
    }
    map.set(label, current);
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total || String(a[labelKey]).localeCompare(String(b[labelKey]), 'pt-BR'));
}

function buildErrorEquipment(rows) {
  const map = new Map();

  rows.forEach((record) => {
    const error = record.error || 'Não informado';
    const current = map.get(error) || {
      id: error,
      error,
      equipment: Object.fromEntries(SUBSTITUTION_EQUIPMENT_COLUMNS.map((name) => [name, 0])),
      cost: 0,
      total: 0,
    };
    const matchedEquipment = SUBSTITUTION_EQUIPMENT_COLUMNS.find((name) => canonical(record.equipment) === canonical(name));
    if (matchedEquipment) {
      current.equipment[matchedEquipment] += 1;
    }
    current.cost += record.shipmentCost;
    current.total += 1;
    map.set(error, current);
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total || a.error.localeCompare(b.error, 'pt-BR'));
}

function buildUfRows(rows) {
  const map = new Map();

  rows.forEach((record) => {
    const uf = record.uf || 'Não informado';
    const current = map.get(uf) || {
      id: uf,
      uf,
      months: makeMonthValues(() => ({ count: 0, cost: 0 })),
      totalCount: 0,
      totalCost: 0,
    };
    const month = monthKeyToMonthConfig(record.monthKey);
    if (month) {
      current.months[month.key].count += 1;
      current.months[month.key].cost += record.shipmentCost;
      current.totalCount += 1;
      current.totalCost += record.shipmentCost;
    }
    map.set(uf, current);
  });

  return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount || a.uf.localeCompare(b.uf, 'pt-BR'));
}

function buildOptions(records = [], selectedYear) {
  const yearRecords = selectedYear
    ? records.filter((record) => record.monthKey?.startsWith(`${selectedYear}-`))
    : records;

  return {
    years: getSubstitutionYearOptions(records),
    ufs: Array.from(new Set(yearRecords.map((record) => record.uf).filter(Boolean))).sort(),
    errors: Array.from(new Set(yearRecords.map((record) => record.error).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    equipments: Array.from(new Set(yearRecords.map((record) => record.equipment).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
}

export function buildSubstitutionAnalytics(records = [], correiosRecords = [], filters = EMPTY_SUBSTITUTION_FILTERS) {
  const selectedYear = filters.year || resolveDefaultSubstitutionYear(records);
  const enrichedRecords = enrichRecords(records, correiosRecords);
  const effectiveFilters = {
    ...EMPTY_SUBSTITUTION_FILTERS,
    ...filters,
    year: selectedYear,
  };
  const filteredRecords = applyFilters(enrichedRecords, effectiveFilters);
  const monthlyShipping = buildMonthlyShipping(filteredRecords);
  const materialRows = buildRowsByMonth(filteredRecords, 'equipment', 'material');
  const errorRows = buildRowsByMonth(filteredRecords, 'error', 'error');
  const errorEquipmentRows = buildErrorEquipment(filteredRecords);
  const ufRows = buildUfRows(filteredRecords);
  const topErrors = errorRows.slice(0, 5);

  return {
    selectedYear,
    filters: effectiveFilters,
    filteredRecords,
    options: buildOptions(records, selectedYear),
    summary: {
      shipments: filteredRecords.length,
      totalWeight: sumRows(filteredRecords, (record) => record.shipmentWeight),
      totalCost: sumRows(filteredRecords, (record) => record.shipmentCost),
      unmatchedCalls: filteredRecords.filter((record) => !record.matchedCorreios).length,
    },
    monthlyShipping,
    materialRows,
    errorRows,
    topErrors,
    errorEquipmentRows,
    ufRows,
  };
}
