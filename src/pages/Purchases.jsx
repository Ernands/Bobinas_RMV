import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  Layers3,
  PackageCheck,
  RotateCcw,
} from 'lucide-react';
import PurchaseAnnualSummary from '../components/PurchaseAnnualSummary';
import { formatCurrency, formatInteger } from '../utils/calculations';
import { downloadCsv } from '../utils/csvExport';
import {
  buildPurchasePlanning,
  filterPurchasePlanningRows,
  formatPlanningDate,
  formatPlanningMonth,
  getOperationalMonth,
  getPlanningTotalsForType,
} from '../utils/purchasePlanning';

const STATUS_OPTIONS = [
  'Coberto',
  'Atenção',
  'Crítico',
  'Sem compra planejada',
  'Sem dados suficientes',
];

function planningStatus(status, tone) {
  return <span className={`planning-status ${tone}`}>{status}</span>;
}

function PurchaseSummaryCard({
  label,
  boxes,
  units,
  value,
  icon: Icon,
  tone = 'blue',
}) {
  return (
    <article className={`purchase-summary-card ${tone}`}>
      <div className="purchase-summary-icon">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="purchase-summary-content">
        <span>{label}</span>
        <strong>{formatInteger(boxes)} caixas</strong>
        <small>{formatInteger(units)} unidades</small>
        <b>{formatCurrency(value)}</b>
      </div>
    </article>
  );
}

function FilterSwitch({ checked, label, onChange }) {
  return (
    <label className="planning-switch">
      <input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function PlanningFilters({
  filters,
  isOpen,
  onChange,
  onReset,
  onToggle,
  planning,
  selectedYear,
  onYearChange,
}) {
  const activeCount = [
    filters.status,
    filters.type,
    filters.onlyCritical,
    filters.onlyWithoutPurchase,
    filters.onlyWithConsumption,
  ].filter(Boolean).length;

  return (
    <section className={`planning-filter-panel${isOpen ? ' open' : ' collapsed'}`}>
      <div className="planning-filter-heading">
        <div>
          <p className="eyebrow">Filtros</p>
          <h3>Recorte do planejamento</h3>
          <span>{activeCount ? `${activeCount} filtro(s) ativo(s)` : 'Somente o ano mais recente'}</span>
        </div>
        <div className="button-row">
          <button className="icon-button" title="Limpar filtros" type="button" onClick={onReset}>
            <RotateCcw size={17} aria-hidden="true" />
          </button>
          <button
            aria-expanded={isOpen}
            className={`button secondary planning-filter-toggle${isOpen ? ' open' : ''}`}
            type="button"
            onClick={onToggle}
          >
            <Filter size={17} aria-hidden="true" />
            Filtros
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="planning-filters">
          <label className="field">
            <span>Ano</span>
            <select value={selectedYear || planning.year} onChange={(event) => onYearChange(event.target.value)}>
              {planning.years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Status de cobertura</span>
            <select value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Tipo de bobina</span>
            <select value={filters.type} onChange={(event) => onChange('type', event.target.value)}>
              <option value="">Todos</option>
              <option value="16">16 M</option>
              <option value="30">30 M</option>
            </select>
          </label>
          <div className="planning-filter-switches">
            <FilterSwitch
              checked={filters.onlyCritical}
              label="Somente meses críticos"
              onChange={(value) => onChange('onlyCritical', value)}
            />
            <FilterSwitch
              checked={filters.onlyWithoutPurchase}
              label="Meses sem compra"
              onChange={(value) => onChange('onlyWithoutPurchase', value)}
            />
            <FilterSwitch
              checked={filters.onlyWithConsumption}
              label="Somente com consumo"
              onChange={(value) => onChange('onlyWithConsumption', value)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OperationalQuantity({ label, boxes, units, tone = '' }) {
  return (
    <div className={`operational-quantity ${tone}`}>
      <Boxes size={18} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{formatInteger(boxes)} caixas</strong>
        <small>{formatInteger(units)} unidades</small>
      </div>
    </div>
  );
}

function OperationalValue({ icon: Icon, label, value, detail, tone = '' }) {
  return (
    <div className={`operational-value ${tone}`}>
      <Icon size={17} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  );
}

function OperationalMonth({ row }) {
  return (
    <section className="planning-operational-strip">
      <div className="planning-operational-title">
        <span>Mês atual operacional</span>
        <strong>{formatPlanningMonth(row.monthKey)}</strong>
      </div>
      <OperationalValue icon={CalendarDays} label="Data pedido" value={formatPlanningDate(row.orderDate)} />
      <OperationalValue icon={CalendarDays} label="Entrega prevista" value={formatPlanningDate(row.deliveryDate)} />
      <OperationalQuantity label="16 M" boxes={row.boxes16} units={row.units16} />
      <OperationalQuantity label="30 M" boxes={row.boxes30} units={row.units30} tone="medium" />
      <OperationalQuantity label="Total" boxes={row.totalBoxes} units={row.totalUnits} tone="total" />
      <OperationalValue
        icon={BarChart3}
        label="Consumo"
        value={Number.isFinite(row.consumptionUnits) ? formatInteger(row.consumptionUnits) : '-'}
        detail="Unidades"
        tone="orange"
      />
      <OperationalValue
        icon={Layers3}
        label="Saldo"
        value={Number.isFinite(row.balanceUnits) ? formatInteger(row.balanceUnits) : '-'}
        detail="Unidades"
        tone={Number.isFinite(row.balanceUnits) && row.balanceUnits < 0 ? 'danger' : 'orange'}
      />
      <div className="operational-status">
        <span>Status</span>
        {planningStatus(row.status, row.statusTone)}
      </div>
    </section>
  );
}

function planningDisplay(row, key, fallback) {
  if (row.display && Object.prototype.hasOwnProperty.call(row.display, key)) {
    return String(row.display[key] ?? '');
  }
  return fallback;
}

function PlanningTable({ rows }) {
  const bodyRef = useRef(null);
  const tableRef = useRef(null);
  const topRef = useRef(null);
  const syncingRef = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    function updateWidth() {
      setScrollWidth(tableRef.current?.scrollWidth || 0);
    }
    updateWidth();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateWidth);
    if (observer && tableRef.current) {
      observer.observe(tableRef.current);
    }
    window.addEventListener('resize', updateWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [rows.length]);

  function sync(source, target) {
    if (syncingRef.current || !source.current || !target.current) {
      return;
    }
    syncingRef.current = true;
    target.current.scrollLeft = source.current.scrollLeft;
    window.requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }

  return (
    <div className="planning-table-frame">
      <div
        aria-hidden="true"
        className="planning-scrollbar-top"
        onScroll={() => sync(topRef, bodyRef)}
        ref={topRef}
      >
        <div style={{ width: `${scrollWidth}px` }} />
      </div>
      <div
        className="planning-table-shell"
        onScroll={() => sync(bodyRef, topRef)}
        ref={bodyRef}
      >
        <table className="planning-table exact-columns" ref={tableRef}>
          <thead>
            <tr>
              <th className="header-period sticky-month">Mês de Consumo</th>
              <th className="header-period">Mês Compra</th>
              <th className="header-period">Trans. Mês Consumo</th>
              <th className="header-16">Unidades - 16M</th>
              <th className="header-16">Caixa - 16M</th>
              <th className="header-16">Valor - 16M</th>
              <th className="header-30">Unidades - 30M</th>
              <th className="header-30">Caixa - 30M</th>
              <th className="header-30">Valor - 30M</th>
              <th className="header-total">Total 16 M e 30M</th>
              <th className="header-total">Total caixas</th>
              <th className="header-total">Total Valor</th>
              <th className="header-balance">Consumo</th>
              <th className="header-balance">Saldo</th>
              <th className="header-date">Data Pedido</th>
              <th className="header-date">Data Entrega/Prevista</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="sticky-month">
                  <strong>{planningDisplay(row, 'consumptionMonth', formatPlanningMonth(row.consumptionMonth))}</strong>
                </td>
                <td>{planningDisplay(row, 'purchaseMonth', formatPlanningMonth(row.purchaseMonth))}</td>
                <td>{planningDisplay(row, 'transactions', formatInteger(row.transactions))}</td>
                <td>{planningDisplay(row, 'units16', formatInteger(row.units16))}</td>
                <td>{planningDisplay(row, 'boxes16', formatInteger(row.boxes16))}</td>
                <td>{planningDisplay(row, 'value16', formatCurrency(row.value16))}</td>
                <td>{planningDisplay(row, 'units30', formatInteger(row.units30))}</td>
                <td>{planningDisplay(row, 'boxes30', formatInteger(row.boxes30))}</td>
                <td>{planningDisplay(row, 'value30', formatCurrency(row.value30))}</td>
                <td>{planningDisplay(row, 'totalUnits', formatInteger(row.totalUnits))}</td>
                <td>{planningDisplay(row, 'totalBoxes', formatInteger(row.totalBoxes))}</td>
                <td className="planning-total-value">{planningDisplay(row, 'totalValue', formatCurrency(row.totalValue))}</td>
                <td>{planningDisplay(row, 'consumption', Number.isFinite(row.consumptionUnits) ? formatInteger(row.consumptionUnits) : '-')}</td>
                <td className={Number.isFinite(row.balanceUnits) && row.balanceUnits < 0 ? 'balance-negative' : ''}>
                  {planningDisplay(row, 'balance', Number.isFinite(row.balanceUnits) ? formatInteger(row.balanceUnits) : '-')}
                </td>
                <td>{planningDisplay(row, 'orderDate', formatPlanningDate(row.orderDate))}</td>
                <td>{planningDisplay(row, 'deliveryDate', formatPlanningDate(row.deliveryDate))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Purchases({
  bobbinRecords,
  datasetState,
  planningRecords,
  rawPurchases,
}) {
  const [selectedYear, setSelectedYear] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    onlyCritical: false,
    onlyWithoutPurchase: false,
    onlyWithConsumption: false,
  });
  const planning = useMemo(
    () => buildPurchasePlanning(planningRecords, bobbinRecords, rawPurchases, selectedYear),
    [planningRecords, bobbinRecords, rawPurchases, selectedYear],
  );

  useEffect(() => {
    if (!selectedYear || !planning.years.includes(selectedYear)) {
      setSelectedYear(planning.year);
    }
  }, [planning.year, planning.years, selectedYear]);

  const visibleRows = useMemo(
    () => filterPurchasePlanningRows(planning.rows, filters),
    [planning.rows, filters],
  );
  const visibleTotals = useMemo(
    () => getPlanningTotalsForType(planning.totals, filters.type),
    [planning.totals, filters.type],
  );
  const operationalMonth = useMemo(
    () => getOperationalMonth(planning.rows, planning.year),
    [planning.rows, planning.year],
  );
  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function resetFilters() {
    setFilters({
      status: '',
      type: '',
      onlyCritical: false,
      onlyWithoutPurchase: false,
      onlyWithConsumption: false,
    });
  }

  function exportMonthlyCsv() {
    downloadCsv(`planejamento-mensal-${planning.year}.csv`, planning.rows, [
      { label: 'Mês de Consumo', value: (row) => planningDisplay(row, 'consumptionMonth', formatPlanningMonth(row.consumptionMonth)) },
      { label: 'Mês Compra', value: (row) => planningDisplay(row, 'purchaseMonth', formatPlanningMonth(row.purchaseMonth)) },
      { label: 'Trans. Mês Consumo', value: (row) => planningDisplay(row, 'transactions', formatInteger(row.transactions)) },
      { label: 'Unidades - 16M', value: (row) => planningDisplay(row, 'units16', formatInteger(row.units16)) },
      { label: 'Caixa - 16M', value: (row) => planningDisplay(row, 'boxes16', formatInteger(row.boxes16)) },
      { label: 'Valor - 16M', value: (row) => planningDisplay(row, 'value16', formatCurrency(row.value16)) },
      { label: 'Unidades - 30M', value: (row) => planningDisplay(row, 'units30', formatInteger(row.units30)) },
      { label: 'Caixa - 30M', value: (row) => planningDisplay(row, 'boxes30', formatInteger(row.boxes30)) },
      { label: 'Valor - 30M', value: (row) => planningDisplay(row, 'value30', formatCurrency(row.value30)) },
      { label: 'Total 16 M e 30M', value: (row) => planningDisplay(row, 'totalUnits', formatInteger(row.totalUnits)) },
      { label: 'Total caixas', value: (row) => planningDisplay(row, 'totalBoxes', formatInteger(row.totalBoxes)) },
      { label: 'Total Valor', value: (row) => planningDisplay(row, 'totalValue', formatCurrency(row.totalValue)) },
      { label: 'Consumo', value: (row) => planningDisplay(row, 'consumption', Number.isFinite(row.consumptionUnits) ? formatInteger(row.consumptionUnits) : '-') },
      { label: 'Saldo', value: (row) => planningDisplay(row, 'balance', Number.isFinite(row.balanceUnits) ? formatInteger(row.balanceUnits) : '-') },
      { label: 'Data Pedido', value: (row) => planningDisplay(row, 'orderDate', formatPlanningDate(row.orderDate)) },
      { label: 'Data Entrega/Prevista', value: (row) => planningDisplay(row, 'deliveryDate', formatPlanningDate(row.deliveryDate)) },
    ]);
  }

  function exportAnnualCsv() {
    downloadCsv('resumo-anual-planejamento.csv', planning.annualRows, [
      { label: 'Ano', key: 'year' },
      { label: 'Total Cx 16M', key: 'boxes16' },
      { label: 'Unidades 16M', key: 'units16' },
      { label: 'Valor 16M', key: 'value16' },
      { label: 'Total Cx 30M', key: 'boxes30' },
      { label: 'Unidades 30M', key: 'units30' },
      { label: 'Valor 30M', key: 'value30' },
      { label: 'Total caixas', key: 'totalBoxes' },
      { label: 'Total Transações', key: 'transactions' },
      { label: 'Total Valor', key: 'totalValue' },
    ]);
  }

  return (
    <div className="page-grid purchase-planning-page">
      <section className="section-heading split">
        <div>
          <p className="eyebrow">Bobinas</p>
          <h2>Planejamento de Compras</h2>
          <p>Dados consolidados diretamente da aba Compras_Bobinas.</p>
        </div>
      </section>

      <PlanningFilters
        filters={filters}
        isOpen={isFiltersOpen}
        planning={planning}
        selectedYear={selectedYear}
        onChange={updateFilter}
        onReset={resetFilters}
        onToggle={() => setIsFiltersOpen((current) => !current)}
        onYearChange={setSelectedYear}
      />

      <div className="planning-source-note">
        <div>
          <strong>Fonte: Compras_Bobinas</strong>
          <span>
            {datasetState?.status === 'loaded'
              ? `${planning.sourceSummary.annualYears} anos e ${planning.sourceSummary.monthlyRows} meses identificados.`
              : 'Aguardando carregamento da planilha.'}
          </span>
        </div>
        <span className={`source-badge ${datasetState?.status === 'loaded' ? 'spreadsheet' : 'calculated'}`}>
          {datasetState?.status === 'loaded' ? 'Google Sheets atualizado' : 'Sem dados carregados'}
        </span>
      </div>

      <section className="purchase-summary-grid">
        <PurchaseSummaryCard
          boxes={visibleTotals.boxes16}
          icon={Boxes}
          label="16 M"
          units={visibleTotals.units16}
          value={visibleTotals.value16}
        />
        <PurchaseSummaryCard
          boxes={visibleTotals.boxes30}
          icon={Boxes}
          label="30 M"
          tone="blue-medium"
          units={visibleTotals.units30}
          value={visibleTotals.value30}
        />
        <PurchaseSummaryCard
          boxes={visibleTotals.totalBoxes}
          icon={PackageCheck}
          label="Total Geral"
          tone="navy"
          units={visibleTotals.totalUnits}
          value={visibleTotals.totalValue}
        />
      </section>

      {operationalMonth ? (
        <OperationalMonth row={operationalMonth} />
      ) : null}

      <section className="planning-table-section">
        <div className="section-heading compact">
          <div>
            <h3>Planejamento mensal consolidado</h3>
            <p>Colunas e ordem preservadas conforme a aba Compras_Bobinas.</p>
          </div>
          <button className="button secondary" type="button" onClick={exportMonthlyCsv}>
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
        <PlanningTable rows={visibleRows} />
        {!visibleRows.length ? <div className="empty-state compact-empty">Nenhum mês corresponde aos filtros ativos.</div> : null}
      </section>

      <PurchaseAnnualSummary
        onExport={exportAnnualCsv}
        rows={planning.annualRows}
      />

      <section className="planning-alerts">
        <button
          aria-expanded={isAlertsOpen}
          className="planning-alerts-toggle"
          type="button"
          onClick={() => setIsAlertsOpen((current) => !current)}
        >
          <span>
            <AlertTriangle size={19} aria-hidden="true" />
            <strong>Alertas de planejamento</strong>
            <small>{planning.alerts.length} ocorrência(s)</small>
          </span>
          <ChevronDown className={isAlertsOpen ? 'open' : ''} size={18} aria-hidden="true" />
        </button>
        {isAlertsOpen ? (
          <div className="planning-alert-list">
            {planning.alerts.length ? planning.alerts.map((alert) => (
              <article className={`planning-alert-row ${alert.tone}`} key={alert.id}>
                <AlertTriangle size={18} aria-hidden="true" />
                <strong>{alert.type}</strong>
                <span>{alert.month}</span>
                <span>{alert.affected}</span>
                <p>{alert.explanation}</p>
                <small>{alert.recommendation}</small>
              </article>
            )) : (
              <div className="planning-alert-empty">Nenhum alerta identificado para {planning.year}.</div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
