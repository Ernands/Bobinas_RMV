import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Boxes,
  DatabaseZap,
  DollarSign,
  PackageCheck,
  Search,
  Truck,
} from 'lucide-react';
import AlertBox from '../components/AlertBox';
import BrazilUfMap from '../components/BrazilUfMap';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import { DATASET_CONFIGS } from '../config/datasets';
import { CONSOLIDATED_MONTHS } from '../utils/consolidatedConstants';
import { formatDateBR } from '../utils/dateUtils';
import { formatCurrency, formatInteger } from '../utils/calculations';

const BASE_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'bobinas', label: 'Bobinas' },
  { value: 'consolidado', label: 'Consolidado Bobinas' },
  { value: 'correios', label: 'Envios Correios' },
];

const OVERVIEW_UF_METRICS = [
  { key: 'totalCost', label: 'Valor total', format: formatCurrency },
  { key: 'quantity', label: 'Quantidade', format: formatInteger },
  { key: 'averageCost', label: 'Custo médio', format: formatCurrency },
  { key: 'requested', label: 'Solicitações', format: formatInteger },
  { key: 'correiosCost', label: 'Gasto Correios', format: formatCurrency },
  { key: 'operationCost', label: 'Custo total operação', format: formatCurrency },
];

const OVERVIEW_UF_TOOLTIP = [
  { key: 'totalCost', label: 'Valor total', format: formatCurrency },
  { key: 'quantity', label: 'Quantidade', format: formatInteger },
  { key: 'averageCost', label: 'Custo médio', format: formatCurrency },
  { key: 'requested', label: 'Solicitações', format: formatInteger },
  { key: 'correiosCost', label: 'Gasto Correios', format: formatCurrency },
  { key: 'operationCost', label: 'Custo total operação', format: formatCurrency },
];

function DashboardEmptyState() {
  return (
    <article className="empty-state">
      <h2>Carregue o Google Sheets ou importe uma planilha para iniciar</h2>
      <p>Os cards, gráficos e relatórios serão preenchidos apenas com dados carregados no navegador.</p>
    </article>
  );
}

function monthNumberToConsolidatedKey(monthNumber) {
  const index = Number(monthNumber) - 1;
  return CONSOLIDATED_MONTHS[index]?.key || '';
}

function monthRowsForYear(year) {
  return CONSOLIDATED_MONTHS.map((month, index) => {
    const monthNumber = String(index + 1).padStart(2, '0');
    return {
      ...month,
      calendarKey: year ? `${year}-${monthNumber}` : '',
      monthNumber,
    };
  });
}

function latestYear(options, bobinasFilters, correiosAnalytics, consolidatedAnalytics) {
  return (
    bobinasFilters.referenceYear
    || correiosAnalytics.selectedYear
    || consolidatedAnalytics.selectedYear
    || options.years?.[0]
    || String(new Date().getFullYear())
  );
}

function hasBase(baseScope, base) {
  return baseScope === 'all' || baseScope === base;
}

function normalizeUfName(value) {
  return value && value !== 'Não informado' ? value : 'UF não identificada';
}

function isSentStatus(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase() === 'enviado';
}

function sumRows(rows, key) {
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

function buildSentUnitsByMonth(records = []) {
  const map = new Map();
  records.forEach((record) => {
    if (!record.exitMonth || !isSentStatus(record.status)) {
      return;
    }
    map.set(record.exitMonth, (map.get(record.exitMonth) || 0) + (record.quantity || 0));
  });
  return map;
}

function buildOverviewMonthlyRows({
  analytics,
  baseScope,
  consolidatedAnalytics,
  correiosAnalytics,
  hasConsolidatedData,
  selectedYear,
}) {
  const demandByMonth = new Map(analytics.monthlyDemand.map((row) => [row.monthKey, row]));
  const sentByMonth = buildSentUnitsByMonth(analytics.records);
  const consolidatedByMonth = new Map(consolidatedAnalytics.monthly.map((row) => [row.monthKey, row]));
  const correiosByMonth = new Map(correiosAnalytics.monthly.map((row) => [row.monthKey, row]));
  const useBobinas = hasBase(baseScope, 'bobinas');
  const useConsolidado = hasBase(baseScope, 'consolidado');
  const useCorreios = hasBase(baseScope, 'correios');

  return monthRowsForYear(selectedYear).map((month) => {
    const demand = demandByMonth.get(month.calendarKey);
    const consolidated = consolidatedByMonth.get(month.key);
    const correios = correiosByMonth.get(month.calendarKey);
    const canUseConsolidado = useConsolidado && hasConsolidatedData;
    const requested = canUseConsolidado ? consolidated?.requested || 0 : useBobinas ? demand?.units || 0 : 0;
    const sent = canUseConsolidado ? consolidated?.shipments || 0 : useBobinas ? sentByMonth.get(month.calendarKey) || 0 : 0;
    const bobbinCost = canUseConsolidado ? consolidated?.bobbinCost || 0 : useBobinas ? demand?.totalCost || 0 : 0;
    const correiosCost = useCorreios ? correios?.totalCost || 0 : 0;

    return {
      id: month.key,
      month: month.shortLabel,
      requested,
      sent,
      correiosShipments: useCorreios ? correios?.shipments || 0 : 0,
      bobbinCost,
      correiosCost,
      operationCost: bobbinCost + correiosCost,
      boxes16: canUseConsolidado ? consolidated?.boxes16 || 0 : demand?.minBoxes16 || 0,
      boxes30: canUseConsolidado ? consolidated?.boxes30 || 0 : demand?.minBoxes30 || 0,
    };
  });
}

function buildRangeRows(rangeAnalysis = []) {
  const total = rangeAnalysis.reduce((summary, row) => ({
    id: 'total',
    range: 'TOTAIS',
    isTotal: true,
    destinations: summary.destinations + row.destinations,
    requested: summary.requested + row.requested,
    boxes16: summary.boxes16 + row.boxes16,
    boxes30: summary.boxes30 + row.boxes30,
  }), {
    id: 'total',
    range: 'TOTAIS',
    isTotal: true,
    destinations: 0,
    requested: 0,
    boxes16: 0,
    boxes30: 0,
  });

  return [...rangeAnalysis, total];
}

function buildMonthlyReportRows(monthlyRows) {
  const byMonth = new Map(monthlyRows.map((row) => [row.id, row]));
  const metrics = [
    { id: 'requested', label: 'Solicitações', key: 'requested', format: formatInteger },
    { id: 'sent', label: 'Envios', key: 'sent', format: formatInteger },
    { id: 'boxes16', label: 'Qt Envio Caixa 16 M', key: 'boxes16', format: formatInteger },
    { id: 'boxes30', label: 'Qt Envio Caixa 30 M', key: 'boxes30', format: formatInteger },
    { id: 'bobbinCost', label: 'Custo Bobinas', key: 'bobbinCost', format: formatCurrency },
    { id: 'correiosCost', label: 'Custo Correios', key: 'correiosCost', format: formatCurrency },
    { id: 'operationCost', label: 'Custo Total', key: 'operationCost', format: formatCurrency },
  ];

  return metrics.map((metric) => ({
    id: metric.id,
    metric: metric.label,
    values: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [
      month.key,
      metric.format(byMonth.get(month.key)?.[metric.key] || 0),
    ])),
  }));
}

function buildOverviewUfRows(consolidatedUfRows = [], correiosUfRows = []) {
  const map = new Map();

  function ensure(uf) {
    const name = normalizeUfName(uf);
    if (!map.has(name)) {
      map.set(name, {
        id: name,
        name,
        requested: 0,
        quantity: 0,
        shipments: 0,
        bobbinCost: 0,
        correiosCost: 0,
        fallbackCorreiosCost: 0,
        operationCost: 0,
        totalCost: 0,
        averageCost: 0,
      });
    }
    return map.get(name);
  }

  consolidatedUfRows.forEach((row) => {
    const current = ensure(row.uf);
    current.requested += row.requested || 0;
    current.quantity += row.requested || 0;
    current.bobbinCost += row.bobbinCost || 0;
    current.fallbackCorreiosCost += row.correiosCost || 0;
  });

  correiosUfRows.forEach((row) => {
    const current = ensure(row.name);
    current.quantity += row.shipments || 0;
    current.shipments += row.shipments || 0;
    current.correiosCost += row.totalCost || 0;
  });

  return Array.from(map.values()).map((row) => {
    const correiosCost = row.correiosCost || row.fallbackCorreiosCost;
    const operationCost = row.bobbinCost + correiosCost;
    return {
      ...row,
      correiosCost,
      operationCost,
      totalCost: operationCost,
      averageCost: row.quantity ? operationCost / row.quantity : 0,
      shipments: row.quantity,
    };
  }).sort((a, b) => b.totalCost - a.totalCost || b.quantity - a.quantity || a.name.localeCompare(b.name, 'pt-BR'));
}

function latestDateLabel(state) {
  const records = state?.records || [];
  const dates = records
    .flatMap((record) => [record.openingDate, record.exitDate, record.postingDate])
    .filter(Boolean);

  if (dates.length) {
    const latest = dates.reduce((max, date) => (date > max ? date : max), dates[0]);
    return formatDateBR(latest);
  }

  const years = records.map((record) => record.year).filter(Boolean).sort((a, b) => b - a);
  return years[0] ? String(years[0]) : 'Sem data';
}

function datasetTone(state, config) {
  if (!config.enabled) {
    return { label: 'Aguardando', tone: 'warning' };
  }
  if (state?.status === 'error' || state?.meta?.missingColumns?.length) {
    return { label: 'Erro', tone: 'danger' };
  }
  if (state?.status === 'loaded' && state.records?.length) {
    return { label: 'OK', tone: 'success' };
  }
  if (state?.status === 'loaded') {
    return { label: 'Sem dados', tone: 'warning' };
  }
  return { label: 'Aguardando', tone: 'warning' };
}

function DatasetStatusCards({ datasetStates }) {
  return (
    <section className="dataset-status-grid">
      {DATASET_CONFIGS.map((config) => {
        const state = datasetStates?.[config.id];
        const status = datasetTone(state, config);
        return (
          <article className="dataset-status-card" key={config.id}>
            <DatabaseZap size={22} aria-hidden="true" />
            <div>
              <strong>{config.label}</strong>
              <span>{formatInteger(state?.records?.length || 0)} registros</span>
              <small>{latestDateLabel(state)}</small>
            </div>
            <b className={`pill ${status.tone}`}>{status.label}</b>
          </article>
        );
      })}
    </section>
  );
}

function OverviewFilters({
  baseScope,
  bobinasFilters,
  consolidatedFilters,
  correiosFilters,
  onBaseScopeChange,
  onBobinasFiltersChange,
  onConsolidatedFiltersChange,
  onCorreiosFiltersChange,
  options,
  selectedYear,
}) {
  const selectedMonth = bobinasFilters.referenceMonth?.slice(5) || correiosFilters.month?.slice(5) || '';
  const selectedUf = bobinasFilters.uf || correiosFilters.uf || consolidatedFilters.uf || '';
  const selectedCallType = bobinasFilters.callType || correiosFilters.callType || '';
  const yearOptions = options.years?.length ? options.years : [selectedYear];

  function setYear(year) {
    const month = selectedMonth;
    onBobinasFiltersChange({
      ...bobinasFilters,
      referenceYear: year,
      referenceMonth: year && month ? `${year}-${month}` : '',
    });
    onCorreiosFiltersChange({
      ...correiosFilters,
      year,
      month: year && month ? `${year}-${month}` : '',
    });
    onConsolidatedFiltersChange({
      ...consolidatedFilters,
      year,
      month: month ? monthNumberToConsolidatedKey(month) : '',
    });
  }

  function setMonth(month) {
    const year = selectedYear;
    onBobinasFiltersChange({
      ...bobinasFilters,
      referenceMonth: year && month ? `${year}-${month}` : '',
    });
    onCorreiosFiltersChange({
      ...correiosFilters,
      month: year && month ? `${year}-${month}` : '',
    });
    onConsolidatedFiltersChange({
      ...consolidatedFilters,
      month: month ? monthNumberToConsolidatedKey(month) : '',
    });
  }

  function setUf(uf) {
    onBobinasFiltersChange({ ...bobinasFilters, uf });
    onCorreiosFiltersChange({ ...correiosFilters, uf });
    onConsolidatedFiltersChange({ ...consolidatedFilters, uf });
  }

  function setCallType(callType) {
    onBobinasFiltersChange({ ...bobinasFilters, callType });
    onCorreiosFiltersChange({ ...correiosFilters, callType });
  }

  return (
    <section className="filters-panel expanded overview-main-filters">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Filtros principais</p>
          <h2>Recorte executivo</h2>
        </div>
      </div>
      <div className="filters-grid overview-filter-grid">
        <label className="field">
          <span>Ano</span>
          <select value={selectedYear} onChange={(event) => setYear(event.target.value)}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Mês</span>
          <select value={selectedMonth} onChange={(event) => setMonth(event.target.value)}>
            <option value="">Todos</option>
            {CONSOLIDATED_MONTHS.map((month, index) => (
              <option key={month.key} value={String(index + 1).padStart(2, '0')}>{month.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Base</span>
          <select value={baseScope} onChange={(event) => onBaseScopeChange(event.target.value)}>
            {BASE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>UF</span>
          <select value={selectedUf} onChange={(event) => setUf(event.target.value)}>
            <option value="">Todas</option>
            {options.ufs.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select
            value={bobinasFilters.statusMode}
            onChange={(event) => onBobinasFiltersChange({ ...bobinasFilters, statusMode: event.target.value })}
          >
            <option value="all">Enviado e Pendente</option>
            <option value="sent">Somente Enviado</option>
            <option value="pending">Somente Pendente</option>
          </select>
        </label>
        <label className="field">
          <span>Tipo de chamado</span>
          <select value={selectedCallType} onChange={(event) => setCallType(event.target.value)}>
            <option value="">Todos</option>
            {options.callTypes.map((callType) => (
              <option key={callType} value={callType}>{callType}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function OperationalImpacts({ rows }) {
  return (
    <section className="impact-list">
      {rows.map((row, index) => (
        <article className="impact-item" key={row.title}>
          <span>{index + 1}</span>
          <div>
            <strong>{row.title}</strong>
            <p>{row.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export default function Overview({
  analytics,
  bobinasFilters,
  consolidatedAnalytics,
  consolidatedFilters,
  correiosAnalytics,
  correiosFilters,
  datasetStates,
  hasConsolidatedData,
  hasCorreiosData,
  hasData,
  onBobinasFiltersChange,
  onConsolidatedFiltersChange,
  onCorreiosFiltersChange,
  overviewOptions,
}) {
  const [baseScope, setBaseScope] = useState('all');
  const [ufMetric, setUfMetric] = useState('totalCost');
  const [matrixMode, setMatrixMode] = useState('value');
  const [matrixSearch, setMatrixSearch] = useState('');
  const selectedYear = latestYear(overviewOptions, bobinasFilters, correiosAnalytics, consolidatedAnalytics);
  const monthlyRows = useMemo(() => buildOverviewMonthlyRows({
    analytics,
    baseScope,
    consolidatedAnalytics,
    correiosAnalytics,
    hasConsolidatedData,
    selectedYear,
  }), [analytics, baseScope, consolidatedAnalytics, correiosAnalytics, hasConsolidatedData, selectedYear]);
  const rangeRows = useMemo(() => buildRangeRows(consolidatedAnalytics.rangeAnalysis), [consolidatedAnalytics.rangeAnalysis]);
  const monthlyReportRows = useMemo(() => buildMonthlyReportRows(monthlyRows), [monthlyRows]);
  const overviewUfRows = useMemo(() => buildOverviewUfRows(
    hasBase(baseScope, 'consolidado') ? consolidatedAnalytics.ufSummary : [],
    hasBase(baseScope, 'correios') ? correiosAnalytics.rankings.ufs : [],
  ), [baseScope, consolidatedAnalytics.ufSummary, correiosAnalytics.rankings.ufs]);
  const filteredMatrixRows = useMemo(() => {
    const query = matrixSearch.trim().toLowerCase();
    const rows = hasBase(baseScope, 'correios') ? correiosAnalytics.matrixRows : [];
    return query ? rows.filter((row) => row.callType.toLowerCase().includes(query)) : rows;
  }, [baseScope, correiosAnalytics.matrixRows, matrixSearch]);
  const visibleAlerts = useMemo(() => [
    ...(hasBase(baseScope, 'bobinas') ? analytics.alerts.map((alert) => ({ ...alert, title: `Bobinas: ${alert.title}` })) : []),
    ...(hasBase(baseScope, 'consolidado') ? consolidatedAnalytics.alerts.map((alert) => ({ ...alert, title: `Consolidado: ${alert.title}` })) : []),
    ...(hasBase(baseScope, 'correios') ? correiosAnalytics.alerts.map((alert) => ({ ...alert, title: `Correios: ${alert.title}` })) : []),
  ].slice(0, 8), [analytics.alerts, baseScope, consolidatedAnalytics.alerts, correiosAnalytics.alerts]);
  const matrixColumns = useMemo(() => [
    { key: 'callType', label: 'Tipo de chamado' },
    ...correiosAnalytics.monthly.map((month) => ({
      key: month.monthKey,
      label: month.shortMonth,
      value: (row) => {
        const value = matrixMode === 'value' ? row.monthValues[month.monthKey] : row.monthCounts[month.monthKey];
        return matrixMode === 'value' ? formatCurrency(value) : formatInteger(value);
      },
      sortValue: (row) => (matrixMode === 'value' ? row.monthValues[month.monthKey] : row.monthCounts[month.monthKey]),
      render: (row, raw) => {
        const value = matrixMode === 'value' ? row.monthValues[month.monthKey] : row.monthCounts[month.monthKey];
        const maxValue = Math.max(...correiosAnalytics.monthly.map((item) => (
          matrixMode === 'value' ? row.monthValues[item.monthKey] || 0 : row.monthCounts[item.monthKey] || 0
        )));
        return value > 0 && value === maxValue ? <span className="matrix-peak">{raw}</span> : raw;
      },
    })),
    {
      key: 'total',
      label: 'Total',
      value: (row) => (matrixMode === 'value' ? formatCurrency(row.totalCost) : formatInteger(row.totalShipments)),
      sortValue: (row) => (matrixMode === 'value' ? row.totalCost : row.totalShipments),
    },
  ], [correiosAnalytics.monthly, matrixMode]);
  const criticalAlertCount = visibleAlerts.filter((alert) => alert.type === 'danger' || alert.type === 'warning').length;
  const hasAnyData = hasData || hasConsolidatedData || hasCorreiosData;
  const totals = {
    records: (
      (hasBase(baseScope, 'bobinas') ? analytics.summary.totalRecords : 0)
      + (hasBase(baseScope, 'consolidado') ? consolidatedAnalytics.filteredRecords.length : 0)
      + (hasBase(baseScope, 'correios') ? correiosAnalytics.filteredRecords.length : 0)
    ),
    requested: sumRows(monthlyRows, 'requested'),
    sent: sumRows(monthlyRows, 'sent'),
    bobbinCost: sumRows(monthlyRows, 'bobbinCost'),
    correiosCost: sumRows(monthlyRows, 'correiosCost'),
    operationCost: sumRows(monthlyRows, 'operationCost'),
  };
  const difference = totals.requested - totals.sent;
  const topCallType = correiosAnalytics.summary.topCallType;
  const topRange = consolidatedAnalytics.rangeAnalysis
    .filter((row) => row.requested > 0)
    .sort((a, b) => b.requested - a.requested)[0];
  const impacts = [
    topCallType ? {
      title: 'Tipo de chamado com maior custo',
      description: `${topCallType.callType} soma ${formatCurrency(topCallType.totalCost)} no recorte.`,
    } : null,
    correiosAnalytics.summary.peakMonth?.totalCost ? {
      title: 'Mês com maior gasto logístico',
      description: `${correiosAnalytics.summary.peakMonth.month} concentra ${formatCurrency(correiosAnalytics.summary.peakMonth.totalCost)} em Correios.`,
    } : null,
    correiosAnalytics.summary.topUf ? {
      title: 'UF com maior custo',
      description: `${correiosAnalytics.summary.topUf.name} lidera com ${formatCurrency(correiosAnalytics.summary.topUf.totalCost)}.`,
    } : null,
    analytics.summary.byBobbinType?.[0] ? {
      title: 'Bobina mais solicitada',
      description: `${analytics.summary.byBobbinType[0].name} soma ${formatInteger(analytics.summary.byBobbinType[0].units)} unidades.`,
    } : null,
    topRange ? {
      title: 'Faixa de transação com maior consumo',
      description: `${topRange.range} concentra ${formatInteger(topRange.requested)} solicitações.`,
    } : null,
    {
      title: 'Diferença total entre solicitação e envio',
      description: `${formatInteger(difference)} unidade(s) no recorte executivo.`,
    },
  ].filter(Boolean);

  return (
    <div className="page-grid">
      <OverviewFilters
        baseScope={baseScope}
        bobinasFilters={bobinasFilters}
        consolidatedFilters={consolidatedFilters}
        correiosFilters={correiosFilters}
        onBaseScopeChange={setBaseScope}
        onBobinasFiltersChange={onBobinasFiltersChange}
        onConsolidatedFiltersChange={onConsolidatedFiltersChange}
        onCorreiosFiltersChange={onCorreiosFiltersChange}
        options={overviewOptions}
        selectedYear={selectedYear}
      />

      <DatasetStatusCards datasetStates={datasetStates} />

      <section className="metrics-grid">
        <MetricCard icon={DatabaseZap} title="Registros carregados" value={formatInteger(totals.records)} subtitle="recorte filtrado" />
        <MetricCard icon={Boxes} title="Bobinas solicitadas" value={formatInteger(totals.requested)} subtitle="consolidado anual" tone="primary" />
        <MetricCard icon={Truck} title="Bobinas enviadas" value={formatInteger(totals.sent)} subtitle="sem status pendente" tone="success" />
        <MetricCard icon={AlertTriangle} title="Diferença Solicitação x Correios" value={formatInteger(difference)} tone={difference ? 'warning' : 'success'} />
        <MetricCard icon={PackageCheck} title="Custo Bobinas" value={formatCurrency(totals.bobbinCost)} subtitle="56x16 e 56x30" />
        <MetricCard icon={DollarSign} title="Gasto Correios" value={formatCurrency(totals.correiosCost)} tone="primary" />
        <MetricCard icon={DollarSign} title="Custo Total Operação" value={formatCurrency(totals.operationCost)} tone="warning" />
        <MetricCard icon={AlertTriangle} title="Alertas críticos" value={formatInteger(criticalAlertCount)} tone={criticalAlertCount ? 'warning' : 'success'} />
      </section>

      {!hasAnyData ? <DashboardEmptyState /> : <AlertBox alerts={visibleAlerts} />}

      <section className="charts-grid two">
        <ChartCard title="Volume operacional mensal" subtitle="Bobinas solicitadas, bobinas enviadas e envios Correios">
          <ResponsiveContainer height={320} width="100%">
            <ComposedChart data={monthlyRows}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatInteger(value)} />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Legend />
              <Bar dataKey="requested" fill="#2563EB" name="Bobinas solicitadas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sent" fill="#16A34A" name="Bobinas enviadas" radius={[4, 4, 0, 0]} />
              <Line dataKey="correiosShipments" name="Envios Correios" stroke="#7C3AED" strokeWidth={2} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Custo logístico mensal" subtitle="Custo de bobinas, gasto Correios e custo total da operação">
          <ResponsiveContainer height={320} width="100%">
            <ComposedChart data={monthlyRows}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatInteger(value)} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="bobbinCost" fill="#2563EB" name="Custo Bobinas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="correiosCost" fill="#F59E0B" name="Gasto Correios" radius={[4, 4, 0, 0]} />
              <Line dataKey="operationCost" name="Custo Total Operação" stroke="#DC2626" strokeWidth={2} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="charts-grid two">
        <ChartCard title="Relatório por faixa de transações" subtitle="Transações referentes ao mês anterior">
          <DataTable
            columns={[
              { key: 'range', label: 'Transações', sortable: false, render: (row) => (row.isTotal ? <strong>{row.range}</strong> : row.range) },
              { key: 'destinations', label: 'Qt Cobans', sortable: false, value: (row) => formatInteger(row.destinations) },
              { key: 'requested', label: 'Solicitações', sortable: false, value: (row) => formatInteger(row.requested) },
              { key: 'boxes16', label: 'Envio 16 m cx', sortable: false, value: (row) => formatInteger(row.boxes16) },
              { key: 'boxes30', label: 'Envio 30 m cx', sortable: false, value: (row) => formatInteger(row.boxes30) },
            ]}
            rows={rangeRows}
          />
          <p className="table-note">* Transações referente ao mês anterior.</p>
        </ChartCard>

        <ChartCard title="Relatório mensal" subtitle="Solicitações, envios, caixas e custos de Janeiro a Dezembro">
          <DataTable
            columns={[
              { key: 'metric', label: '', sortable: false },
              ...CONSOLIDATED_MONTHS.map((month) => ({
                key: month.key,
                label: month.shortLabel,
                sortable: false,
                value: (row) => row.values[month.key],
              })),
            ]}
            rows={monthlyReportRows}
            topScrollbar
          />
        </ChartCard>
      </section>

      <BrazilUfMap
        metric={ufMetric}
        metrics={OVERVIEW_UF_METRICS}
        rows={overviewUfRows}
        selectedUf={bobinasFilters.uf || correiosFilters.uf || consolidatedFilters.uf}
        tooltipFields={OVERVIEW_UF_TOOLTIP}
        onMetricChange={setUfMetric}
        onUfClick={(uf) => {
          onBobinasFiltersChange({ ...bobinasFilters, uf });
          onCorreiosFiltersChange({ ...correiosFilters, uf });
          onConsolidatedFiltersChange({ ...consolidatedFilters, uf });
        }}
      />

      <ChartCard title="Matriz anual por tipo de chamado" subtitle="Quantidade de envios ou valor gasto por mês">
        <div className="matrix-toolbar">
          <button
            className={`button ${matrixMode === 'count' ? 'primary' : 'secondary'}`}
            type="button"
            onClick={() => setMatrixMode('count')}
          >
            Quantidade de envios
          </button>
          <button
            className={`button ${matrixMode === 'value' ? 'primary' : 'secondary'}`}
            type="button"
            onClick={() => setMatrixMode('value')}
          >
            Valor gasto
          </button>
          <label className="search-input matrix-search">
            <Search size={16} aria-hidden="true" />
            <input
              placeholder="Buscar tipo de chamado"
              value={matrixSearch}
              onChange={(event) => setMatrixSearch(event.target.value)}
            />
          </label>
        </div>
        <DataTable
          columns={matrixColumns}
          emptyMessage="Sem dados de Envios Correios para a matriz no recorte."
          rows={filteredMatrixRows}
          topScrollbar
        />
      </ChartCard>

      <ChartCard title="Maiores impactos do período" subtitle="Resumo executivo dos principais pontos do recorte">
        <OperationalImpacts rows={impacts} />
      </ChartCard>
    </div>
  );
}
