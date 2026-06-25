import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  Download,
  Equal,
  Filter,
  Layers3,
  PackageCheck,
  Plus,
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

function StockFlowMetric({ detail, icon: Icon, label, status, tone, value }) {
  return (
    <article className={`stock-flow-metric ${tone}`}>
      <span className="stock-flow-metric-icon">
        <Icon size={22} aria-hidden="true" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      {status ? planningStatus(status.label, status.tone) : null}
    </article>
  );
}

function StockFlowChart({ flow }) {
  const chartTop = 58;
  const chartBottom = 252;
  const largestAbsoluteValue = Math.max(1, Math.abs(flow.openingStock), Math.abs(flow.finalBalance));
  const magnitude = 10 ** Math.floor(Math.log10(largestAbsoluteValue));
  const extent = Math.ceil(largestAbsoluteValue / magnitude) * magnitude;
  const minValue = -extent;
  const maxValue = extent;

  function y(value) {
    return chartTop + ((maxValue - value) / (maxValue - minValue)) * (chartBottom - chartTop);
  }

  const zeroY = y(0);
  const openingY = y(flow.openingStock);
  const balanceY = y(flow.finalBalance);
  const openingRectY = Math.min(openingY, zeroY);
  const openingRectHeight = Math.max(2, Math.abs(zeroY - openingY));
  const consumptionRectY = Math.min(openingY, balanceY);
  const consumptionRectHeight = Math.max(2, Math.abs(balanceY - openingY));
  const balanceRectY = Math.min(zeroY, balanceY);
  const balanceRectHeight = Math.max(2, Math.abs(balanceY - zeroY));
  const ticks = [extent, extent / 2, 0, -extent / 2, -extent];

  return (
    <div className="stock-flow-chart">
      <div className="stock-flow-chart-title">
        <BarChart3 size={19} aria-hidden="true" />
        <strong>Visão do fluxo de estoque</strong>
        <span>Unidades</span>
      </div>
      <svg
        aria-label={`Fluxo de estoque: iniciado em ${formatInteger(flow.openingStock)}, consumo de ${formatInteger(flow.consumption)}, saldo de ${formatInteger(flow.finalBalance)} unidades.`}
        role="img"
        viewBox="0 0 920 310"
      >
        <defs>
          <linearGradient id="stock-opening" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="stock-consumption" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="stock-balance-positive" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="stock-balance-negative" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line className="stock-flow-grid-line" x1="68" x2="876" y1={y(tick)} y2={y(tick)} />
            <text className="stock-flow-axis-label" textAnchor="end" x="58" y={y(tick) + 4}>
              {formatInteger(Math.round(tick))}
            </text>
          </g>
        ))}
        <line className="stock-flow-zero-line" x1="68" x2="876" y1={zeroY} y2={zeroY} />

        <text className="stock-flow-bar-heading" textAnchor="middle" x="215" y="22">ESTOQUE INICIADO</text>
        <text className="stock-flow-bar-value opening" textAnchor="middle" x="215" y="43">
          {formatInteger(flow.openingStock)} un.
        </text>
        <rect fill="url(#stock-opening)" height={openingRectHeight} rx="5" width="130" x="150" y={openingRectY} />

        <text className="stock-flow-bar-heading" textAnchor="middle" x="475" y="22">CONSUMO DO MÊS</text>
        <text className="stock-flow-bar-value consumption" textAnchor="middle" x="475" y="43">
          -{formatInteger(flow.consumption)} un.
        </text>
        <rect fill="url(#stock-consumption)" height={consumptionRectHeight} rx="5" width="130" x="410" y={consumptionRectY} />

        <text className="stock-flow-bar-heading" textAnchor="middle" x="735" y="22">SALDO DO MÊS</text>
        <text
          className={`stock-flow-bar-value ${flow.finalBalance < 0 ? 'negative' : 'balance'}`}
          textAnchor="middle"
          x="735"
          y="43"
        >
          {formatInteger(flow.finalBalance)} un.
        </text>
        <rect
          fill={`url(#${flow.finalBalance < 0 ? 'stock-balance-negative' : 'stock-balance-positive'})`}
          height={balanceRectHeight}
          rx="5"
          width="130"
          x="670"
          y={balanceRectY}
        />

        <line className="stock-flow-connector" x1="280" x2="410" y1={openingY} y2={openingY} />
        <line className="stock-flow-connector" x1="540" x2="670" y1={balanceY} y2={balanceY} />

        <text className="stock-flow-category" textAnchor="middle" x="215" y="286">Estoque iniciado</text>
        <text className="stock-flow-category" textAnchor="middle" x="475" y="286">Consumo</text>
        <text className="stock-flow-category" textAnchor="middle" x="735" y="286">Saldo final</text>
      </svg>
    </div>
  );
}

function StockFlowComposition({ flow }) {
  return (
    <div className="stock-flow-composition">
      <section>
        <h4>Composição do estoque iniciado</h4>
        <div className="stock-flow-equation">
          <div className="stock-flow-equation-item">
            <span>Compra 16 M</span>
            <strong>{formatInteger(flow.purchase16)}</strong>
          </div>
          <Plus size={17} aria-hidden="true" />
          <div className="stock-flow-equation-item">
            <span>Compra 30 M</span>
            <strong>{formatInteger(flow.purchase30)}</strong>
          </div>
          <Plus size={17} aria-hidden="true" />
          <div className={`stock-flow-equation-item ${flow.previousBalance < 0 ? 'negative' : ''}`}>
            <span>Saldo anterior</span>
            <strong>{formatInteger(flow.previousBalance)}</strong>
          </div>
          <Equal size={18} aria-hidden="true" />
          <div className="stock-flow-equation-item total">
            <span>Estoque iniciado</span>
            <strong>{formatInteger(flow.openingStock)}</strong>
          </div>
        </div>
      </section>
      <section className="stock-flow-formula">
        <h4>Fórmula de cálculo</h4>
        <p>
          <Boxes size={17} aria-hidden="true" />
          <span><strong>Estoque iniciado</strong> = compras 16 M + compras 30 M + saldo anterior</span>
        </p>
        <p>
          <Equal size={17} aria-hidden="true" />
          <span><strong>Saldo do mês</strong> = estoque iniciado - consumo do mês</span>
        </p>
      </section>
    </div>
  );
}

function OperationalMonth({ flow, row }) {
  return (
    <section className="planning-operational-group">
      <div className="planning-operational-strip">
        <div className="planning-operational-title">
          <span>Mês atual operacional</span>
          <strong>{formatPlanningMonth(row.monthKey)}</strong>
        </div>
        <OperationalValue icon={CalendarDays} label="Data pedido" value={formatPlanningDate(row.orderDate)} />
        <OperationalValue icon={CalendarDays} label="Entrega prevista" value={formatPlanningDate(row.deliveryDate)} />
        <OperationalQuantity label="16 M" boxes={row.boxes16} units={row.units16} />
        <OperationalQuantity label="30 M" boxes={row.boxes30} units={row.units30} tone="medium" />
        <OperationalQuantity label="Total" boxes={row.totalBoxes} units={row.totalUnits} tone="total" />
      </div>

      <div className="stock-flow-section">
        <div className="stock-flow-heading">
          <div>
            <span>Fluxo de estoque do mês</span>
            <h3>Compras, consumo e saldo operacional</h3>
          </div>
          <small>Valores consolidados em unidades</small>
        </div>
        <div className="stock-flow-metrics">
          <StockFlowMetric
            detail="Unidades disponíveis no início do mês"
            icon={Boxes}
            label="Estoque iniciado"
            tone="opening"
            value={`${formatInteger(flow.openingStock)} un.`}
          />
          <StockFlowMetric
            detail="Unidades consumidas no mês atual"
            icon={BarChart3}
            label="Consumo do mês"
            tone="consumption"
            value={`${formatInteger(flow.consumption)} un.`}
          />
          <StockFlowMetric
            detail="Unidades disponíveis ao final do mês"
            icon={Layers3}
            label="Saldo do mês"
            status={{ label: row.status, tone: row.statusTone }}
            tone={flow.finalBalance < 0 ? 'negative' : 'balance'}
            value={`${formatInteger(flow.finalBalance)} un.`}
          />
        </div>
        <StockFlowChart flow={flow} />
        <StockFlowComposition flow={flow} />
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
  const operationalFlow = useMemo(() => {
    if (!operationalMonth) {
      return null;
    }
    const currentIndex = planning.rows.findIndex((row) => row.monthKey === operationalMonth.monthKey);
    const previousRow = currentIndex > 0 ? planning.rows[currentIndex - 1] : null;
    const previousBalance = Number.isFinite(previousRow?.balanceUnits) ? previousRow.balanceUnits : 0;
    const purchase16 = Number(operationalMonth.units16) || 0;
    const purchase30 = Number(operationalMonth.units30) || 0;
    const openingStock = purchase16 + purchase30 + previousBalance;
    const consumption = Number.isFinite(operationalMonth.consumptionUnits)
      ? operationalMonth.consumptionUnits
      : 0;
    const finalBalance = Number.isFinite(operationalMonth.balanceUnits)
      ? operationalMonth.balanceUnits
      : openingStock - consumption;

    return {
      purchase16,
      purchase30,
      previousBalance,
      openingStock,
      consumption,
      finalBalance,
    };
  }, [operationalMonth, planning.rows]);
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

      {operationalMonth && operationalFlow ? (
        <OperationalMonth flow={operationalFlow} row={operationalMonth} />
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
