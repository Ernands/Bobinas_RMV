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
  AlertTriangle,
  Boxes,
  Building2,
  DollarSign,
  Download,
  Gauge,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
} from 'lucide-react';
import AlertBox from '../components/AlertBox';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatDecimal, formatInteger } from '../utils/calculations';
import { CONSOLIDATED_MONTHS } from '../utils/consolidatedConstants';
import { EMPTY_CONSOLIDATED_FILTERS } from '../utils/consolidatedAnalytics';
import { downloadCsv } from '../utils/csvExport';

function setFilter(filters, onFiltersChange, key, value) {
  onFiltersChange({
    ...filters,
    [key]: value,
  });
}

function SelectFilter({ label, options, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function activeFilterCount(filters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === 'year') {
      return false;
    }
    if (key === 'bobbinType') {
      return value && value !== 'all';
    }
    return typeof value === 'boolean' ? value : Boolean(value);
  }).length;
}

function ConsolidatedFilters({ analytics, filters, onFiltersChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const options = analytics.options;
  const count = activeFilterCount(filters);

  return (
    <section className={`filters-panel ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Filtros Consolidado</p>
          <h2>Recorte por destino</h2>
        </div>
        <div className="heading-actions">
          <span className="filter-summary">
            {formatInteger(analytics.filteredRecords.length)} destinos encontrados
            {count ? ` • ${count} filtro(s)` : ''}
          </span>
          <button className="button secondary" type="button" onClick={() => setIsOpen((current) => !current)}>
            {isOpen ? 'Recolher filtros' : 'Expandir filtros'}
          </button>
          <button
            className="icon-button"
            title="Limpar filtros"
            type="button"
            onClick={() => onFiltersChange({ ...EMPTY_CONSOLIDATED_FILTERS, year: analytics.selectedYear })}
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="filters-grid consolidated-filter-grid">
          <label className="field">
            <span>Ano</span>
            <select
              value={filters.year || analytics.selectedYear}
              onChange={(event) => setFilter(filters, onFiltersChange, 'year', event.target.value)}
            >
              {options.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <SelectFilter
            label="Mês"
            options={options.months}
            value={filters.month}
            onChange={(value) => setFilter(filters, onFiltersChange, 'month', value)}
          />
          <label className="field search-field">
            <span>Busca por destino</span>
            <div className="search-input">
              <Search size={16} aria-hidden="true" />
              <input
                placeholder="Destino, UF ou status"
                value={filters.search}
                onChange={(event) => setFilter(filters, onFiltersChange, 'search', event.target.value)}
              />
            </div>
          </label>
          <SelectFilter
            label="UF"
            options={options.ufs}
            value={filters.uf}
            onChange={(value) => setFilter(filters, onFiltersChange, 'uf', value)}
          />
          <SelectFilter
            label="Status"
            options={options.statuses}
            value={filters.status}
            onChange={(value) => setFilter(filters, onFiltersChange, 'status', value)}
          />
          <label className="field">
            <span>Tipo de bobina</span>
            <select
              value={filters.bobbinType}
              onChange={(event) => setFilter(filters, onFiltersChange, 'bobbinType', event.target.value)}
            >
              {options.bobbinTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Transações mín.</span>
            <input
              min="0"
              type="number"
              value={filters.minTransactions}
              onChange={(event) => setFilter(filters, onFiltersChange, 'minTransactions', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Transações máx.</span>
            <input
              min="0"
              type="number"
              value={filters.maxTransactions}
              onChange={(event) => setFilter(filters, onFiltersChange, 'maxTransactions', event.target.value)}
            />
          </label>
          <SelectFilter
            label="Faixa de transações"
            options={options.transactionRanges}
            value={filters.transactionRange}
            onChange={(value) => setFilter(filters, onFiltersChange, 'transactionRange', value)}
          />
          <label className="check-field">
            <input
              checked={filters.onlyDivergences}
              type="checkbox"
              onChange={(event) => setFilter(filters, onFiltersChange, 'onlyDivergences', event.target.checked)}
            />
            <span>Somente divergências</span>
          </label>
          <label className="check-field">
            <input
              checked={filters.onlyWithoutCorreios}
              type="checkbox"
              onChange={(event) => setFilter(filters, onFiltersChange, 'onlyWithoutCorreios', event.target.checked)}
            />
            <span>Somente sem envio Correios</span>
          </label>
          <label className="check-field">
            <input
              checked={filters.onlyCorreiosLower}
              type="checkbox"
              onChange={(event) => setFilter(filters, onFiltersChange, 'onlyCorreiosLower', event.target.checked)}
            />
            <span>Somente Correios menor</span>
          </label>
          <label className="check-field">
            <input
              checked={filters.onlyCorreiosHigher}
              type="checkbox"
              onChange={(event) => setFilter(filters, onFiltersChange, 'onlyCorreiosHigher', event.target.checked)}
            />
            <span>Somente Correios maior</span>
          </label>
          <label className="check-field">
            <input
              checked={filters.onlyCorreiosCost}
              type="checkbox"
              onChange={(event) => setFilter(filters, onFiltersChange, 'onlyCorreiosCost', event.target.checked)}
            />
            <span>Somente custo Correios</span>
          </label>
          <label className="check-field">
            <input
              checked={filters.onlyPositiveTotalCost}
              type="checkbox"
              onChange={(event) => setFilter(filters, onFiltersChange, 'onlyPositiveTotalCost', event.target.checked)}
            />
            <span>Somente custo total &gt; 0</span>
          </label>
        </div>
      ) : null}
    </section>
  );
}

function statusTone(status) {
  if (status === 'OK') {
    return 'success';
  }
  if (status === 'Correios menor que solicitação') {
    return 'danger';
  }
  if (status === 'Sem envio Correios' || status === 'Correios maior que solicitação') {
    return 'warning';
  }
  return '';
}

function StatusBadge({ status }) {
  const tone = statusTone(status);
  return <span className={`pill${tone ? ` ${tone}` : ''}`}>{status}</span>;
}

function exportDetailedRecords(rows) {
  downloadCsv('consolidado-destinos-filtrado.csv', rows, [
    { label: 'Destino', key: 'destination' },
    { label: 'UF', key: 'uf' },
    { label: 'Qtd transações', key: 'transactions' },
    { label: 'Solicitação de Bobinas', key: 'requested' },
    { label: 'Qt Correios bobinas', key: 'correios' },
    { label: 'Diferença', key: 'difference' },
    { label: 'Status', key: 'status' },
    { label: 'Faixa de transações', key: 'transactionRangeLabel' },
    { label: 'Qt 16 m', key: 'boxes16' },
    { label: '56 MM X 16 M', key: 'units16' },
    { label: 'Custo 16 m', key: 'cost16' },
    { label: 'Qt 30 m', key: 'boxes30' },
    { label: '56 MM X 30 M', key: 'units30' },
    { label: 'Custo 30 m', key: 'cost30' },
    { label: 'Custo Total Bobinas', key: 'bobbinCost' },
    { label: 'Custo Correios', key: 'correiosCost' },
    { label: 'Custo Total Operação', key: 'operationCost' },
    ...CONSOLIDATED_MONTHS.map((month) => ({
      label: month.label,
      value: (row) => row.months?.[month.key] || 0,
    })),
  ]);
}

function StatusCards({ analytics, filters, onFiltersChange }) {
  return (
    <section className="status-card-grid">
      {analytics.statusSummary.map((row) => (
        <button
          className={`status-card ${statusTone(row.status)}${filters.status === row.status ? ' active' : ''}`}
          key={row.status}
          type="button"
          onClick={() => setFilter(filters, onFiltersChange, 'status', filters.status === row.status ? '' : row.status)}
        >
          <span>{row.status}</span>
          <strong>{formatInteger(row.destinations)}</strong>
          <small>{formatInteger(row.requested)} solicitações • {formatCurrency(row.operationCost)}</small>
        </button>
      ))}
    </section>
  );
}

function detailedColumns() {
  return [
    { key: 'destination', label: 'Destino', render: (row) => <span translate="no">{row.destination}</span> },
    { key: 'uf', label: 'UF', render: (row) => <span className="uf-pill" translate="no">{row.uf}</span> },
    { key: 'transactions', label: 'Transações', value: (row) => formatInteger(row.transactions), sortValue: (row) => row.transactions },
    { key: 'requested', label: 'Solicitação', value: (row) => formatInteger(row.requested), sortValue: (row) => row.requested },
    { key: 'correios', label: 'Correios', value: (row) => formatInteger(row.correios), sortValue: (row) => row.correios },
    { key: 'difference', label: 'Diferença', value: (row) => formatInteger(row.difference), sortValue: (row) => row.difference },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'transactionRangeLabel', label: 'Faixa' },
    ...CONSOLIDATED_MONTHS.map((month) => ({
      key: month.key,
      label: month.shortLabel,
      value: (row) => formatInteger(row.months?.[month.key] || 0),
      sortValue: (row) => row.months?.[month.key] || 0,
    })),
    { key: 'boxes16', label: 'Qt 16 m', value: (row) => formatInteger(row.boxes16), sortValue: (row) => row.boxes16 },
    { key: 'units16', label: 'Unid. 16 m', value: (row) => formatInteger(row.units16), sortValue: (row) => row.units16 },
    { key: 'cost16', label: 'Custo 16 m', value: (row) => formatCurrency(row.cost16), sortValue: (row) => row.cost16 },
    { key: 'boxes30', label: 'Qt 30 m', value: (row) => formatInteger(row.boxes30), sortValue: (row) => row.boxes30 },
    { key: 'units30', label: 'Unid. 30 m', value: (row) => formatInteger(row.units30), sortValue: (row) => row.units30 },
    { key: 'cost30', label: 'Custo 30 m', value: (row) => formatCurrency(row.cost30), sortValue: (row) => row.cost30 },
    { key: 'bobbinCost', label: 'Custo Bobinas', value: (row) => formatCurrency(row.bobbinCost), sortValue: (row) => row.bobbinCost },
    { key: 'correiosCost', label: 'Custo Correios', value: (row) => formatCurrency(row.correiosCost), sortValue: (row) => row.correiosCost },
    { key: 'operationCost', label: 'Custo Operação', value: (row) => formatCurrency(row.operationCost), sortValue: (row) => row.operationCost },
  ];
}

function ufColumns() {
  return [
    { key: 'uf', label: 'UF', render: (row) => <span className="uf-pill" translate="no">{row.uf}</span> },
    { key: 'destinations', label: 'Destinos', value: (row) => formatInteger(row.destinations), sortValue: (row) => row.destinations },
    { key: 'transactions', label: 'Transações', value: (row) => formatInteger(row.transactions), sortValue: (row) => row.transactions },
    { key: 'requested', label: 'Solicitação', value: (row) => formatInteger(row.requested), sortValue: (row) => row.requested },
    { key: 'correios', label: 'Correios', value: (row) => formatInteger(row.correios), sortValue: (row) => row.correios },
    { key: 'difference', label: 'Diferença', value: (row) => formatInteger(row.difference), sortValue: (row) => row.difference },
    { key: 'operationCost', label: 'Custo total', value: (row) => formatCurrency(row.operationCost), sortValue: (row) => row.operationCost },
  ];
}

function rankingColumns() {
  return [
    { key: 'destination', label: 'Destino', render: (row) => <span translate="no">{row.destination}</span> },
    { key: 'uf', label: 'UF', render: (row) => <span className="uf-pill" translate="no">{row.uf}</span> },
    { key: 'requestedView', label: 'Solicitações', value: (row) => formatInteger(row.requestedView), sortValue: (row) => row.requestedView },
    { key: 'boxesView', label: 'Caixas', value: (row) => formatInteger(row.boxesView), sortValue: (row) => row.boxesView },
    { key: 'operationCost', label: 'Custo total', value: (row) => formatCurrency(row.operationCost), sortValue: (row) => row.operationCost },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
}

export default function Destinations({ analytics, datasetState, filters, hasData, onFiltersChange }) {
  const missingColumns = datasetState?.meta?.missingColumns || [];
  const topUfChart = useMemo(() => analytics.ufSummary.slice(0, 10), [analytics.ufSummary]);

  if (!hasData) {
    return (
      <div className="page-grid">
        <section className="section-heading">
          <div>
            <p className="eyebrow">Bobinas</p>
            <h2>Consolidado por Destino</h2>
            <p>Análise de solicitações, custos, envios Correios e divergências por destino.</p>
          </div>
        </section>
        <article className="empty-state">
          <h2>Base Consolidado Bobinas ainda não carregada.</h2>
          <p>Abra Fonte de dados para carregar a aba do Google Sheets ou importar um CSV/XLSX com o consolidado.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="section-heading split">
        <div>
          <p className="eyebrow">Bobinas</p>
          <h2>Consolidado por Destino</h2>
          <p>Análise de solicitações, custos, envios Correios e divergências por destino.</p>
        </div>
        <div className="heading-actions">
          <label className="field inline-field">
            <span>Ano analisado</span>
            <select
              value={filters.year || analytics.selectedYear}
              onChange={(event) => setFilter(filters, onFiltersChange, 'year', event.target.value)}
            >
              {analytics.options.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <button className="button secondary" type="button" onClick={() => exportDetailedRecords(analytics.filteredRecords)}>
            <Download size={18} aria-hidden="true" />
            Baixar filtrado
          </button>
        </div>
      </section>

      <ConsolidatedFilters analytics={analytics} filters={filters} onFiltersChange={onFiltersChange} />

      {missingColumns.length ? (
        <article className="alert-box warning">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>Colunas obrigatórias não identificadas</strong>
            <p>{missingColumns.join(', ')}</p>
          </div>
        </article>
      ) : null}

      <section className="metrics-grid">
        <MetricCard icon={Building2} title="Destinos consolidados" value={formatInteger(analytics.summary.destinations)} />
        <MetricCard icon={Boxes} title="Solicitações de bobinas" value={formatInteger(analytics.summary.requested)} tone="primary" />
        <MetricCard icon={Truck} title="Envios Correios bobinas" value={formatInteger(analytics.summary.correios)} />
        <MetricCard icon={AlertTriangle} title="Diferença total" value={formatInteger(analytics.summary.difference)} tone={analytics.summary.difference ? 'warning' : 'success'} />
        <MetricCard icon={PackageCheck} title="Caixas equivalentes" value={formatInteger(analytics.summary.boxes)} />
        <MetricCard icon={DollarSign} title="Custo total bobinas" value={formatCurrency(analytics.summary.bobbinCost)} tone="success" />
        <MetricCard icon={DollarSign} title="Custo Correios" value={formatCurrency(analytics.summary.correiosCost)} tone="primary" />
        <MetricCard icon={DollarSign} title="Custo total operação" value={formatCurrency(analytics.summary.operationCost)} tone="warning" />
        <MetricCard icon={AlertTriangle} title="Destinos com divergência" value={formatInteger(analytics.summary.divergenceDestinations)} tone={analytics.summary.divergenceDestinations ? 'warning' : 'success'} />
        <MetricCard icon={Gauge} title="Média transações/destino" value={formatDecimal(analytics.summary.averageTransactions)} />
      </section>

      <StatusCards analytics={analytics} filters={filters} onFiltersChange={onFiltersChange} />

      <section className="section-heading">
        <div>
          <p className="eyebrow">Alertas do consolidado</p>
          <h2>Pontos de atenção</h2>
          <p>Prioridades calculadas sobre o recorte filtrado.</p>
        </div>
      </section>
      <AlertBox alerts={analytics.alerts} />

      <section className="charts-grid two">
        <ChartCard title="Evolução mensal Jan-Dez" subtitle="Solicitações por mês no recorte filtrado">
          <ResponsiveContainer height={320} width="100%">
            <BarChart data={analytics.monthly}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="shortMonth" />
              <YAxis tickFormatter={(value) => formatInteger(value)} />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Bar dataKey="requested" fill="#2563EB" name="Solicitações" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="56 MM X 16 M x 56 MM X 30 M" subtitle="Unidades, caixas e valor por tipo">
          <ResponsiveContainer height={220} width="100%">
            <BarChart data={analytics.typeComparison}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="type" />
              <YAxis tickFormatter={(value) => formatInteger(value)} />
              <Tooltip formatter={(value, name) => (name === 'Custo' ? formatCurrency(value) : formatInteger(value))} />
              <Legend />
              <Bar dataKey="units" fill="#2563EB" name="Unidades" radius={[4, 4, 0, 0]} />
              <Bar dataKey="boxes" fill="#16A34A" name="Caixas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <DataTable
            columns={[
              { key: 'type', label: 'Tipo' },
              { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
              { key: 'requests', label: 'Solicitações', value: (row) => formatInteger(row.requests), sortValue: (row) => row.requests },
              { key: 'boxes', label: 'Caixas equivalentes', value: (row) => formatInteger(row.boxes), sortValue: (row) => row.boxes },
              { key: 'cost', label: 'Valor', value: (row) => formatCurrency(row.cost), sortValue: (row) => row.cost },
            ]}
            rows={analytics.typeComparison}
          />
        </ChartCard>
      </section>

      <section className="charts-grid two">
        <ChartCard title="Resumo por UF" subtitle="Estados com maior solicitação no recorte">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={topUfChart} layout="vertical">
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis type="number" tickFormatter={(value) => formatInteger(value)} />
              <YAxis dataKey="uf" type="category" width={54} />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Bar dataKey="requested" fill="#2563EB" name="Solicitação" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <DataTable columns={ufColumns()} rows={analytics.ufSummary} />
        </ChartCard>

        <ChartCard title="Ranking de destinos" subtitle="Maiores solicitações do recorte">
          <DataTable columns={rankingColumns()} rows={analytics.rankings.byRequested} />
        </ChartCard>
      </section>

      <section className="cards-grid three">
        <ChartCard title="Faixas de transações" subtitle="Distribuição fixa por volume">
          <DataTable
            columns={[
              { key: 'range', label: 'Faixa' },
              { key: 'destinations', label: 'Destinos', value: (row) => formatInteger(row.destinations), sortValue: (row) => row.destinations },
              { key: 'transactions', label: 'Transações', value: (row) => formatInteger(row.transactions), sortValue: (row) => row.transactions },
              { key: 'requested', label: 'Solicitações', value: (row) => formatInteger(row.requested), sortValue: (row) => row.requested },
              { key: 'operationCost', label: 'Custo', value: (row) => formatCurrency(row.operationCost), sortValue: (row) => row.operationCost },
            ]}
            rows={analytics.rangeAnalysis}
          />
        </ChartCard>

        <ChartCard title="Status operacional" subtitle="Classificação por divergência">
          <DataTable
            columns={[
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              { key: 'destinations', label: 'Destinos', value: (row) => formatInteger(row.destinations), sortValue: (row) => row.destinations },
              { key: 'requested', label: 'Solicitação', value: (row) => formatInteger(row.requested), sortValue: (row) => row.requested },
              { key: 'correios', label: 'Correios', value: (row) => formatInteger(row.correios), sortValue: (row) => row.correios },
              { key: 'difference', label: 'Diferença', value: (row) => formatInteger(row.difference), sortValue: (row) => row.difference },
            ]}
            rows={analytics.statusSummary}
          />
        </ChartCard>

        <ChartCard title="Maiores impactos" subtitle="Divergências e custos mais relevantes">
          <DataTable columns={rankingColumns()} rows={analytics.rankings.byDifference.length ? analytics.rankings.byDifference : analytics.rankings.byCost} />
        </ChartCard>
      </section>

      <ChartCard title="Tabela detalhada do consolidado" subtitle="Destino a destino com custos, tipos e divergências">
        <DataTable columns={detailedColumns()} rows={analytics.filteredRecords} />
      </ChartCard>
    </div>
  );
}
