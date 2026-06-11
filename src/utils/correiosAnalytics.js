import { formatMonth } from './dateUtils';

export const EMPTY_CORREIOS_FILTERS = {
  year: '',
  month: '',
  service: '',
  callType: '',
  coban: '',
  loja: '',
  postingUnit: '',
  serviceMode: 'all',
  minValue: '',
  maxValue: '',
  minWeight: '',
  maxWeight: '',
  search: '',
};

function currentYear() {
  return new Date().getFullYear();
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function listYearMonths(year) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    return {
      monthKey,
      month: formatMonth(monthKey),
      shortMonth: formatMonth(monthKey).split(' de ')[0].slice(0, 3),
      shipments: 0,
      totalCost: 0,
      totalWeight: 0,
      pac: 0,
      sedex: 0,
      reversos: 0,
    };
  });
}

function addRecordTotals(target, record) {
  target.shipments += 1;
  target.totalCost += safeNumber(record.serviceValue);
  target.totalWeight += safeNumber(record.weightKg);
  if (record.isPac) {
    target.pac += 1;
  }
  if (record.isSedex) {
    target.sedex += 1;
  }
  if (record.isReverse) {
    target.reversos += 1;
  }
}

function makeTotals(records) {
  const totals = {
    shipments: 0,
    totalCost: 0,
    totalWeight: 0,
    pac: 0,
    sedex: 0,
    reversos: 0,
  };

  records.forEach((record) => addRecordTotals(totals, record));
  return {
    ...totals,
    averageCost: totals.shipments ? totals.totalCost / totals.shipments : 0,
  };
}

function uniqueOptions(records, field) {
  return Array.from(
    new Set(records.map((record) => record[field]).filter((value) => value && value !== 'Não informado')),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function getCorreiosYearOptions(records) {
  return Array.from(new Set(records.map((record) => record.year).filter(Boolean)))
    .sort((a, b) => b - a)
    .map(String);
}

export function resolveDefaultCorreiosYear(records) {
  const years = getCorreiosYearOptions(records).map(Number);
  const yearNow = currentYear();
  if (years.includes(yearNow)) {
    return String(yearNow);
  }
  return years[0] ? String(years[0]) : String(yearNow);
}

export function buildCorreiosOptions(records, selectedYear) {
  const yearRecords = selectedYear
    ? records.filter((record) => String(record.year) === String(selectedYear))
    : records;

  return {
    years: getCorreiosYearOptions(records),
    months: selectedYear ? listYearMonths(selectedYear).map((row) => ({
      value: row.monthKey,
      label: row.month,
    })) : [],
    services: uniqueOptions(yearRecords, 'service'),
    callTypes: uniqueOptions(yearRecords, 'callType'),
    cobans: uniqueOptions(yearRecords, 'coban'),
    lojas: uniqueOptions(yearRecords, 'loja'),
    postingUnits: uniqueOptions(yearRecords, 'postingUnit'),
  };
}

export function applyCorreiosFilters(records, filters) {
  const query = String(filters.search || '').trim().toLowerCase();

  return records.filter((record) => {
    if (filters.year && String(record.year) !== String(filters.year)) {
      return false;
    }
    if (filters.month && record.postingMonth !== filters.month) {
      return false;
    }
    if (filters.service && record.service !== filters.service) {
      return false;
    }
    if (filters.callType && record.callType !== filters.callType) {
      return false;
    }
    if (filters.coban && record.coban !== filters.coban) {
      return false;
    }
    if (filters.loja && record.loja !== filters.loja) {
      return false;
    }
    if (filters.postingUnit && record.postingUnit !== filters.postingUnit) {
      return false;
    }
    if (filters.serviceMode === 'pac' && !record.isPac) {
      return false;
    }
    if (filters.serviceMode === 'sedex' && !record.isSedex) {
      return false;
    }
    if (filters.serviceMode === 'reverso' && !record.isReverse) {
      return false;
    }
    if (filters.minValue && record.serviceValue < Number(filters.minValue)) {
      return false;
    }
    if (filters.maxValue && record.serviceValue > Number(filters.maxValue)) {
      return false;
    }
    if (filters.minWeight && record.weightKg < Number(filters.minWeight)) {
      return false;
    }
    if (filters.maxWeight && record.weightKg > Number(filters.maxWeight)) {
      return false;
    }
    if (query) {
      const haystack = [
        record.tracking,
        record.service,
        record.callType,
        record.callNumber,
        record.coban,
        record.loja,
        record.postingUnit,
        record.cep,
      ].join(' ').toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

function buildMonthly(records, year) {
  const monthRows = listYearMonths(year);
  const byMonth = new Map(monthRows.map((row) => [row.monthKey, row]));

  records.forEach((record) => {
    const row = byMonth.get(record.postingMonth);
    if (row) {
      addRecordTotals(row, record);
    }
  });

  return monthRows.map((row) => ({
    ...row,
    averageCost: row.shipments ? row.totalCost / row.shipments : 0,
  }));
}

function findPeakMonth(monthlyRows) {
  return monthlyRows.reduce((peak, row) => (
    row.totalCost > peak.totalCost ? row : peak
  ), monthlyRows[0] || { month: 'Não informado', monthKey: '', totalCost: 0 });
}

function buildCallTypeAnalysis(records, monthKeys) {
  const map = new Map();

  records.forEach((record) => {
    const key = record.callType || 'Não informado';
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        callType: key,
        records: [],
        shipments: 0,
        totalCost: 0,
        totalWeight: 0,
        pac: 0,
        sedex: 0,
        reversos: 0,
        monthly: Object.fromEntries(monthKeys.map((monthKey) => [monthKey, {
          monthKey,
          shipments: 0,
          totalCost: 0,
        }])),
      });
    }

    const row = map.get(key);
    row.records.push(record);
    addRecordTotals(row, record);
    if (record.postingMonth && row.monthly[record.postingMonth]) {
      row.monthly[record.postingMonth].shipments += 1;
      row.monthly[record.postingMonth].totalCost += safeNumber(record.serviceValue);
    }
  });

  const totalCost = records.reduce((sum, record) => sum + safeNumber(record.serviceValue), 0);

  return Array.from(map.values()).map((row) => {
    const monthlyRows = monthKeys.map((monthKey) => row.monthly[monthKey]);
    const peakMonth = monthlyRows.reduce((peak, item) => (
      item.totalCost > peak.totalCost ? item : peak
    ), monthlyRows[0] || { monthKey: '', totalCost: 0 });
    const sortedByValue = [...row.records].sort((a, b) => b.serviceValue - a.serviceValue);
    const smallest = [...row.records]
      .filter((record) => record.serviceValue > 0)
      .sort((a, b) => a.serviceValue - b.serviceValue)[0] || null;

    return {
      ...row,
      monthlyRows,
      averageCost: row.shipments ? row.totalCost / row.shipments : 0,
      percentageCost: totalCost ? (row.totalCost / totalCost) * 100 : 0,
      peakMonthKey: peakMonth.monthKey,
      peakMonth: peakMonth.monthKey ? formatMonth(peakMonth.monthKey) : 'Não informado',
      maxShipment: sortedByValue[0] || null,
      minShipment: smallest,
    };
  }).sort((a, b) => b.totalCost - a.totalCost || b.shipments - a.shipments);
}

function buildMatrixRows(callTypes, monthKeys) {
  return callTypes.map((row) => {
    const monthValues = {};
    const monthCounts = {};
    let maxMonthValue = 0;

    monthKeys.forEach((monthKey) => {
      const month = row.monthly[monthKey] || { shipments: 0, totalCost: 0 };
      monthValues[monthKey] = month.totalCost;
      monthCounts[monthKey] = month.shipments;
      maxMonthValue = Math.max(maxMonthValue, month.totalCost);
    });

    return {
      id: row.callType,
      callType: row.callType,
      monthValues,
      monthCounts,
      maxMonthValue,
      totalCost: row.totalCost,
      totalShipments: row.shipments,
    };
  });
}

function buildCrossRows(callTypes) {
  return callTypes.map((row) => ({
    id: row.callType,
    callType: row.callType,
    pac: row.pac,
    sedex: row.sedex,
    reversos: row.reversos,
    total: row.shipments,
    pacValue: row.records.filter((record) => record.isPac).reduce((sum, record) => sum + record.serviceValue, 0),
    sedexValue: row.records.filter((record) => record.isSedex).reduce((sum, record) => sum + record.serviceValue, 0),
    reversosValue: row.records.filter((record) => record.isReverse).reduce((sum, record) => sum + record.serviceValue, 0),
    totalValue: row.totalCost,
  }));
}

function buildEntityRanking(records, field, limit = 12) {
  const map = new Map();

  records.forEach((record) => {
    const name = record[field] || 'Não informado';
    if (!map.has(name)) {
      map.set(name, {
        id: name,
        name,
        shipments: 0,
        totalCost: 0,
        totalWeight: 0,
        pac: 0,
        sedex: 0,
        reversos: 0,
      });
    }

    const row = map.get(name);
    addRecordTotals(row, record);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      averageCost: row.shipments ? row.totalCost / row.shipments : 0,
      sedexPercent: row.shipments ? (row.sedex / row.shipments) * 100 : 0,
      reversePercent: row.shipments ? (row.reversos / row.shipments) * 100 : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost || b.shipments - a.shipments)
    .slice(0, limit);
}

function buildServiceRanking(records) {
  return buildEntityRanking(records, 'service', 12);
}

function buildAlerts(records, summary, monthly, callTypes, services, unitRanking) {
  const alerts = [];
  const peakMonth = findPeakMonth(monthly);
  const topCallType = callTypes[0];
  const topUnit = unitRanking[0];
  const missingCalled = records.filter((record) => record.callType === 'Não informado').length;
  const missingCobanOrStore = records.filter((record) => (
    record.coban === 'Não informado' || record.loja === 'Não informado'
  )).length;
  const biggestSedexService = services
    .filter((service) => service.sedex > 0)
    .sort((a, b) => b.sedex - a.sedex)[0];
  const expensiveAverageType = callTypes.find((row) => (
    row.shipments >= 3 && summary.averageCost > 0 && row.averageCost > summary.averageCost * 1.25
  ));
  const monthlyIncrease = monthly.find((row, index) => {
    const previous = monthly[index - 1];
    return previous && previous.totalCost > 0 && row.totalCost > previous.totalCost * 1.3;
  });

  if (summary.shipments) {
    alerts.push({
      type: 'info',
      title: 'Mês com maior gasto',
      message: `${peakMonth.month} concentra o maior gasto no recorte.`,
    });
  }

  if (topCallType) {
    alerts.push({
      type: 'warning',
      title: 'Maior custo por chamado',
      message: `${topCallType.callType} lidera o custo anual da base filtrada.`,
    });
  }

  if (expensiveAverageType) {
    alerts.push({
      type: 'warning',
      title: 'Custo médio acima da média',
      message: `${expensiveAverageType.callType} tem custo médio acima da média geral.`,
    });
  }

  if (biggestSedexService) {
    alerts.push({
      type: 'info',
      title: 'Maior uso de SEDEX',
      message: `${biggestSedexService.name} tem o maior volume de SEDEX no recorte.`,
    });
  }

  if (summary.reversos) {
    alerts.push({
      type: 'info',
      title: 'Reversos no ano',
      message: `${summary.reversos} envio(s) reverso(s) encontrados.`,
    });
  }

  if (missingCalled) {
    alerts.push({
      type: 'danger',
      title: 'Registros sem chamado',
      message: `${missingCalled} envio(s) sem chamado identificado.`,
    });
  }

  if (missingCobanOrStore) {
    alerts.push({
      type: 'warning',
      title: 'Coban ou loja em branco',
      message: `${missingCobanOrStore} envio(s) sem Coban ou Loja preenchidos.`,
    });
  }

  if (topUnit) {
    alerts.push({
      type: 'info',
      title: 'Unidade com maior custo',
      message: `${topUnit.name} lidera o custo por unidade de postagem.`,
    });
  }

  if (monthlyIncrease) {
    alerts.push({
      type: 'warning',
      title: 'Aumento relevante',
      message: `${monthlyIncrease.month} teve aumento acima de 30% em relação ao mês anterior.`,
    });
  }

  return alerts;
}

export function buildCorreiosAnalytics(records, filters = EMPTY_CORREIOS_FILTERS) {
  const selectedYear = filters.year || resolveDefaultCorreiosYear(records);
  const effectiveFilters = {
    ...EMPTY_CORREIOS_FILTERS,
    ...filters,
    year: selectedYear,
  };
  const yearRecords = records.filter((record) => String(record.year) === String(selectedYear));
  const filteredRecords = applyCorreiosFilters(records, effectiveFilters);
  const monthKeys = listYearMonths(selectedYear).map((row) => row.monthKey);
  const monthly = buildMonthly(filteredRecords, selectedYear);
  const summary = makeTotals(filteredRecords);
  const callTypes = buildCallTypeAnalysis(filteredRecords, monthKeys);
  const services = buildServiceRanking(filteredRecords);
  const cobans = buildEntityRanking(filteredRecords, 'coban');
  const lojas = buildEntityRanking(filteredRecords, 'loja');
  const postingUnits = buildEntityRanking(filteredRecords, 'postingUnit');

  return {
    records,
    yearRecords,
    filteredRecords,
    selectedYear,
    filters: effectiveFilters,
    options: buildCorreiosOptions(records, selectedYear),
    summary: {
      ...summary,
      peakMonth: findPeakMonth(monthly),
    },
    monthly,
    callTypes,
    costRanking: callTypes.slice(0, 10),
    quantityRanking: [...callTypes].sort((a, b) => b.shipments - a.shipments || b.totalCost - a.totalCost).slice(0, 10),
    matrixRows: buildMatrixRows(callTypes, monthKeys),
    crossRows: buildCrossRows(callTypes),
    rankings: {
      services,
      cobans,
      lojas,
      postingUnits,
    },
    alerts: buildAlerts(filteredRecords, summary, monthly, callTypes, services, postingUnits),
  };
}
