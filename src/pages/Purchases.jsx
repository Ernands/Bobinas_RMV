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
import {
  BOBBIN_CONFIGS,
  ceilBoxes,
  formatCurrency,
  formatInteger,
} from '../utils/calculations';
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

const STATUS_MODE_OPTIONS = [
  { value: 'sent', label: 'Enviado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'all', label: 'Todos' },
];

function monthKeyFromToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function signedBoxesFromUnits(units, type) {
  if (!Number.isFinite(units) || units === 0) {
    return 0;
  }
  const boxes = ceilBoxes(Math.abs(units), BOBBIN_CONFIGS[type].unitsPerBox);
  return units < 0 ? -boxes : boxes;
}

function buildStockPart({ boxes16, boxes30, units16, units30 }) {
  const safeBoxes16 = Number.isFinite(boxes16) ? boxes16 : signedBoxesFromUnits(units16, '16');
  const safeBoxes30 = Number.isFinite(boxes30) ? boxes30 : signedBoxesFromUnits(units30, '30');
  const safeUnits16 = Number.isFinite(units16) ? units16 : 0;
  const safeUnits30 = Number.isFinite(units30) ? units30 : 0;

  return {
    boxes16: safeBoxes16,
    boxes30: safeBoxes30,
    totalBoxes: safeBoxes16 + safeBoxes30,
    units16: safeUnits16,
    units30: safeUnits30,
    totalUnits: safeUnits16 + safeUnits30,
  };
}

function getConsumptionUnits(row, type) {
  const field = type === '16' ? 'consumption16Units' : 'consumption30Units';
  const filteredField = type === '16' ? 'filteredConsumption16Units' : 'filteredConsumption30Units';
  if (row?.filteredConsumptionAvailable && Number.isFinite(row[filteredField])) {
    return row[filteredField];
  }
  return Number.isFinite(row?.[field]) ? row[field] : 0;
}

function getBalanceUnits(row, type, openingUnits, consumptionUnits) {
  const field = type === '16' ? 'balance16Units' : 'balance30Units';
  if (row?.filteredConsumptionAvailable) {
    return openingUnits - consumptionUnits;
  }
  return Number.isFinite(row?.[field]) ? row[field] : openingUnits - consumptionUnits;
}

function buildOperationalFlow(row, rows) {
  if (!row) {
    return null;
  }

  const currentIndex = rows.findIndex((item) => item.monthKey === row.monthKey);
  const previousRow = currentIndex > 0 ? rows[currentIndex - 1] : null;
  const nextRow = currentIndex >= 0 ? rows[currentIndex + 1] : null;
  const previousBalance16 = Number.isFinite(previousRow?.balance16Units) ? previousRow.balance16Units : 0;
  const previousBalance30 = Number.isFinite(previousRow?.balance30Units) ? previousRow.balance30Units : 0;
  const opening16Units = (Number(row.units16) || 0) + previousBalance16;
  const opening30Units = (Number(row.units30) || 0) + previousBalance30;
  const consumption16Units = getConsumptionUnits(row, '16');
  const consumption30Units = getConsumptionUnits(row, '30');
  const balance16Units = getBalanceUnits(row, '16', opening16Units, consumption16Units);
  const balance30Units = getBalanceUnits(row, '30', opening30Units, consumption30Units);
  const probable16Units = (Number(nextRow?.units16) || 0) + balance16Units;
  const probable30Units = (Number(nextRow?.units30) || 0) + balance30Units;

  return {
    monthKey: row.monthKey,
    label: formatPlanningMonth(row.monthKey),
    purchases: buildStockPart({
      boxes16: row.boxes16,
      boxes30: row.boxes30,
      units16: row.units16,
      units30: row.units30,
    }),
    previousBalance: buildStockPart({
      units16: previousBalance16,
      units30: previousBalance30,
    }),
    opening: buildStockPart({
      boxes16: row.boxes16 + signedBoxesFromUnits(previousBalance16, '16'),
      boxes30: row.boxes30 + signedBoxesFromUnits(previousBalance30, '30'),
      units16: opening16Units,
      units30: opening30Units,
    }),
    consumption: buildStockPart({
      units16: consumption16Units,
      units30: consumption30Units,
    }),
    balance: buildStockPart({
      units16: balance16Units,
      units30: balance30Units,
    }),
    probable: buildStockPart({
      boxes16: (Number(nextRow?.boxes16) || 0) + signedBoxesFromUnits(balance16Units, '16'),
      boxes30: (Number(nextRow?.boxes30) || 0) + signedBoxesFromUnits(balance30Units, '30'),
      units16: probable16Units,
      units30: probable30Units,
    }),
    nextPurchase: buildStockPart({
      boxes16: nextRow?.boxes16 || 0,
      boxes30: nextRow?.boxes30 || 0,
      units16: nextRow?.units16 || 0,
      units30: nextRow?.units30 || 0,
    }),
  };
}

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
    filters.month,
    filters.status,
    filters.type,
    filters.statusMode !== 'sent' ? filters.statusMode : '',
    filters.onlyCritical,
    filters.onlyWithoutPurchase,
    filters.onlyWithConsumption,
  ].filter(Boolean).length;
  const monthOptions = planning.rows.map((row) => ({
    value: row.monthKey,
    label: formatPlanningMonth(row.monthKey),
  }));

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
            <span>Mês</span>
            <select value={filters.month} onChange={(event) => onChange('month', event.target.value)}>
              <option value="">Ano completo</option>
              {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={filters.statusMode} onChange={(event) => onChange('statusMode', event.target.value)}>
              {STATUS_MODE_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
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

function StockFlowMetric({ icon: Icon, label, part, status, tone }) {
  return (
    <article className={`stock-flow-metric ${tone}`}>
      <span className="stock-flow-metric-icon">
        <Icon size={22} aria-hidden="true" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{formatInteger(part.totalBoxes)} caixas</strong>
        <small>{formatInteger(part.totalUnits)} unidades</small>
        <em>
          16M: {formatInteger(part.boxes16)} cx / {formatInteger(part.units16)} un.
          <br />
          30M: {formatInteger(part.boxes30)} cx / {formatInteger(part.units30)} un.
        </em>
      </div>
      {status ? planningStatus(status.label, status.tone) : null}
    </article>
  );
}

function StockFlowChart({ flow }) {
  const chartTop = 72;
  const chartBottom = 276;
  const bars = [
    {
      key: 'opening',
      title: 'ESTOQUE INICIADO',
      label: 'Estoque iniciado',
      part: flow.opening,
      colors: ['#60A5FA', '#2563EB'],
      valueClass: 'opening',
      x: 160,
    },
    {
      key: 'consumption',
      title: 'CONSUMO DO MÊS',
      label: 'Consumo',
      part: flow.consumption,
      colors: ['#FDBA74', '#EA580C'],
      valueClass: 'consumption',
      x: 390,
    },
    {
      key: 'balance',
      title: 'SALDO DO MÊS',
      label: 'Saldo',
      part: flow.balance,
      colors: flow.balance.totalUnits < 0 ? ['#FCA5A5', '#B91C1C'] : ['#1E3A8A', '#0F172A'],
      valueClass: flow.balance.totalUnits < 0 ? 'negative' : 'balance',
      x: 620,
    },
    {
      key: 'probable',
      title: 'ESTOQUE PROVÁVEL',
      label: 'Estoque provável',
      part: flow.probable,
      colors: flow.probable.totalUnits < 0 ? ['#FED7AA', '#C2410C'] : ['#86EFAC', '#16A34A'],
      valueClass: flow.probable.totalUnits < 0 ? 'negative' : 'probable',
      x: 850,
    },
  ];
  const largestAbsoluteValue = Math.max(
    1,
    ...bars.flatMap((bar) => {
      const positive = [bar.part.units16, bar.part.units30].filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
      const negative = [bar.part.units16, bar.part.units30].filter((value) => value < 0).reduce((sum, value) => sum + value, 0);
      return [Math.abs(positive), Math.abs(negative), Math.abs(bar.part.totalUnits)];
    }),
  );
  const magnitude = 10 ** Math.floor(Math.log10(largestAbsoluteValue));
  const extent = Math.max(magnitude, Math.ceil(largestAbsoluteValue / magnitude) * magnitude);
  const minValue = -extent;
  const maxValue = extent;

  function y(value) {
    return chartTop + ((maxValue - value) / (maxValue - minValue)) * (chartBottom - chartTop);
  }

  const zeroY = y(0);
  const ticks = [extent, extent / 2, 0, -extent / 2, -extent];
  const barWidth = 118;

  function renderSegments(bar) {
    let positiveBase = 0;
    let negativeBase = 0;
    return [
      { key: '16', value: bar.part.units16, color: bar.colors[0] },
      { key: '30', value: bar.part.units30, color: bar.colors[1] },
    ].filter((segment) => Number.isFinite(segment.value) && segment.value !== 0)
      .map((segment) => {
        const start = segment.value >= 0 ? positiveBase : negativeBase;
        const end = start + segment.value;
        if (segment.value >= 0) {
          positiveBase = end;
        } else {
          negativeBase = end;
        }
        const y1 = y(start);
        const y2 = y(end);
        const rectY = Math.min(y1, y2);
        const height = Math.max(2, Math.abs(y2 - y1));
        return (
          <rect
            fill={segment.color}
            height={height}
            key={`${bar.key}-${segment.key}`}
            rx="5"
            width={barWidth}
            x={bar.x - (barWidth / 2)}
            y={rectY}
          />
        );
      });
  }

  return (
    <div className="stock-flow-chart">
      <div className="stock-flow-chart-title">
        <BarChart3 size={19} aria-hidden="true" />
        <strong>Visão do fluxo de estoque</strong>
        <span>{flow.label}</span>
      </div>
      <svg
        aria-label={`Fluxo de estoque de ${flow.label}. Estoque iniciado em ${formatInteger(flow.opening.totalBoxes)} caixas, consumo de ${formatInteger(flow.consumption.totalBoxes)} caixas, saldo de ${formatInteger(flow.balance.totalBoxes)} caixas e estoque provável de ${formatInteger(flow.probable.totalBoxes)} caixas.`}
        role="img"
        viewBox="0 0 1040 340"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="stock-flow-grid-line" x1="72" x2="980" y1={y(tick)} y2={y(tick)} />
            <text className="stock-flow-axis-label" textAnchor="end" x="62" y={y(tick) + 4}>
              {formatInteger(Math.round(tick))}
            </text>
          </g>
        ))}
        <line className="stock-flow-zero-line" x1="72" x2="980" y1={zeroY} y2={zeroY} />

        {bars.map((bar, index) => (
          <g key={bar.key}>
            <text className="stock-flow-bar-heading" textAnchor="middle" x={bar.x} y="24">{bar.title}</text>
            <text className={`stock-flow-bar-value ${bar.valueClass}`} textAnchor="middle" x={bar.x} y="46">
              {formatInteger(bar.part.totalBoxes)} cx
            </text>
            <text className="stock-flow-bar-units" textAnchor="middle" x={bar.x} y="63">
              {formatInteger(bar.part.totalUnits)} un.
            </text>
            {renderSegments(bar)}
            <text className="stock-flow-category" textAnchor="middle" x={bar.x} y="314">{bar.label}</text>
            {index < bars.length - 1 ? (
              <line
                className="stock-flow-connector"
                x1={bar.x + (barWidth / 2)}
                x2={bars[index + 1].x - (barWidth / 2)}
                y1={y(bar.part.totalUnits)}
                y2={y(bar.part.totalUnits)}
              />
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function StockFlowComposition({ flow }) {
  const previousBalanceIsNegative = flow.previousBalance.totalUnits < 0;
  const balanceIsNegative = flow.balance.totalUnits < 0;

  return (
    <div className="stock-flow-composition">
      <section>
        <h4>Composição operacional</h4>
        <div className="stock-flow-equation">
          <div className="stock-flow-equation-item">
            <span>Compra 16 M</span>
            <strong>{formatInteger(flow.purchases.boxes16)} cx</strong>
            <small>{formatInteger(flow.purchases.units16)} un.</small>
          </div>
          <Plus size={17} aria-hidden="true" />
          <div className="stock-flow-equation-item">
            <span>Compra 30 M</span>
            <strong>{formatInteger(flow.purchases.boxes30)} cx</strong>
            <small>{formatInteger(flow.purchases.units30)} un.</small>
          </div>
          <Plus size={17} aria-hidden="true" />
          <div className={`stock-flow-equation-item ${previousBalanceIsNegative ? 'negative' : ''}`}>
            <span>Saldo anterior</span>
            <strong>{formatInteger(flow.previousBalance.totalBoxes)} cx</strong>
            <small>{formatInteger(flow.previousBalance.totalUnits)} un.</small>
          </div>
          <Equal size={18} aria-hidden="true" />
          <div className="stock-flow-equation-item total">
            <span>Estoque iniciado</span>
            <strong>{formatInteger(flow.opening.totalBoxes)} cx</strong>
            <small>{formatInteger(flow.opening.totalUnits)} un.</small>
          </div>
        </div>
        <div className="stock-flow-equation probable">
          <div className="stock-flow-equation-item">
            <span>Compra seguinte</span>
            <strong>{formatInteger(flow.nextPurchase.totalBoxes)} cx</strong>
            <small>{formatInteger(flow.nextPurchase.totalUnits)} un.</small>
          </div>
          <Plus size={17} aria-hidden="true" />
          <div className={`stock-flow-equation-item ${balanceIsNegative ? 'negative' : ''}`}>
            <span>Saldo do mês</span>
            <strong>{formatInteger(flow.balance.totalBoxes)} cx</strong>
            <small>{formatInteger(flow.balance.totalUnits)} un.</small>
          </div>
          <Equal size={18} aria-hidden="true" />
          <div className={`stock-flow-equation-item total ${flow.probable.totalUnits < 0 ? 'negative' : ''}`}>
            <span>Estoque provável</span>
            <strong>{formatInteger(flow.probable.totalBoxes)} cx</strong>
            <small>{formatInteger(flow.probable.totalUnits)} un.</small>
          </div>
        </div>
      </section>
      <section className="stock-flow-formula">
        <h4>Fórmula de cálculo</h4>
        <p>
          <Boxes size={17} aria-hidden="true" />
          <span><strong>Estoque iniciado</strong> = compra 16 M + compra 30 M + saldo anterior</span>
        </p>
        <p>
          <Equal size={17} aria-hidden="true" />
          <span><strong>Saldo do mês</strong> = estoque iniciado - consumo do mês</span>
        </p>
        <p>
          <PackageCheck size={17} aria-hidden="true" />
          <span><strong>Estoque provável</strong> = compra do mês seguinte + saldo do mês</span>
        </p>
      </section>
    </div>
  );
}

function OperationalMonth({ flow, row, statusMode }) {
  const statusLabel = STATUS_MODE_OPTIONS.find((option) => option.value === statusMode)?.label || 'Enviado';
  const balanceStatus = flow.balance.totalUnits < 0
    ? { label: 'Crítico', tone: 'danger' }
    : { label: 'Coberto', tone: 'success' };

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
          <small>Gráfico em {flow.label}; status {statusLabel.toLowerCase()}</small>
        </div>
        <div className="stock-flow-metrics">
          <StockFlowMetric
            icon={Boxes}
            label="Estoque iniciado"
            part={flow.opening}
            tone="opening"
          />
          <StockFlowMetric
            icon={BarChart3}
            label="Consumo do mês"
            part={flow.consumption}
            tone="consumption"
          />
          <StockFlowMetric
            icon={Layers3}
            label="Saldo do mês"
            part={flow.balance}
            status={balanceStatus}
            tone={flow.balance.totalUnits < 0 ? 'negative' : 'balance'}
          />
          <StockFlowMetric
            icon={PackageCheck}
            label="Estoque provável"
            part={flow.probable}
            tone={flow.probable.totalUnits < 0 ? 'negative' : 'probable'}
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

function PlanningTable({ currentMonthKey, rows }) {
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
              <th className="header-period sticky-month">Mês Compra</th>
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
              <th className="header-balance">Consumo 16 m</th>
              <th className="header-balance">Saldo</th>
              <th className="header-balance">Consumo 30 m</th>
              <th className="header-balance">Saldo</th>
              <th className="header-date">Data Pedido</th>
              <th className="header-date">Data Entrega/Prevista</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrentMonth = row.monthKey === currentMonthKey;
              const isFutureMonth = currentMonthKey && row.monthKey > currentMonthKey;
              return (
              <tr
                className={[
                  isCurrentMonth ? 'current-month' : '',
                  isFutureMonth ? 'future-month' : '',
                ].filter(Boolean).join(' ')}
                key={row.id}
              >
                <td className="sticky-month">
                  <strong>{planningDisplay(row, 'month', formatPlanningMonth(row.monthKey))}</strong>
                  {isCurrentMonth ? <small>Mês atual</small> : null}
                </td>
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
                <td>{planningDisplay(row, 'consumption16', Number.isFinite(row.consumption16Units) ? formatInteger(row.consumption16Units) : '-')}</td>
                <td className={Number.isFinite(row.balance16Units) && row.balance16Units < 0 ? 'balance-negative' : ''}>
                  {planningDisplay(row, 'balance16', Number.isFinite(row.balance16Units) ? formatInteger(row.balance16Units) : '-')}
                </td>
                <td>{planningDisplay(row, 'consumption30', Number.isFinite(row.consumption30Units) ? formatInteger(row.consumption30Units) : '-')}</td>
                <td className={Number.isFinite(row.balance30Units) && row.balance30Units < 0 ? 'balance-negative' : ''}>
                  {planningDisplay(row, 'balance30', Number.isFinite(row.balance30Units) ? formatInteger(row.balance30Units) : '-')}
                </td>
                <td>{planningDisplay(row, 'orderDate', formatPlanningDate(row.orderDate))}</td>
                <td>{planningDisplay(row, 'deliveryDate', formatPlanningDate(row.deliveryDate))}</td>
              </tr>
              );
            })}
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
    month: '',
    statusMode: 'sent',
    status: '',
    type: '',
    onlyCritical: false,
    onlyWithoutPurchase: false,
    onlyWithConsumption: false,
  });
  const planning = useMemo(
    () => buildPurchasePlanning(planningRecords, bobbinRecords, rawPurchases, selectedYear, {
      consumptionStatusMode: filters.statusMode,
    }),
    [planningRecords, bobbinRecords, rawPurchases, selectedYear, filters.statusMode],
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
  const totalsScope = useMemo(
    () => planning.rows.find((row) => row.monthKey === filters.month) || planning.totals,
    [filters.month, planning.rows, planning.totals],
  );
  const visibleTotals = useMemo(
    () => getPlanningTotalsForType(totalsScope, filters.type),
    [totalsScope, filters.type],
  );
  const operationalMonth = useMemo(
    () => getOperationalMonth(planning.rows, planning.year),
    [planning.rows, planning.year],
  );
  const flowMonth = useMemo(
    () => planning.rows.find((row) => row.monthKey === filters.month) || operationalMonth,
    [filters.month, operationalMonth, planning.rows],
  );
  const operationalFlow = useMemo(
    () => buildOperationalFlow(flowMonth, planning.rows),
    [flowMonth, planning.rows],
  );
  const currentMonthKey = useMemo(() => monthKeyFromToday(), []);

  useEffect(() => {
    if (filters.month && !planning.rows.some((row) => row.monthKey === filters.month)) {
      setFilters((current) => ({ ...current, month: '' }));
    }
  }, [filters.month, planning.rows]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function resetFilters() {
    setFilters({
      month: '',
      statusMode: 'sent',
      status: '',
      type: '',
      onlyCritical: false,
      onlyWithoutPurchase: false,
      onlyWithConsumption: false,
    });
  }

  function exportMonthlyCsv() {
    downloadCsv(`planejamento-mensal-${planning.year}.csv`, planning.rows, [
      { label: 'Mês Compra', value: (row) => planningDisplay(row, 'month', formatPlanningMonth(row.monthKey)) },
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
      { label: 'Consumo 16 m', value: (row) => planningDisplay(row, 'consumption16', Number.isFinite(row.consumption16Units) ? formatInteger(row.consumption16Units) : '-') },
      { label: 'Saldo 16 m', value: (row) => planningDisplay(row, 'balance16', Number.isFinite(row.balance16Units) ? formatInteger(row.balance16Units) : '-') },
      { label: 'Consumo 30 m', value: (row) => planningDisplay(row, 'consumption30', Number.isFinite(row.consumption30Units) ? formatInteger(row.consumption30Units) : '-') },
      { label: 'Saldo 30 m', value: (row) => planningDisplay(row, 'balance30', Number.isFinite(row.balance30Units) ? formatInteger(row.balance30Units) : '-') },
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
        <OperationalMonth flow={operationalFlow} row={operationalMonth} statusMode={filters.statusMode} />
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
        <PlanningTable currentMonthKey={currentMonthKey} rows={visibleRows} />
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
