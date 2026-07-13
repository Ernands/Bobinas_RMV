import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DollarSign,
  PackageCheck,
  Scale,
  Search,
  Truck,
} from 'lucide-react';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import { CONSOLIDATED_MONTHS } from '../utils/consolidatedConstants';
import { formatCurrency, formatDecimal, formatInteger } from '../utils/calculations';
import {
  buildSubstitutionAnalytics,
  EMPTY_SUBSTITUTION_FILTERS,
  SUBSTITUTION_EQUIPMENT_COLUMNS,
} from '../utils/substitutionAnalytics';

const ERROR_COLORS = ['#DC2626', '#F97316', '#F59E0B', '#2563EB', '#16A34A'];

function formatWeight(value) {
  return `${formatDecimal(value || 0)} kg`;
}

function setFilter(filters, onChange, key, value) {
  onChange({ ...filters, [key]: value });
}

function maxMonthValue(rows, selector) {
  return Math.max(1, ...rows.flatMap((row) => CONSOLIDATED_MONTHS.map((month) => selector(row, month.key) || 0)));
}

function HeatCell({ value, max, children }) {
  const intensity = value > 0 ? Math.max(0.08, Math.min(0.55, value / max)) : 0;
  return (
    <span
      className="substitution-heat-cell"
      style={{ backgroundColor: `rgba(220, 38, 38, ${intensity})` }}
    >
      {children ?? formatInteger(value)}
    </span>
  );
}

function TotalBar({ value, max }) {
  const width = max ? Math.max(4, (value / max) * 100) : 0;
  return (
    <span className="substitution-total-bar">
      <span style={{ width: `${width}%` }} />
      <strong>{formatInteger(value)}</strong>
    </span>
  );
}

function MonthQuantityCostCell({ count, cost }) {
  return (
    <span className="substitution-month-cost-cell">
      <strong>{formatInteger(count)}</strong>
      <small>{formatCurrency(cost)}</small>
    </span>
  );
}

function SubstitutionFilters({ analytics, filters, onChange }) {
  const yearOptions = analytics.options.years.length ? analytics.options.years : [analytics.selectedYear];

  return (
    <section className="filters-panel substitution-filters">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2>Recorte de substituições</h2>
        </div>
        <button className="button secondary" type="button" onClick={() => onChange({ ...EMPTY_SUBSTITUTION_FILTERS })}>
          Limpar filtros
        </button>
      </div>

      <div className="filters-grid">
        <label className="field">
          <span>Ano</span>
          <select value={filters.year || analytics.selectedYear} onChange={(event) => setFilter(filters, onChange, 'year', event.target.value)}>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Mês</span>
          <select value={filters.month} onChange={(event) => setFilter(filters, onChange, 'month', event.target.value)}>
            <option value="">Todos</option>
            {CONSOLIDATED_MONTHS.map((month, index) => (
              <option key={month.key} value={String(index + 1).padStart(2, '0')}>{month.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>UF</span>
          <select value={filters.uf} onChange={(event) => setFilter(filters, onChange, 'uf', event.target.value)}>
            <option value="">Todas</option>
            {analytics.options.ufs.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Erro</span>
          <select value={filters.error} onChange={(event) => setFilter(filters, onChange, 'error', event.target.value)}>
            <option value="">Todos</option>
            {analytics.options.errors.map((error) => <option key={error} value={error}>{error}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Equipamento</span>
          <select value={filters.equipment} onChange={(event) => setFilter(filters, onChange, 'equipment', event.target.value)}>
            <option value="">Todos</option>
            {analytics.options.equipments.map((equipment) => <option key={equipment} value={equipment}>{equipment}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Data de</span>
          <input type="date" value={filters.dateFrom} onChange={(event) => setFilter(filters, onChange, 'dateFrom', event.target.value)} />
        </label>
        <label className="field">
          <span>Data até</span>
          <input type="date" value={filters.dateTo} onChange={(event) => setFilter(filters, onChange, 'dateTo', event.target.value)} />
        </label>
        <label className="field search-field">
          <span>Coban, destino ou chamado</span>
          <div className="search-input">
            <Search size={16} aria-hidden="true" />
            <input
              placeholder="Pesquisar..."
              type="search"
              value={filters.query}
              onChange={(event) => setFilter(filters, onChange, 'query', event.target.value)}
            />
          </div>
        </label>
      </div>
    </section>
  );
}

function MonthlyShippingChart({ analytics }) {
  const [mode, setMode] = useState('count');
  const data = CONSOLIDATED_MONTHS.map((month) => ({
    month: month.shortLabel,
    envios: analytics.monthlyShipping.months[month.key].count,
    custo: analytics.monthlyShipping.months[month.key].cost,
  }));

  return (
    <ChartCard
      title="Quantidade Envios e Custo"
      subtitle="Alterna entre volume de envios e valor cruzado com Envios Correios."
    >
      <div className="chart-toolbar">
        <label className="field inline-field">
          <span>Métrica</span>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="count">Quantidade</option>
            <option value="cost">Valor</option>
          </select>
        </label>
      </div>
      <ResponsiveContainer height={300} width="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(value) => (mode === 'cost' ? formatCurrency(value) : formatInteger(value))} />
          <Tooltip formatter={(value) => (mode === 'cost' ? formatCurrency(value) : formatInteger(value))} />
          <Bar
            dataKey={mode === 'cost' ? 'custo' : 'envios'}
            fill={mode === 'cost' ? '#16A34A' : '#2563EB'}
            name={mode === 'cost' ? 'Custo envio' : 'Envios'}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ErrorMonthlyChart({ analytics }) {
  const data = CONSOLIDATED_MONTHS.map((month) => {
    const row = { month: month.shortLabel };
    analytics.topErrors.forEach((errorRow) => {
      row[errorRow.error] = errorRow.months[month.key] || 0;
    });
    return row;
  });

  return (
    <ChartCard
      title="Motivo por Erro mensal"
      subtitle="Top 5 erros com maior quantidade no recorte."
    >
      <ResponsiveContainer height={330} width="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => formatInteger(value)} />
          <Legend />
          {analytics.topErrors.map((row, index) => (
            <Bar
              dataKey={row.error}
              fill={ERROR_COLORS[index % ERROR_COLORS.length]}
              key={row.error}
              name={row.error}
              stackId="erros"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function MonthlyShippingTable({ analytics }) {
  const rows = [
    {
      id: 'count',
      label: 'Envios',
      total: analytics.monthlyShipping.totalCount,
      formatter: formatInteger,
      values: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [month.key, analytics.monthlyShipping.months[month.key].count])),
    },
    {
      id: 'cost',
      label: 'Custo Envio',
      total: analytics.monthlyShipping.totalCost,
      formatter: formatCurrency,
      values: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [month.key, analytics.monthlyShipping.months[month.key].cost])),
    },
  ];
  const columns = [
    { key: 'label', label: 'Mês', sortable: false },
    ...CONSOLIDATED_MONTHS.map((month) => ({
      key: month.key,
      label: month.shortLabel.toUpperCase(),
      sortable: false,
      value: (row) => row.formatter(row.values[month.key]),
    })),
    { key: 'total', label: 'Total anual', sortable: false, value: (row) => row.formatter(row.total) },
  ];

  return <DataTable columns={columns} rows={rows} topScrollbar />;
}

function MaterialTable({ analytics }) {
  const max = maxMonthValue(analytics.materialRows, (row, key) => row.months[key]);
  const total = {
    id: 'total-material',
    material: 'TOTAL',
    total: analytics.materialRows.reduce((sum, row) => sum + row.total, 0),
    months: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [
      month.key,
      analytics.materialRows.reduce((sum, row) => sum + (row.months[month.key] || 0), 0),
    ])),
    isTotal: true,
  };
  const columns = [
    { key: 'material', label: 'Material', sortable: false },
    ...CONSOLIDATED_MONTHS.map((month) => ({
      key: month.key,
      label: month.shortLabel.toUpperCase(),
      sortable: false,
      value: (row) => row.months[month.key] || 0,
      render: (row, value) => <HeatCell max={max} value={value} />,
    })),
    { key: 'total', label: 'Total anual', sortable: false, value: (row) => row.total, render: (row, value) => <strong>{formatInteger(value)}</strong> },
  ];

  return <DataTable columns={columns} rows={[...analytics.materialRows, total]} topScrollbar />;
}

function ErrorMonthlyTable({ analytics }) {
  const max = maxMonthValue(analytics.errorRows, (row, key) => row.months[key]);
  const maxTotal = Math.max(1, ...analytics.errorRows.map((row) => row.total));
  const total = {
    id: 'total-errors',
    error: 'TOTAL TIPOS DE ERROS',
    total: analytics.errorRows.reduce((sum, row) => sum + row.total, 0),
    months: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [
      month.key,
      analytics.errorRows.reduce((sum, row) => sum + (row.months[month.key] || 0), 0),
    ])),
    isTotal: true,
  };
  const columns = [
    { key: 'error', label: 'Motivo por erro', sortable: false },
    ...CONSOLIDATED_MONTHS.map((month) => ({
      key: month.key,
      label: month.shortLabel.toUpperCase(),
      sortable: false,
      value: (row) => row.months[month.key] || 0,
      render: (row, value) => <HeatCell max={max} value={value} />,
    })),
    {
      key: 'total',
      label: 'Total anual',
      sortable: false,
      value: (row) => row.total,
      render: (row, value) => (row.isTotal ? <strong>{formatInteger(value)}</strong> : <TotalBar max={maxTotal} value={value} />),
    },
  ];

  return <DataTable columns={columns} rows={[...analytics.errorRows, total]} topScrollbar />;
}

function ErrorEquipmentTable({ analytics }) {
  const columns = [
    { key: 'error', label: 'Erro', sortable: false },
    ...SUBSTITUTION_EQUIPMENT_COLUMNS.map((equipment) => ({
      key: equipment,
      label: equipment,
      sortable: false,
      value: (row) => row.equipment[equipment] || 0,
      render: (row, value) => formatInteger(value),
    })),
    {
      key: 'cost',
      label: 'Custo Correios',
      sortable: false,
      value: (row) => row.cost,
      render: (row, value) => <strong>{formatCurrency(value)}</strong>,
    },
  ];

  return <DataTable columns={columns} rows={analytics.errorEquipmentRows} topScrollbar />;
}

function UfTable({ analytics }) {
  const total = {
    id: 'total-uf',
    uf: 'TOTAL',
    totalCount: analytics.ufRows.reduce((sum, row) => sum + row.totalCount, 0),
    totalCost: analytics.ufRows.reduce((sum, row) => sum + row.totalCost, 0),
    months: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [
      month.key,
      analytics.ufRows.reduce((acc, row) => ({
        count: acc.count + (row.months[month.key]?.count || 0),
        cost: acc.cost + (row.months[month.key]?.cost || 0),
      }), { count: 0, cost: 0 }),
    ])),
    isTotal: true,
  };
  const columns = [
    { key: 'uf', label: 'Substituição por UF', sortable: false },
    ...CONSOLIDATED_MONTHS.map((month) => ({
      key: month.key,
      label: month.shortLabel.toUpperCase(),
      sortable: false,
      value: (row) => row.months[month.key]?.count || 0,
      render: (row) => (
        <MonthQuantityCostCell
          cost={row.months[month.key]?.cost || 0}
          count={row.months[month.key]?.count || 0}
        />
      ),
    })),
    {
      key: 'total',
      label: 'Total anual',
      sortable: false,
      value: (row) => row.totalCount,
      render: (row) => <MonthQuantityCostCell cost={row.totalCost} count={row.totalCount} />,
    },
  ];

  return <DataTable columns={columns} rows={[...analytics.ufRows, total]} topScrollbar />;
}

function GeneralTable({ analytics, headers = [] }) {
  const hiddenIndexes = new Set([1, 3, 4]);
  const visibleHeaders = headers.filter((header, index) => header && !hiddenIndexes.has(index));
  const columns = visibleHeaders.map((header) => ({
    key: `original-${header}`,
    label: header,
    value: (row) => row.original?.[header] ?? '',
  }));

  columns.splice(2, 0, {
    key: 'shipmentCost',
    label: 'Custo envio',
    value: (row) => row.shipmentCost,
    render: (row, value) => <strong>{formatCurrency(value)}</strong>,
    sortValue: (row) => row.shipmentCost,
  });

  return (
    <DataTable
      columns={columns}
      emptyMessage="Nenhuma substituição encontrada no recorte."
      rows={analytics.filteredRecords}
      topScrollbar
    />
  );
}

export default function Substitutions({ correiosRecords = [], datasetState }) {
  const [filters, setFilters] = useState(EMPTY_SUBSTITUTION_FILTERS);
  const records = datasetState?.records || [];
  const analytics = useMemo(
    () => buildSubstitutionAnalytics(records, correiosRecords, filters),
    [records, correiosRecords, filters],
  );
  const headers = datasetState?.meta?.headers || [];

  if (!records.length) {
    return (
      <div className="page-grid">
        <section className="section-heading">
          <div>
            <p className="eyebrow">Substituição_Equipamentos</p>
            <h2>Substituições</h2>
            <p>Carregue a aba Substituição_Equipamentos na Fonte de dados para visualizar os indicadores.</p>
          </div>
        </section>
        <article className="empty-state">
          <h2>Base Substituição_Equipamentos ainda não carregada.</h2>
          <p>O cruzamento de custo será feito com a base Envios Correios pelo número do chamado.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="page-grid substitutions-page">
      <section className="section-heading split">
        <div>
          <p className="eyebrow">Substituição_Equipamentos</p>
          <h2>Substituições</h2>
          <p>Envios, custos, materiais, erros e UF com custo cruzado pela base Envios Correios.</p>
        </div>
      </section>

      <SubstitutionFilters analytics={analytics} filters={filters} onChange={setFilters} />

      <section className="metrics-grid compact-metrics">
        <MetricCard icon={Truck} title="Quantidade de envios" value={formatInteger(analytics.summary.shipments)} />
        <MetricCard icon={Scale} title="Peso total" value={formatWeight(analytics.summary.totalWeight)} tone="warning" />
        <MetricCard icon={DollarSign} title="Custo total" value={formatCurrency(analytics.summary.totalCost)} tone="success" />
        <MetricCard
          icon={PackageCheck}
          title="Chamados sem custo"
          value={formatInteger(analytics.summary.unmatchedCalls)}
          subtitle="Sem cruzamento em Correios"
          tone="warning"
        />
      </section>

      <section className="cards-grid two">
        <MonthlyShippingChart analytics={analytics} />
        <ErrorMonthlyChart analytics={analytics} />
      </section>

      <ChartCard title="Quantidade Envios e Custo" subtitle="Custo de envio cruzado pelo número do chamado.">
        <MonthlyShippingTable analytics={analytics} />
      </ChartCard>

      <ChartCard title="Quantidade por Material">
        <MaterialTable analytics={analytics} />
      </ChartCard>

      <ChartCard title="Motivo por Erro mensal">
        <ErrorMonthlyTable analytics={analytics} />
      </ChartCard>

      <ChartCard title="Erro por equipamento" subtitle="Somente os equipamentos definidos para acompanhamento.">
        <ErrorEquipmentTable analytics={analytics} />
      </ChartCard>

      <ChartCard title="Quantidade Envios por UF" subtitle="Quantidade por mês com custo Correios abaixo em texto discreto.">
        <UfTable analytics={analytics} />
      </ChartCard>

      <ChartCard title="Tabela Geral" subtitle="Base Substituição_Equipamentos com custo do envio cruzado.">
        <GeneralTable analytics={analytics} headers={headers} />
      </ChartCard>
    </div>
  );
}
