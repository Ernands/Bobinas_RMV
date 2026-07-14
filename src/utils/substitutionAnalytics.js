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

function isKnownValue(value) {
  const text = String(value ?? '').trim();
  return text && text !== '-' && canonical(text) !== canonical('Não informado');
}

function splitEquipmentParts(value) {
  const text = String(value ?? '').trim();
  if (!isKnownValue(text)) {
    return ['Não informado'];
  }

  return text
    .split(/\s*\+\s*/g)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function getEquipmentParts(record) {
  return record.equipmentParts?.length ? record.equipmentParts : splitEquipmentParts(record.equipment);
}

function classifyEquipmentPart(part) {
  const key = canonical(part);

  if (!key || key === canonical('Não informado')) {
    return 'outros';
  }
  if (key.includes('smartpos')) {
    return 'smartpos';
  }
  if (key.includes('lcb') || key.includes('miniscan') || key.includes('ji200')) {
    return 'lcb';
  }
  if (key.includes('pos') || key.includes('verifone') || key.includes('ingenico')) {
    return 'pos';
  }

  return 'outros';
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
        pac: 0,
        pacCost: 0,
        sedex: 0,
        sedexCost: 0,
        reversos: 0,
        reverseCost: 0,
        records: [],
      };

      current.cost += Number(record.serviceValue) || 0;
      current.weight += Number(record.weightKg) || 0;
      current.shipments += 1;
      if (record.isPac) {
        current.pac += 1;
        current.pacCost += Number(record.serviceValue) || 0;
      }
      if (record.isSedex) {
        current.sedex += 1;
        current.sedexCost += Number(record.serviceValue) || 0;
      }
      if (record.isReverse) {
        current.reversos += 1;
        current.reverseCost += Number(record.serviceValue) || 0;
      }
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
      equipmentParts: splitEquipmentParts(record.equipment),
      shipmentCost: correios?.cost || 0,
      shipmentWeight: correios?.weight || 0,
      shipmentCount: correios?.shipments || 0,
      shipmentPac: correios?.pac || 0,
      shipmentPacCost: correios?.pacCost || 0,
      shipmentSedex: correios?.sedex || 0,
      shipmentSedexCost: correios?.sedexCost || 0,
      shipmentReversos: correios?.reversos || 0,
      shipmentReverseCost: correios?.reverseCost || 0,
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
      const selectedEquipment = canonical(filters.equipment);
      const equipmentMatches = getEquipmentParts(record).some((part) => canonical(part) === selectedEquipment);
      if (!equipmentMatches && canonical(record.equipment) !== selectedEquipment) {
        return false;
      }
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

function buildShipmentGroups(rows) {
  const map = new Map();

  rows.forEach((record) => {
    const key = record.callNumber ? `call:${record.callNumber}` : `row:${record.id}`;
    const current = map.get(key) || {
      id: key,
      callNumber: record.callNumber,
      records: [],
      destination: record.destination,
      coban: record.coban,
      uf: record.uf,
      monthKey: record.monthKey,
      shipmentCost: record.shipmentCost,
      shipmentWeight: record.shipmentWeight,
      shipmentCount: 1,
      shipmentPac: record.shipmentPac,
      shipmentPacCost: record.shipmentPacCost,
      shipmentSedex: record.shipmentSedex,
      shipmentSedexCost: record.shipmentSedexCost,
      shipmentReversos: record.shipmentReversos,
      shipmentReverseCost: record.shipmentReverseCost,
      matchedCorreios: record.matchedCorreios,
      equipmentParts: [],
    };

    current.records.push(record);
    current.equipmentParts.push(...getEquipmentParts(record));
    if (!current.monthKey && record.monthKey) {
      current.monthKey = record.monthKey;
    }
    if (!isKnownValue(current.destination) && isKnownValue(record.destination)) {
      current.destination = record.destination;
    }
    if (!isKnownValue(current.coban) && isKnownValue(record.coban)) {
      current.coban = record.coban;
    }
    if (!isKnownValue(current.uf) && isKnownValue(record.uf)) {
      current.uf = record.uf;
    }
    map.set(key, current);
  });

  return Array.from(map.values()).map((group) => ({
    ...group,
    equipmentParts: group.equipmentParts.length ? group.equipmentParts : ['Não informado'],
  }));
}

function markUniqueShipmentCosts(rows) {
  const seen = new Set();

  return rows.map((record) => {
    const key = record.callNumber ? `call:${record.callNumber}` : `row:${record.id}`;
    const isFirstOccurrence = !seen.has(key);
    seen.add(key);
    return {
      ...record,
      displayShipmentCost: isFirstOccurrence ? record.shipmentCost : 0,
      displayShipmentWeight: isFirstOccurrence ? record.shipmentWeight : 0,
      isFirstShipmentOccurrence: isFirstOccurrence,
    };
  });
}

function buildMonthlyShipping(groups) {
  const base = makeMonthValues(() => ({
    count: 0,
    cost: 0,
    pac: 0,
    pacCost: 0,
    sedex: 0,
    sedexCost: 0,
  }));

  groups.forEach((group) => {
    const month = monthKeyToMonthConfig(group.monthKey);
    if (!month) {
      return;
    }
    base[month.key].count += 1;
    base[month.key].cost += group.shipmentCost;
    base[month.key].pac += group.shipmentPac;
    base[month.key].pacCost += group.shipmentPacCost;
    base[month.key].sedex += group.shipmentSedex;
    base[month.key].sedexCost += group.shipmentSedexCost;
  });

  return {
    id: 'shipping-costs',
    months: base,
    totalCount: sumRows(Object.values(base), (row) => row.count),
    totalCost: sumRows(Object.values(base), (row) => row.cost),
    totalPac: sumRows(Object.values(base), (row) => row.pac),
    totalPacCost: sumRows(Object.values(base), (row) => row.pacCost),
    totalSedex: sumRows(Object.values(base), (row) => row.sedex),
    totalSedexCost: sumRows(Object.values(base), (row) => row.sedexCost),
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

function buildMaterialRows(rows) {
  const map = new Map();

  rows.forEach((record) => {
    getEquipmentParts(record).forEach((part) => {
      const label = part || 'Não informado';
      const current = map.get(label) || {
        id: label,
        material: label,
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
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total || String(a.material).localeCompare(String(b.material), 'pt-BR'));
}

function buildErrorEquipment(groups) {
  const map = new Map();

  groups.forEach((group) => {
    const errors = Array.from(new Set(group.records.map((record) => record.error || 'Não informado')));
    errors.forEach((error) => {
      const current = map.get(error) || {
        id: error,
        error,
        equipment: Object.fromEntries(SUBSTITUTION_EQUIPMENT_COLUMNS.map((name) => [name, 0])),
        cost: 0,
        total: 0,
      };
      group.records
        .filter((record) => (record.error || 'Não informado') === error)
        .forEach((record) => {
          getEquipmentParts(record).forEach((part) => {
            const matchedEquipment = SUBSTITUTION_EQUIPMENT_COLUMNS.find((name) => canonical(part) === canonical(name));
            if (matchedEquipment) {
              current.equipment[matchedEquipment] += 1;
            }
          });
        });
      current.cost += group.shipmentCost;
      current.total += 1;
      map.set(error, current);
    });
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total || a.error.localeCompare(b.error, 'pt-BR'));
}

function buildUfRows(groups) {
  const map = new Map();

  groups.forEach((group) => {
    const uf = group.uf || 'Não informado';
    const current = map.get(uf) || {
      id: uf,
      uf,
      months: makeMonthValues(() => ({ count: 0, cost: 0 })),
      totalCount: 0,
      totalCost: 0,
    };
    const month = monthKeyToMonthConfig(group.monthKey);
    if (month) {
      current.months[month.key].count += 1;
      current.months[month.key].cost += group.shipmentCost;
      current.totalCount += 1;
      current.totalCost += group.shipmentCost;
    }
    map.set(uf, current);
  });

  return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount || a.uf.localeCompare(b.uf, 'pt-BR'));
}

function buildTopDestinations(groups) {
  const map = new Map();

  groups.forEach((group) => {
    const destination = isKnownValue(group.destination) ? group.destination : group.coban || 'Não informado';
    const key = canonical(destination) || destination;
    const current = map.get(key) || {
      id: key,
      destination,
      cobans: new Set(),
      shipments: 0,
      cost: 0,
      pos: 0,
      smartpos: 0,
      lcb: 0,
      outros: 0,
    };

    if (isKnownValue(group.coban)) {
      current.cobans.add(group.coban);
    }

    current.shipments += 1;
    current.cost += group.shipmentCost;
    group.equipmentParts.forEach((part) => {
      const category = classifyEquipmentPart(part);
      current[category] += 1;
    });
    map.set(key, current);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      cobansText: row.cobans.size ? Array.from(row.cobans).sort().join(', ') : 'Não informado',
      cobanCount: row.cobans.size,
    }))
    .sort((a, b) => b.shipments - a.shipments || b.cost - a.cost || a.destination.localeCompare(b.destination, 'pt-BR'))
    .slice(0, 20);
}

function buildOptions(records = [], selectedYear) {
  const yearRecords = selectedYear
    ? records.filter((record) => record.monthKey?.startsWith(`${selectedYear}-`))
    : records;

  return {
    years: getSubstitutionYearOptions(records),
    ufs: Array.from(new Set(yearRecords.map((record) => record.uf).filter(Boolean))).sort(),
    errors: Array.from(new Set(yearRecords.map((record) => record.error).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    equipments: Array.from(new Set(yearRecords.flatMap((record) => splitEquipmentParts(record.equipment)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
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
  const displayRecords = markUniqueShipmentCosts(filteredRecords);
  const shipmentGroups = buildShipmentGroups(filteredRecords);
  const monthlyShipping = buildMonthlyShipping(shipmentGroups);
  const materialRows = buildMaterialRows(filteredRecords);
  const errorRows = buildRowsByMonth(filteredRecords, 'error', 'error');
  const errorEquipmentRows = buildErrorEquipment(shipmentGroups);
  const ufRows = buildUfRows(shipmentGroups);
  const topDestinations = buildTopDestinations(shipmentGroups);
  const topErrors = errorRows.slice(0, 5);

  return {
    selectedYear,
    filters: effectiveFilters,
    filteredRecords: displayRecords,
    options: buildOptions(records, selectedYear),
    summary: {
      shipments: shipmentGroups.length,
      uniqueDestinations: new Set(filteredRecords.map((record) => record.destination).filter(isKnownValue).map(canonical)).size,
      totalWeight: sumRows(shipmentGroups, (group) => group.shipmentWeight),
      totalCost: sumRows(shipmentGroups, (group) => group.shipmentCost),
      unmatchedCalls: shipmentGroups.filter((group) => !group.matchedCorreios).length,
    },
    shipmentGroups,
    monthlyShipping,
    materialRows,
    errorRows,
    topErrors,
    topDestinations,
    errorEquipmentRows,
    ufRows,
  };
}
