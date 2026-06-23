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
  BarChart3,
  Boxes,
  ChevronDown,
  CircleHelp,
  GraduationCap,
  Headphones,
  Mail,
  Megaphone,
  Monitor,
  PackageOpen,
  RotateCcw,
  Search,
  Truck,
  User,
  Wrench,
} from 'lucide-react';
import AlertBox from '../components/AlertBox';
import BrazilUfMap from '../components/BrazilUfMap';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import { CONSOLIDATED_MONTHS } from '../utils/consolidatedConstants';
import {
  BOBBIN_CONFIGS,
  calculateCost,
  ceilBoxes,
  formatCurrency,
  formatInteger,
  formatPercent,
  getBobbinKey,
} from '../utils/calculations';

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

const OVERVIEW_UF_SORT_METRICS = [
  { key: 'shipments', label: 'Quantidade de postagens', format: formatInteger },
  { key: 'correiosCost', label: 'Custo Correios', format: formatCurrency },
  { key: 'bobbinCost', label: 'Custo Bobinas', format: formatCurrency },
  { key: 'totalCost', label: 'Custo total', format: formatCurrency },
];

const OVERVIEW_UF_DETAIL_FIELDS = [
  { key: 'shipments', label: 'Postagens', format: formatInteger },
  { key: 'correiosCost', label: 'Custo Correios', format: formatCurrency },
  { key: 'bobbinCost', label: 'Custo Bobinas', format: formatCurrency },
  { key: 'totalCost', label: 'Custo total', format: formatCurrency },
  { key: 'destinations', label: 'Destinos únicos', format: formatInteger },
  { key: 'pac', label: 'PAC', format: formatInteger },
  { key: 'sedex', label: 'SEDEX', format: formatInteger },
  { key: 'reversos', label: 'Reversos', format: formatInteger },
  { key: 'boxes', label: 'Caixas de bobinas', format: formatInteger },
];

const CALL_TYPE_CARDS = [
  {
    id: 'solicitation',
    title: 'Solicitação de Bobinas',
    aliases: ['Solicitação de Bobinas', 'Solicitacao de Bobinas'],
    icon: Boxes,
    tone: 'blue',
  },
  {
    id: 'equipment-return',
    title: 'Devolução de Equipamento',
    aliases: ['Devolução de Equipamento', 'Devolução equipamento', 'Devolucao de Equipamento', 'Devolucao equipamento'],
    icon: PackageOpen,
    tone: 'orange',
  },
  {
    id: 'technical-problem',
    title: 'Problema Técnico - Equipamento / Conexão',
    aliases: ['Problema Técnico - Equipamento / Conexão', 'Problema Tecnico - Equipamento / Conexao'],
    icon: Wrench,
    tone: 'blue',
  },
  {
    id: 'training',
    title: 'Treinamento - Instalação',
    aliases: ['Treinamento - Instalação', 'Treinamento - Instalacao'],
    icon: GraduationCap,
    tone: 'green',
  },
  {
    id: 'marketing-material',
    title: 'Material de Divulgação e Sinalização',
    aliases: ['Material de Divulgação e Sinalização', 'Material de Divulgacao e Sinalizacao'],
    icon: Megaphone,
    tone: 'purple',
  },
  {
    id: 'additional-equipment',
    title: 'Equipamento ou Periférico Adicional',
    aliases: ['Equipamento ou Periférico Adicional', 'Equipamento ou Periferico Adicional'],
    icon: Monitor,
    tone: 'teal',
  },
  {
    id: 'upgrade',
    title: 'Substituição Upgrade',
    aliases: ['Substituição Upgrade', 'Substituicao Upgrade'],
    icon: PackageOpen,
    tone: 'yellow',
  },
  {
    id: 'unknown',
    title: 'Não informado',
    aliases: [],
    icon: CircleHelp,
    tone: 'gray',
  },
];

const MAP_CALL_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  ...CALL_TYPE_CARDS.map((card) => ({
    value: card.id,
    label: card.id === 'solicitation' ? 'Bobinas' : card.title,
  })),
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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function knownText(value) {
  const normalized = normalizeText(value);
  return normalized && !['#n/d', 'n/d', 'nao informado', '-'].includes(normalized) ? value : '';
}

function destinationKey(value) {
  const text = knownText(value);
  return text ? normalizeText(text).replace(/[^a-z0-9]/g, '') : '';
}

function originalValue(record, aliases) {
  const original = record.original || {};
  const normalizedAliases = aliases.map(normalizeText);
  const entry = Object.entries(original).find(([key]) => normalizedAliases.includes(normalizeText(key)));
  return entry?.[1] || '';
}

function getCorreiosDestination(record) {
  return (
    knownText(record.destination)
    || knownText(record.coban)
    || knownText(originalValue(record, ['Destino', 'Coban', 'Cliente', 'Local destino', 'Nome destino']))
  );
}

function uniqueCountBy(records, selector) {
  return new Set(
    records
      .map(selector)
      .map(destinationKey)
      .filter(Boolean),
  ).size;
}

function sumServiceValue(records) {
  return records.reduce((sum, record) => sum + (Number(record.serviceValue) || 0), 0);
}

function summarizeCorreios(records = []) {
  const pacRecords = records.filter((record) => record.isPac);
  const sedexRecords = records.filter((record) => record.isSedex);
  const reverseRecords = records.filter((record) => record.isReverse);
  const totalCost = sumServiceValue(records);
  const pacCost = sumServiceValue(pacRecords);
  const sedexCost = sumServiceValue(sedexRecords);
  const reverseCost = sumServiceValue(reverseRecords);

  return {
    records,
    shipments: records.length,
    cobans: uniqueCountBy(records, getCorreiosDestination),
    pac: pacRecords.length,
    pacCost,
    pacAverage: pacRecords.length ? pacCost / pacRecords.length : 0,
    sedex: sedexRecords.length,
    sedexCost,
    sedexAverage: sedexRecords.length ? sedexCost / sedexRecords.length : 0,
    reversos: reverseRecords.length,
    reverseCost,
    reverseAverage: reverseRecords.length ? reverseCost / reverseRecords.length : 0,
    totalWeight: records.reduce((sum, record) => sum + (Number(record.weightKg) || 0), 0),
    average: records.length ? totalCost / records.length : 0,
    totalCost,
  };
}

function buildCorreiosCardSummaries(records) {
  const groups = new Map(CALL_TYPE_CARDS.map((card) => [card.id, []]));
  const unknownCard = CALL_TYPE_CARDS.find((card) => card.id === 'unknown');

  records.forEach((record) => {
    const callType = normalizeText(record.callType);
    const card = CALL_TYPE_CARDS.find((item) => (
      item.id !== 'unknown'
      && item.aliases.some((alias) => callType === normalizeText(alias))
    )) || unknownCard;
    groups.get(card.id).push(record);
  });

  const cards = CALL_TYPE_CARDS.map((card) => ({
    ...card,
    summary: summarizeCorreios(groups.get(card.id)),
  }));
  const total = cards.reduce((summary, card) => {
    summary.shipments += card.summary.shipments;
    summary.totalCost += card.summary.totalCost;
    summary.totalWeight += card.summary.totalWeight;
    summary.pac += card.summary.pac;
    summary.pacCost += card.summary.pacCost;
    summary.sedex += card.summary.sedex;
    summary.sedexCost += card.summary.sedexCost;
    summary.reversos += card.summary.reversos;
    summary.reverseCost += card.summary.reverseCost;
    return summary;
  }, {
    records,
    shipments: 0,
    cobans: uniqueCountBy(records, getCorreiosDestination),
    totalCost: 0,
    totalWeight: 0,
    pac: 0,
    pacCost: 0,
    sedex: 0,
    sedexCost: 0,
    reversos: 0,
    reverseCost: 0,
  });

  total.average = total.shipments ? total.totalCost / total.shipments : 0;
  total.pacAverage = total.pac ? total.pacCost / total.pac : 0;
  total.sedexAverage = total.sedex ? total.sedexCost / total.sedex : 0;
  total.reverseAverage = total.reversos ? total.reverseCost / total.reversos : 0;

  validateCorreiosCardTotals(summarizeCorreios(records), total);
  return { cards, total };
}

function validateCorreiosCardTotals(sourceTotal, cardsTotal) {
  const integerFields = ['shipments', 'pac', 'sedex', 'reversos'];
  const decimalFields = ['totalCost', 'totalWeight'];
  const inconsistent = (
    integerFields.some((field) => sourceTotal[field] !== cardsTotal[field])
    || decimalFields.some((field) => Math.abs(sourceTotal[field] - cardsTotal[field]) > 0.01)
  );

  if (import.meta.env.DEV && inconsistent) {
    console.warn(
      'Inconsistência nos cards: Total Geral não bate com a soma dos tipos de chamado.',
      { cardsTotal, sourceTotal },
    );
  }
}

function buildCorreiosRows(summary) {
  return [
    { icon: Headphones, label: 'Atendimentos/Solicitações', value: formatInteger(summary.shipments) },
    { icon: User, label: 'Cobans', value: formatInteger(summary.cobans) },
    { icon: Truck, label: 'PAC', value: formatInteger(summary.pac), detail: `Custo m\u00e9dio ${formatCurrency(summary.pacAverage)}` },
    { icon: Truck, label: 'SEDEX', value: formatInteger(summary.sedex), detail: `Custo m\u00e9dio ${formatCurrency(summary.sedexAverage)}` },
    { icon: BarChart3, label: 'Custo m\u00e9dio geral', value: formatCurrency(summary.average) },
    { icon: Mail, label: 'Custo Correios', value: formatCurrency(summary.totalCost) },
  ];
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
  const totalRequested = rangeAnalysis.reduce((sum, row) => sum + row.requested, 0);
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

  return [
    ...rangeAnalysis.map((row) => ({
      ...row,
      percentage: totalRequested ? (row.requested / totalRequested) * 100 : 0,
    })),
    {
      ...total,
      percentage: totalRequested ? 100 : 0,
    },
  ];
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

function matchesCallTypeCard(record, cardId) {
  if (!cardId) {
    return true;
  }

  const card = CALL_TYPE_CARDS.find((item) => item.id === cardId);
  if (!card) {
    return true;
  }

  const callType = normalizeText(record.callType);
  if (card.id === 'unknown') {
    return !callType || callType === normalizeText('Não informado');
  }

  return card.aliases.some((alias) => callType === normalizeText(alias));
}

function addDestinationKey(target, value) {
  const key = destinationKey(value);
  if (key) {
    target.destinationKeys.add(key);
  }
}

function buildOverviewMapUfRows({
  bobinasRecords = [],
  consolidatedRecords = [],
  consolidatedUfRows = [],
  correiosRecords = [],
}) {
  const map = new Map();

  function ensure(uf) {
    const name = normalizeUfName(uf);
    if (!map.has(name)) {
      map.set(name, {
        id: name,
        name,
        destinationKeys: new Set(),
        destinations: 0,
        shipments: 0,
        correiosCost: 0,
        bobbinCost: 0,
        totalCost: 0,
        averageCost: 0,
        totalWeight: 0,
        pac: 0,
        pacCost: 0,
        pacAverage: 0,
        sedex: 0,
        sedexCost: 0,
        sedexAverage: 0,
        reversos: 0,
        reverseCost: 0,
        reverseAverage: 0,
        boxes: 0,
      });
    }
    return map.get(name);
  }

  consolidatedUfRows.forEach((row) => {
    const current = ensure(row.uf);
    current.destinations = Math.max(current.destinations, row.destinations || 0);
    current.bobbinCost += row.bobbinCost || 0;
    current.boxes += row.boxes || 0;
  });

  consolidatedRecords.forEach((record) => {
    addDestinationKey(ensure(record.uf), record.destination);
  });

  bobinasRecords.forEach((record) => {
    const current = ensure(record.uf);
    const quantity = Number(record.quantity) || 0;
    const bobbinKey = getBobbinKey(record.bobbinType);
    const config = BOBBIN_CONFIGS[bobbinKey];
    addDestinationKey(current, record.destination);
    if (config) {
      current.bobbinCost += calculateCost(quantity, config.unitCost);
      current.boxes += ceilBoxes(quantity, config.unitsPerBox);
    }
  });

  correiosRecords.forEach((record) => {
    const current = ensure(record.uf);
    const serviceValue = Number(record.serviceValue) || 0;
    current.shipments += 1;
    current.correiosCost += serviceValue;
    current.totalWeight += Number(record.weightKg) || 0;
    addDestinationKey(current, getCorreiosDestination(record));

    if (record.isPac) {
      current.pac += 1;
      current.pacCost += serviceValue;
    }
    if (record.isSedex) {
      current.sedex += 1;
      current.sedexCost += serviceValue;
    }
    if (record.isReverse) {
      current.reversos += 1;
      current.reverseCost += serviceValue;
    }
  });

  return Array.from(map.values()).map((row) => {
    const destinationCount = row.destinationKeys.size || row.destinations;
    const totalCost = row.correiosCost + row.bobbinCost;
    const cleaned = {
      ...row,
      destinations: destinationCount,
      totalCost,
      operationCost: totalCost,
      averageCost: row.shipments ? totalCost / row.shipments : 0,
      pacAverage: row.pac ? row.pacCost / row.pac : 0,
      sedexAverage: row.sedex ? row.sedexCost / row.sedex : 0,
      reverseAverage: row.reversos ? row.reverseCost / row.reversos : 0,
    };
    delete cleaned.destinationKeys;
    return cleaned;
  }).sort((a, b) => b.shipments - a.shipments || b.totalCost - a.totalCost || a.name.localeCompare(b.name, 'pt-BR'));
}

function OverviewFilters({
  baseScope,
  bobinasFilters,
  consolidatedFilters,
  correiosFilters,
  correiosOptions = {},
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
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = [
    baseScope !== 'all',
    selectedMonth,
    selectedUf,
    selectedCallType,
    bobinasFilters.statusMode && bobinasFilters.statusMode !== 'all',
    correiosFilters.service,
    correiosFilters.coban,
    correiosFilters.loja,
  ].filter(Boolean).length;

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

  function setCorreiosFilter(key, value) {
    onCorreiosFiltersChange({ ...correiosFilters, [key]: value });
    if (key === 'coban') {
      const selectedKey = destinationKey(value);
      const matchingDestination = selectedKey
        ? options.destinations.find((destination) => destinationKey(destination) === selectedKey)
        : '';
      onBobinasFiltersChange({
        ...bobinasFilters,
        destination: matchingDestination || (value ? `__coban_sem_destino__${selectedKey}` : ''),
      });
    }
  }

  function resetVisibleFilters() {
    onBaseScopeChange('all');
    onBobinasFiltersChange({
      ...bobinasFilters,
      referenceMonth: '',
      statusMode: 'all',
      uf: '',
      destination: '',
      callType: '',
    });
    onCorreiosFiltersChange({
      ...correiosFilters,
      month: '',
      service: '',
      callType: '',
      coban: '',
      loja: '',
      uf: '',
    });
    onConsolidatedFiltersChange({
      ...consolidatedFilters,
      month: '',
      uf: '',
    });
  }

  return (
    <section className={`filters-panel overview-main-filters ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Filtros principais</p>
          <h2>Recorte executivo</h2>
        </div>
        <div className="heading-actions">
          <span className="filter-summary">
            {activeCount ? `${activeCount} filtro(s) ativo(s)` : 'Sem filtros ativos'}
          </span>
          <button
            className={`icon-button filters-toggle ${isOpen ? 'open' : ''}`}
            title={isOpen ? 'Recolher filtros' : 'Expandir filtros'}
            type="button"
            onClick={() => setIsOpen((current) => !current)}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          <button className="icon-button" title="Limpar filtros" type="button" onClick={resetVisibleFilters}>
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      {isOpen ? (
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
        <label className="field">
          <span>Serviço</span>
          <select value={correiosFilters.service} onChange={(event) => setCorreiosFilter('service', event.target.value)}>
            <option value="">Todos</option>
            {(correiosOptions.services || []).map((service) => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Coban</span>
          <select value={correiosFilters.coban} onChange={(event) => setCorreiosFilter('coban', event.target.value)}>
            <option value="">Todos</option>
            {(correiosOptions.cobans || []).map((coban) => (
              <option key={coban} value={coban}>{coban}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Loja</span>
          <select value={correiosFilters.loja} onChange={(event) => setCorreiosFilter('loja', event.target.value)}>
            <option value="">Todas</option>
            {(correiosOptions.lojas || []).map((loja) => (
              <option key={loja} value={loja}>{loja}</option>
            ))}
          </select>
        </label>
      </div>
      ) : null}
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

function ExecutiveMetricRow({ detail, icon: Icon, label, value }) {
  return (
    <div className="executive-metric-row">
      <Icon size={18} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function ExecutiveCard({ footer, icon: Icon, rows, title, tone = 'blue' }) {
  return (
    <article className={`executive-card ${tone}`}>
      <header>
        <span className="executive-card-icon">
          <Icon size={26} aria-hidden="true" />
        </span>
        <h3>{title}</h3>
      </header>
      <div className="executive-card-body">
        {rows.map((row) => (
          <ExecutiveMetricRow key={`${title}-${row.label}`} {...row} />
        ))}
      </div>
      {footer ? (
        <footer>
          <strong>{footer.value}</strong>
          <span>{footer.label}</span>
        </footer>
      ) : null}
    </article>
  );
}

function OverviewExecutiveCards({ cards }) {
  return (
    <section className="overview-executive-section">
      <div className="overview-executive-grid">
        {cards.map((card) => <ExecutiveCard key={card.title} {...card} />)}
      </div>
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
  hasConsolidatedData,
  hasCorreiosData,
  hasData,
  onBobinasFiltersChange,
  onConsolidatedFiltersChange,
  onCorreiosFiltersChange,
  overviewOptions,
}) {
  const [baseScope, setBaseScope] = useState('all');
  const [ufMetric, setUfMetric] = useState('shipments');
  const [mapCallType, setMapCallType] = useState('');
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
  const mapCorreiosRecords = useMemo(
    () => (hasBase(baseScope, 'correios')
      ? correiosAnalytics.filteredRecords.filter((record) => matchesCallTypeCard(record, mapCallType))
      : []),
    [baseScope, correiosAnalytics.filteredRecords, mapCallType],
  );
  const includeBobbinCostsOnMap = !mapCallType || mapCallType === 'solicitation';
  const useConsolidatedOnMap = (
    hasBase(baseScope, 'consolidado')
    && includeBobbinCostsOnMap
    && consolidatedAnalytics.filteredRecords.length > 0
  );
  const useBobinasFallbackOnMap = hasBase(baseScope, 'bobinas') && includeBobbinCostsOnMap && !useConsolidatedOnMap;
  const overviewUfRows = useMemo(() => buildOverviewMapUfRows({
    bobinasRecords: useBobinasFallbackOnMap ? analytics.records : [],
    consolidatedRecords: useConsolidatedOnMap ? consolidatedAnalytics.filteredRecords : [],
    consolidatedUfRows: useConsolidatedOnMap ? consolidatedAnalytics.ufSummary : [],
    correiosRecords: mapCorreiosRecords,
  }), [
    analytics.records,
    consolidatedAnalytics.filteredRecords,
    consolidatedAnalytics.ufSummary,
    mapCorreiosRecords,
    useBobinasFallbackOnMap,
    useConsolidatedOnMap,
  ]);
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
  const correiosCardData = useMemo(
    () => buildCorreiosCardSummaries(correiosAnalytics.filteredRecords),
    [correiosAnalytics.filteredRecords],
  );
  const totalOperationCost = (
    sumRows(analytics.monthlyDemand, 'totalCost')
    + correiosCardData.total.totalCost
  );
  const executiveCards = [
    {
      title: 'Total Geral',
      icon: BarChart3,
      tone: 'red',
      rows: buildCorreiosRows(correiosCardData.total),
      footer: {
        label: 'Custo total (Correios + Bobinas)',
        value: formatCurrency(totalOperationCost),
      },
    },
    ...correiosCardData.cards.map((card) => ({
      ...card,
      rows: buildCorreiosRows(card.summary),
    })),
  ];
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
        correiosOptions={correiosAnalytics.options}
        onBaseScopeChange={setBaseScope}
        onBobinasFiltersChange={onBobinasFiltersChange}
        onConsolidatedFiltersChange={onConsolidatedFiltersChange}
        onCorreiosFiltersChange={onCorreiosFiltersChange}
        options={overviewOptions}
        selectedYear={selectedYear}
      />

      <OverviewExecutiveCards cards={executiveCards} />

      <BrazilUfMap
        categoryFilter={mapCallType}
        categoryOptions={MAP_CALL_TYPE_OPTIONS}
        metric={ufMetric}
        metrics={OVERVIEW_UF_SORT_METRICS}
        rows={overviewUfRows}
        selectedUf={bobinasFilters.uf || correiosFilters.uf || consolidatedFilters.uf}
        subtitle="Postagens, custos de Correios, custos de bobinas e indicadores por UF no recorte executivo."
        tooltipFields={OVERVIEW_UF_DETAIL_FIELDS}
        onCategoryFilterChange={setMapCallType}
        onMetricChange={setUfMetric}
        onUfClick={(uf) => {
          onBobinasFiltersChange({ ...bobinasFilters, uf });
          onCorreiosFiltersChange({ ...correiosFilters, uf });
          onConsolidatedFiltersChange({ ...consolidatedFilters, uf });
        }}
      />

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

      <section className="overview-report-stack">
        <ChartCard title="Relatório por faixa de transações" subtitle="Transações referentes ao mês anterior">
          <DataTable
            columns={[
              { key: 'range', label: 'Transações', sortable: false, render: (row) => (row.isTotal ? <strong>{row.range}</strong> : row.range) },
              { key: 'destinations', label: 'Qt Cobans', sortable: false, value: (row) => formatInteger(row.destinations) },
              { key: 'percentage', label: '%', sortable: false, value: (row) => formatPercent(row.percentage) },
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
