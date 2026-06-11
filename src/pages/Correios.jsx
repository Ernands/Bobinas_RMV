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
  Boxes,
  DollarSign,
  Download,
  PackageCheck,
  RotateCcw,
  Scale,
  Search,
  Truck,
} from 'lucide-react';
import AlertBox from '../components/AlertBox';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import { downloadCsv } from '../utils/csvExport';
import { formatDateBR } from '../utils/dateUtils';
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatPercent,
} from '../utils/calculations';
import { EMPTY_CORREIOS_FILTERS } from '../utils/correiosAnalytics';

function formatWeight(value) {
  return `${formatDecimal(value)} kg`;
}

function setFilter(filters, onFiltersChange, key, value) {
  onFiltersChange({
    ...filters,
    [key]: value,
    ...(key === 'year' ? { month: '' } : {}),
  });
}

function SelectFilter({ label, options, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CorreiosFilters({ analytics, filters, onFiltersChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const options = analytics.options;
  const activeCount = Object.entries(filters).filter(([key, value]) => (
    Boolean(value) && !(key === 'year') && !(key === 'serviceMode' && value === 'all')
  )).length;

  return (
    <section className={`filters-panel ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Filtros Correios</p>
          <h2>Recorte de envios</h2>
        </div>
        <div className="heading-actions">
          <span className="filter-summary">
            {formatInteger(analytics.filteredRecords.length)} envios encontrados
            {activeCount ? ` • ${activeCount} filtro(s)` : ''}
          </span>
          <button
            className="button secondary"
            type="button"
            onClick={() => setIsOpen((current) => !current)}
          >
            {isOpen ? 'Recolher filtros' : 'Expandir filtros'}
          </button>
          <button
            className="icon-button"
            title="Limpar filtros"
            type="button"
            onClick={() => onFiltersChange({ ...EMPTY_CORREIOS_FILTERS, year: analytics.selectedYear })}
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="filters-grid correios-filter-grid">
          <label className="field">
            <span>Ano</span>
            <select
              value={filters.year || analytics.selectedYear}
              onChange={(event) => setFilter(filters, onFiltersChange, 'year', event.target.value)}
            >
              {options.years.length ? options.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              )) : <option value={analytics.selectedYear}>{analytics.selectedYear}</option>}
            </select>
          </label>
          <label className="field">
            <span>Mês</span>
            <select
              value={filters.month}
              onChange={(event) => setFilter(filters, onFiltersChange, 'month', event.target.value)}
            >
              <option value="">Todos</option>
              {options.months.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>
          <SelectFilter
            label="Serviço dos Correios"
            options={options.services}
            value={filters.service}
            onChange={(value) => setFilter(filters, onFiltersChange, 'service', value)}
          />
          <SelectFilter
            label="Tipo de chamado"
            options={options.callTypes}
            value={filters.callType}
            onChange={(value) => setFilter(filters, onFiltersChange, 'callType', value)}
          />
          <SelectFilter
            label="Coban"
            options={options.cobans}
            value={filters.coban}
            onChange={(value) => setFilter(filters, onFiltersChange, 'coban', value)}
          />
          <SelectFilter
            label="Loja"
            options={options.lojas}
            value={filters.loja}
            onChange={(value) => setFilter(filters, onFiltersChange, 'loja', value)}
          />
          <SelectFilter
            label="Unidade de postagem"
            options={options.postingUnits}
            value={filters.postingUnit}
            onChange={(value) => setFilter(filters, onFiltersChange, 'postingUnit', value)}
          />
          <label className="field">
            <span>Tipo de serviço</span>
            <select
              value={filters.serviceMode}
              onChange={(event) => setFilter(filters, onFiltersChange, 'serviceMode', event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pac">Somente PAC</option>
              <option value="sedex">Somente SEDEX</option>
              <option value="reverso">Somente Reversos</option>
            </select>
          </label>
          <label className="field">
            <span>Valor mínimo</span>
            <input
              min="0"
              type="number"
              value={filters.minValue}
              onChange={(event) => setFilter(filters, onFiltersChange, 'minValue', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Valor máximo</span>
            <input
              min="0"
              type="number"
              value={filters.maxValue}
              onChange={(event) => setFilter(filters, onFiltersChange, 'maxValue', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Peso mínimo</span>
            <input
              min="0"
              step="0.001"
              type="number"
              value={filters.minWeight}
              onChange={(event) => setFilter(filters, onFiltersChange, 'minWeight', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Peso máximo</span>
            <input
              min="0"
              step="0.001"
              type="number"
              value={filters.maxWeight}
              onChange={(event) => setFilter(filters, onFiltersChange, 'maxWeight', event.target.value)}
            />
          </label>
          <label className="field search-field">
            <span>Busca</span>
            <div className="search-input">
              <Search size={16} aria-hidden="true" />
              <input
                placeholder="Chamado, rastreio, Coban, loja..."
                value={filters.search}
                onChange={(event) => setFilter(filters, onFiltersChange, 'search', event.target.value)}
              />
            </div>
          </label>
        </div>
      ) : null}
    </section>
  );
}

function serviceBadge(record) {
  const tone = record.isReverse ? 'reverso' : record.isSedex ? 'sedex' : record.isPac ? 'pac' : 'outros';
  return <span className={`service-badge ${tone}`}>{record.serviceGroup}</span>;
}

function rankingColumns(nameLabel = 'Nome') {
  return [
    { key: 'name', label: nameLabel },
    { key: 'shipments', label: 'Envios', value: (row) => formatInteger(row.shipments), sortValue: (row) => row.shipments },
    { key: 'totalCost', label: 'Valor total', value: (row) => formatCurrency(row.totalCost), sortValue: (row) => row.totalCost },
    { key: 'averageCost', label: 'Custo médio', value: (row) => formatCurrency(row.averageCost), sortValue: (row) => row.averageCost },
  ];
}

function detailedColumns() {
  return [
    { key: 'postingDate', label: 'Data da postagem', value: (row) => formatDateBR(row.postingDate), sortValue: (row) => row.postingDate?.getTime() || 0 },
    { key: 'tracking', label: 'Rastreamento' },
    { key: 'service', label: 'Serviço dos Correios', render: (row) => (
      <span className="service-cell">{serviceBadge(row)} {row.service}</span>
    ) },
    { key: 'callType', label: 'Tipo de chamado', render: (row) => (
      <span className={row.callType === 'Não informado' ? 'pill warning' : 'pill'}>{row.callType}</span>
    ) },
    { key: 'callNumber', label: 'Número do chamado', value: (row) => row.callNumber || '-' },
    { key: 'weightKg', label: 'Peso', value: (row) => formatWeight(row.weightKg), sortValue: (row) => row.weightKg },
    { key: 'postingUnit', label: 'Unidade da postagem' },
    { key: 'cep', label: 'CEP' },
    { key: 'unitValue', label: 'Valor unitário', value: (row) => formatCurrency(row.unitValue), sortValue: (row) => row.unitValue },
    { key: 'discountValue', label: 'Valor desconto', value: (row) => formatCurrency(row.discountValue), sortValue: (row) => row.discountValue },
    { key: 'serviceValue', label: 'Valor serviço', value: (row) => formatCurrency(row.serviceValue), sortValue: (row) => row.serviceValue },
    { key: 'coban', label: 'Coban' },
    { key: 'loja', label: 'Loja' },
  ];
}

function exportFilteredRecords(rows) {
  downloadCsv('correios-envios-filtrados.csv', rows, [
    { label: 'Data da postagem', value: (row) => formatDateBR(row.postingDate) },
    { label: 'Rastreamento', key: 'tracking' },
    { label: 'Serviço dos Correios', key: 'service' },
    { label: 'Tipo de chamado', key: 'callType' },
    { label: 'Número do chamado', key: 'callNumber' },
    { label: 'Peso', key: 'weightKg' },
    { label: 'Unidade da postagem', key: 'postingUnit' },
    { label: 'CEP', key: 'cep' },
    { label: 'Valor unitário', key: 'unitValue' },
    { label: 'Valor desconto', key: 'discountValue' },
    { label: 'Valor serviço', key: 'serviceValue' },
    { label: 'Coban', key: 'coban' },
    { label: 'Loja', key: 'loja' },
  ]);
}

function CallTypeCards({ analytics, expandedCallType, onExpand }) {
  return (
    <section className="calltype-card-grid">
      {analytics.callTypes.slice(0, 6).map((row) => (
        <button
          className={`calltype-card ${expandedCallType === row.callType ? 'active' : ''}`}
          key={row.callType}
          type="button"
          onClick={() => onExpand(expandedCallType === row.callType ? '' : row.callType)}
        >
          <strong>{row.callType}</strong>
          <span>{formatInteger(row.shipments)} envios</span>
          <b>{formatCurrency(row.totalCost)}</b>
          <small>Custo médio {formatCurrency(row.averageCost)}</small>
          <small>PAC: {formatInteger(row.pac)} | SEDEX: {formatInteger(row.sedex)} | Reversos: {formatInteger(row.reversos)}</small>
          <small>{formatPercent(row.percentageCost)} do custo anual • Pico: {row.peakMonth}</small>
        </button>
      ))}
    </section>
  );
}

function Drilldown({ row }) {
  if (!row) {
    return null;
  }

  const monthlyData = row.monthlyRows.map((month) => ({
    month: month.monthKey ? month.monthKey.slice(5) : '',
    envios: month.shipments,
    valor: month.totalCost,
  }));
  const buildTop = (field) => {
    const map = new Map();
    row.records.forEach((record) => {
      const name = record[field] || 'Não informado';
      const current = map.get(name) || { id: name, name, shipments: 0, totalCost: 0 };
      current.shipments += 1;
      current.totalCost += record.serviceValue;
      map.set(name, current);
    });
    return Array.from(map.values())
      .sort((a, b) => b.totalCost - a.totalCost || b.shipments - a.shipments)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        averageCost: item.shipments ? item.totalCost / item.shipments : 0,
      }));
  };

  return (
    <section className="drilldown-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Detalhamento</p>
          <h3>{row.callType}</h3>
        </div>
        <span className="pill">{formatInteger(row.shipments)} envios</span>
      </div>

      <section className="metrics-grid compact-metrics">
        <MetricCard icon={Truck} title="Envios" value={formatInteger(row.shipments)} />
        <MetricCard icon={DollarSign} title="Valor total" value={formatCurrency(row.totalCost)} tone="success" />
        <MetricCard icon={Scale} title="Peso total" value={formatWeight(row.totalWeight)} tone="warning" />
        <MetricCard icon={PackageCheck} title="Mês de pico" value={row.peakMonth} />
      </section>

      <section className="charts-grid two">
        <ChartCard title="Envios por mês" subtitle="Quantidade e custo do tipo selecionado">
          <ResponsiveContainer height={260} width="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name) => (name === 'valor' ? formatCurrency(value) : formatInteger(value))} />
              <Legend />
              <Bar dataKey="valor" fill="#2563EB" name="Valor" radius={[4, 4, 0, 0]} />
              <Bar dataKey="envios" fill="#16A34A" name="Envios" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="PAC x SEDEX x Reversos" subtitle="Composição do tipo selecionado">
          <DataTable
            columns={[
              { key: 'metric', label: 'Tipo' },
              { key: 'value', label: 'Envios', value: (item) => formatInteger(item.value), sortValue: (item) => item.value },
            ]}
            rows={[
              { id: 'pac', metric: 'PAC', value: row.pac },
              { id: 'sedex', metric: 'SEDEX', value: row.sedex },
              { id: 'reversos', metric: 'Reversos', value: row.reversos },
            ]}
          />
        </ChartCard>
      </section>

      <section className="cards-grid three">
        <ChartCard title="Top Cobans" subtitle="Maiores custos no tipo">
          <DataTable columns={rankingColumns('Coban')} rows={buildTop('coban')} />
        </ChartCard>
        <ChartCard title="Top Lojas" subtitle="Maiores custos no tipo">
          <DataTable columns={rankingColumns('Loja')} rows={buildTop('loja')} />
        </ChartCard>
        <ChartCard title="Top Unidades" subtitle="Maiores custos no tipo">
          <DataTable columns={rankingColumns('Unidade')} rows={buildTop('postingUnit')} />
        </ChartCard>
      </section>

      <ChartCard title="Tabela detalhada do tipo" subtitle="Somente o tipo de chamado expandido">
        <DataTable columns={detailedColumns()} rows={row.records} />
      </ChartCard>
    </section>
  );
}

export default function Correios({ analytics, filters, hasData, onFiltersChange }) {
  const [matrixMode, setMatrixMode] = useState('value');
  const [expandedCallType, setExpandedCallType] = useState('');
  const expandedRow = analytics.callTypes.find((row) => row.callType === expandedCallType);
  const matrixColumns = useMemo(() => [
    { key: 'callType', label: 'Tipo de chamado' },
    ...analytics.monthly.map((month) => ({
      key: month.monthKey,
      label: month.shortMonth,
      value: (row) => {
        const value = matrixMode === 'value' ? row.monthValues[month.monthKey] : row.monthCounts[month.monthKey];
        return matrixMode === 'value' ? formatCurrency(value) : formatInteger(value);
      },
      sortValue: (row) => (matrixMode === 'value' ? row.monthValues[month.monthKey] : row.monthCounts[month.monthKey]),
      render: (row, raw) => {
        const value = matrixMode === 'value' ? row.monthValues[month.monthKey] : row.monthCounts[month.monthKey];
        const isPeak = matrixMode === 'value' && value > 0 && value === row.maxMonthValue;
        return <span className={isPeak ? 'matrix-peak' : ''}>{raw}</span>;
      },
    })),
    {
      key: 'total',
      label: 'Total',
      value: (row) => (matrixMode === 'value' ? formatCurrency(row.totalCost) : formatInteger(row.totalShipments)),
      sortValue: (row) => (matrixMode === 'value' ? row.totalCost : row.totalShipments),
    },
  ], [analytics.monthly, matrixMode]);

  if (!hasData) {
    return (
      <div className="page-grid">
        <section className="section-heading">
          <div>
            <p className="eyebrow">Correios</p>
            <h2>Envios Correios</h2>
            <p>Base ainda não carregada. Publique a aba Envios Correios ou importe um CSV/XLSX com essas colunas.</p>
          </div>
        </section>
        <article className="empty-state">
          <h2>Base Envios Correios ainda não possui dados carregados.</h2>
          <p>As análises de Bobinas continuam funcionando de forma independente.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="section-heading split">
        <div>
          <p className="eyebrow">Correios</p>
          <h2>Envios Correios</h2>
          <p>Análise anual por postagem, serviço dos Correios, tipo de chamado, Coban, loja e unidade.</p>
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
          <button className="button secondary" type="button" onClick={() => exportFilteredRecords(analytics.filteredRecords)}>
            <Download size={18} aria-hidden="true" />
            Baixar filtrado
          </button>
        </div>
      </section>

      <CorreiosFilters analytics={analytics} filters={filters} onFiltersChange={onFiltersChange} />

      <section className="metrics-grid">
        <MetricCard icon={Truck} title="Total de envios no ano" value={formatInteger(analytics.summary.shipments)} />
        <MetricCard icon={DollarSign} title="Valor total gasto" value={formatCurrency(analytics.summary.totalCost)} tone="success" />
        <MetricCard icon={PackageCheck} title="Custo médio por envio" value={formatCurrency(analytics.summary.averageCost)} tone="primary" />
        <MetricCard icon={Scale} title="Peso total enviado" value={formatWeight(analytics.summary.totalWeight)} tone="warning" />
        <MetricCard icon={Boxes} title="Total PAC" value={formatInteger(analytics.summary.pac)} />
        <MetricCard icon={Boxes} title="Total SEDEX" value={formatInteger(analytics.summary.sedex)} tone="success" />
        <MetricCard icon={Boxes} title="Total Reversos" value={formatInteger(analytics.summary.reversos)} tone="warning" />
        <MetricCard
          icon={DollarSign}
          title="Mês com maior gasto"
          value={analytics.summary.peakMonth.month}
          subtitle={formatCurrency(analytics.summary.peakMonth.totalCost)}
        />
      </section>

      <AlertBox alerts={analytics.alerts} />

      <section className="charts-grid two">
        <ChartCard title="Valor gasto por mês" subtitle="Todos os 12 meses do ano selecionado">
          <ResponsiveContainer height={310} width="100%">
            <BarChart data={analytics.monthly}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="shortMonth" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="totalCost" fill="#2563EB" name="Valor gasto" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="PAC x SEDEX x Reversos" subtitle="Quantidade por mês">
          <ResponsiveContainer height={310} width="100%">
            <BarChart data={analytics.monthly}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="shortMonth" />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Legend />
              <Bar dataKey="pac" fill="#2563EB" name="PAC" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sedex" fill="#16A34A" name="SEDEX" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reversos" fill="#F59E0B" name="Reversos" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Custos por tipo de chamado</p>
          <h2>Principais geradores de custo</h2>
          <p>Clique em um tipo para abrir o detalhamento operacional.</p>
        </div>
      </section>
      <CallTypeCards analytics={analytics} expandedCallType={expandedCallType} onExpand={setExpandedCallType} />
      <Drilldown row={expandedRow} />

      <section className="charts-grid two">
        <ChartCard title="Chamados que mais geram custo" subtitle="Ordenado por valor total">
          <ResponsiveContainer height={330} width="100%">
            <BarChart data={analytics.costRanking} layout="vertical">
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis type="number" tickFormatter={(value) => formatInteger(value)} />
              <YAxis dataKey="callType" type="category" width={190} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="totalCost" fill="#2563EB" name="Valor total" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Chamados por quantidade de envios" subtitle="Ordenado por volume">
          <ResponsiveContainer height={330} width="100%">
            <BarChart data={analytics.quantityRanking} layout="vertical">
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis type="number" tickFormatter={(value) => formatInteger(value)} />
              <YAxis dataKey="callType" type="category" width={190} />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Bar dataKey="shipments" fill="#16A34A" name="Envios" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <ChartCard title="Matriz anual por tipo de chamado" subtitle="Meses sem dados aparecem zerados">
        <div className="matrix-toolbar">
          <button
            className={`button ${matrixMode === 'value' ? 'primary' : 'secondary'}`}
            type="button"
            onClick={() => setMatrixMode('value')}
          >
            Valor gasto
          </button>
          <button
            className={`button ${matrixMode === 'count' ? 'primary' : 'secondary'}`}
            type="button"
            onClick={() => setMatrixMode('count')}
          >
            Quantidade
          </button>
        </div>
        <DataTable columns={matrixColumns} rows={analytics.matrixRows} />
      </ChartCard>

      <ChartCard title="Tipo de chamado x Serviço dos Correios" subtitle="Composição por PAC, SEDEX e Reversos">
        <DataTable
          columns={[
            { key: 'callType', label: 'Tipo de chamado' },
            { key: 'pac', label: 'PAC', value: (row) => formatInteger(row.pac), sortValue: (row) => row.pac },
            { key: 'sedex', label: 'SEDEX', value: (row) => formatInteger(row.sedex), sortValue: (row) => row.sedex },
            { key: 'reversos', label: 'Reversos', value: (row) => formatInteger(row.reversos), sortValue: (row) => row.reversos },
            { key: 'total', label: 'Total', value: (row) => formatInteger(row.total), sortValue: (row) => row.total },
            { key: 'totalValue', label: 'Valor total', value: (row) => formatCurrency(row.totalValue), sortValue: (row) => row.totalValue },
          ]}
          rows={analytics.crossRows}
        />
      </ChartCard>

      <section className="cards-grid three">
        <ChartCard title="Top Cobans por custo" subtitle="Coban, envios, valor e custo médio">
          <DataTable columns={rankingColumns('Coban')} rows={analytics.rankings.cobans} />
        </ChartCard>
        <ChartCard title="Top Lojas por custo" subtitle="Loja, envios, valor e custo médio">
          <DataTable columns={rankingColumns('Loja')} rows={analytics.rankings.lojas} />
        </ChartCard>
        <ChartCard title="Top Unidades de Postagem" subtitle="Inclui participação de SEDEX e reverso">
          <DataTable
            columns={[
              ...rankingColumns('Unidade'),
              { key: 'sedexPercent', label: '% SEDEX', value: (row) => formatPercent(row.sedexPercent), sortValue: (row) => row.sedexPercent },
              { key: 'reversePercent', label: '% Reverso', value: (row) => formatPercent(row.reversePercent), sortValue: (row) => row.reversePercent },
            ]}
            rows={analytics.rankings.postingUnits}
          />
        </ChartCard>
      </section>

      <ChartCard title="Tabela detalhada dos envios" subtitle="Respeita os filtros ativos">
        <DataTable columns={detailedColumns()} rows={analytics.filteredRecords} />
      </ChartCard>
    </div>
  );
}
