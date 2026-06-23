import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Boxes,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileJson,
  History,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  formatCurrency,
  formatInteger,
} from '../utils/calculations';
import { downloadCsv, downloadJson } from '../utils/csvExport';
import {
  buildPurchasePlanning,
  filterPurchasePlanningRows,
  formatPlanningDate,
  formatPlanningMonth,
  getOperationalMonth,
  getPlanningTotalsForType,
  planningRowToForm,
  PURCHASE_PLANNING_CONFIG,
  serializePlanningForJson,
} from '../utils/purchasePlanning';
import { normalizeImportedPurchases } from '../utils/storage';

const EMPTY_FORM = {
  id: '',
  month: '',
  requestDate: '',
  purchaseDate: '',
  deliveryDate: '',
  boxes16: '',
  boxes30: '',
  note: '',
  initialStockUnits: '',
  initialStockBoxes: '',
};

const STATUS_OPTIONS = [
  'Coberto',
  'Atenção',
  'Crítico',
  'Sem compra planejada',
  'Sem dados suficientes',
];

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return 'Sem consumo';
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}

function formatStockPercent(row, field) {
  if (!row.hasInventoryReference) {
    return 'Sem estoque inicial';
  }
  if (!row.hasConsumption) {
    return 'Sem consumo';
  }
  return formatPercent(row[field]);
}

function formatBalance(row) {
  return Number.isFinite(row.balanceUnits) ? formatInteger(row.balanceUnits) : '-';
}

function stockClass(row, field) {
  if (!row.hasInventoryReference || !row.hasConsumption) {
    return '';
  }
  return row[field] < PURCHASE_PLANNING_CONFIG.thresholds.attention ? 'stock-low' : 'stock-ok';
}

function planningStatus(status, tone) {
  return <span className={`planning-status ${tone}`}>{status}</span>;
}

function PlanningMetricCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  return (
    <article className={`planning-metric-card ${tone}`}>
      <div className="planning-metric-icon">
        <Icon size={21} aria-hidden="true" />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
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

function OperationalItem({ icon: Icon, label, value, detail, tone = '' }) {
  return (
    <div className={`operational-item ${tone}`}>
      <Icon size={17} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  );
}

function SourceLegend({ planning }) {
  const directFields = Object.entries(planning.identifiedFields)
    .filter(([, found]) => found)
    .map(([field]) => field);

  return (
    <div className="planning-source-note">
      <div>
        <strong>Fonte prioritária: planilha Bobinas</strong>
        <span>
          Demanda, datas de solicitação e transações são atualizadas com a planilha carregada.
        </span>
      </div>
      <div className="planning-source-badges">
        <span className="source-badge spreadsheet">
          {planning.sourceSummary.demandMonths} meses com consumo
        </span>
        <span className="source-badge manual">
          {planning.sourceSummary.manualPlanningMonths} planejamentos manuais
        </span>
        <span className="source-badge calculated">
          {directFields.length
            ? `${directFields.length} campo(s) complementar(es) identificado(s)`
            : 'Compras ainda sem colunas próprias na planilha'}
        </span>
      </div>
    </div>
  );
}

function PlanningTable({ rows, totals, selectedType, onEdit, onDelete }) {
  return (
    <div className="planning-table-shell">
      <table className={`planning-table focus-${selectedType || 'all'}`}>
        <thead>
          <tr className="planning-table-groups">
            <th colSpan="5">Período</th>
            <th className="group-16" colSpan="3">56 MM X 16 M</th>
            <th className="group-30" colSpan="3">56 MM X 30 M</th>
            <th colSpan="5">Totais</th>
            <th className="group-stock" colSpan="7">Atual / Estoque</th>
            <th className="group-dates" colSpan="3">Datas finais</th>
          </tr>
          <tr>
            <th className="sticky-month">Mês compra</th>
            <th>Mês consumo</th>
            <th>Trans. mês compra</th>
            <th>Data solicitação</th>
            <th>Previsão de entrega</th>
            <th className="column-16">Unidades 16 M</th>
            <th className="column-16">Caixas 16 M</th>
            <th className="column-16">Valor 16 M</th>
            <th className="column-30">Unidades 30 M</th>
            <th className="column-30">Caixas 30 M</th>
            <th className="column-30">Valor 30 M</th>
            <th>Total 16 M</th>
            <th>Total 30 M</th>
            <th>Total caixas 16 M</th>
            <th>Total caixas 30 M</th>
            <th>Total valor</th>
            <th>Caixas solicitadas</th>
            <th>Unidades solicitadas</th>
            <th>Consumo atual</th>
            <th>% estoque caixas</th>
            <th>% estoque unidades</th>
            <th>Saldo</th>
            <th>Status</th>
            <th>Data compra</th>
            <th>Data entrega prevista</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="sticky-month">
                <strong>{formatPlanningMonth(row.monthKey)}</strong>
                <small>{row.source === 'planilha' ? 'Planilha' : row.source === 'manual' ? 'Manual' : 'Sem compra'}</small>
              </td>
              <td>{formatPlanningMonth(row.consumptionMonth)}</td>
              <td>{formatInteger(row.transactions)}</td>
              <td>{formatPlanningDate(row.requestDate)}</td>
              <td>{formatPlanningDate(row.deliveryDate)}</td>
              <td className="column-16">{formatInteger(row.units16)}</td>
              <td className="column-16">{formatInteger(row.boxes16)}</td>
              <td className="column-16">{formatCurrency(row.value16)}</td>
              <td className="column-30">{formatInteger(row.units30)}</td>
              <td className="column-30">{formatInteger(row.boxes30)}</td>
              <td className="column-30">{formatCurrency(row.value30)}</td>
              <td>{formatInteger(row.units16)}</td>
              <td>{formatInteger(row.units30)}</td>
              <td>{formatInteger(row.boxes16)}</td>
              <td>{formatInteger(row.boxes30)}</td>
              <td className="planning-total-value">{formatCurrency(row.totalValue)}</td>
              <td>{formatInteger(row.boxesRequested)}</td>
              <td>{formatInteger(row.unitsRequested)}</td>
              <td>{formatInteger(row.consumptionUnits)}</td>
              <td className={stockClass(row, 'stockBoxesPercent')}>
                {formatStockPercent(row, 'stockBoxesPercent')}
              </td>
              <td className={stockClass(row, 'stockUnitsPercent')}>
                {formatStockPercent(row, 'stockUnitsPercent')}
              </td>
              <td className={Number.isFinite(row.balanceUnits) && row.balanceUnits < 0 ? 'balance-negative' : ''}>
                {formatBalance(row)}
              </td>
              <td>{planningStatus(row.status, row.statusTone)}</td>
              <td>{formatPlanningDate(row.purchaseDate)}</td>
              <td>{formatPlanningDate(row.formalDeliveryDate)}</td>
              <td>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    title="Editar planejamento mensal"
                    type="button"
                    onClick={() => onEdit(row)}
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  {row.sourceIds.length ? (
                    <button
                      className="icon-button danger"
                      title="Excluir cadastro manual do mês"
                      type="button"
                      onClick={() => onDelete(row.sourceIds)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="sticky-month"><strong>Total Geral</strong></td>
            <td>-</td>
            <td>{formatInteger(totals.transactions)}</td>
            <td>-</td>
            <td>-</td>
            <td>{formatInteger(totals.units16)}</td>
            <td>{formatInteger(totals.boxes16)}</td>
            <td>{formatCurrency(totals.value16)}</td>
            <td>{formatInteger(totals.units30)}</td>
            <td>{formatInteger(totals.boxes30)}</td>
            <td>{formatCurrency(totals.value30)}</td>
            <td>{formatInteger(totals.units16)}</td>
            <td>{formatInteger(totals.units30)}</td>
            <td>{formatInteger(totals.boxes16)}</td>
            <td>{formatInteger(totals.boxes30)}</td>
            <td>{formatCurrency(totals.totalValue)}</td>
            <td>{formatInteger(totals.totalBoxes)}</td>
            <td>{formatInteger(totals.totalUnits)}</td>
            <td>{formatInteger(totals.consumptionUnits)}</td>
            <td>-</td>
            <td>-</td>
            <td>{rows.length ? formatBalance(rows[rows.length - 1]) : '-'}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function MonthlyPlanningForm({ form, onChange, onCancel, onSubmit }) {
  const units16 = (Number(form.boxes16) || 0) * PURCHASE_PLANNING_CONFIG.bobbins['16'].unitsPerBox;
  const units30 = (Number(form.boxes30) || 0) * PURCHASE_PLANNING_CONFIG.bobbins['30'].unitsPerBox;

  return (
    <form className="monthly-planning-form" onSubmit={onSubmit}>
      <label className="field">
        <span>Mês compra</span>
        <input
          required
          type="month"
          value={form.month}
          onChange={(event) => onChange('month', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Data solicitação</span>
        <input type="date" value={form.requestDate} onChange={(event) => onChange('requestDate', event.target.value)} />
      </label>
      <label className="field">
        <span>Data compra</span>
        <input type="date" value={form.purchaseDate} onChange={(event) => onChange('purchaseDate', event.target.value)} />
      </label>
      <label className="field">
        <span>Data entrega prevista</span>
        <input type="date" value={form.deliveryDate} onChange={(event) => onChange('deliveryDate', event.target.value)} />
      </label>
      <label className="field">
        <span>Caixas 56 MM X 16 M</span>
        <input min="0" type="number" value={form.boxes16} onChange={(event) => onChange('boxes16', event.target.value)} />
      </label>
      <label className="field">
        <span>Caixas 56 MM X 30 M</span>
        <input min="0" type="number" value={form.boxes30} onChange={(event) => onChange('boxes30', event.target.value)} />
      </label>
      <label className="field">
        <span>Estoque inicial (unidades)</span>
        <input
          min="0"
          type="number"
          value={form.initialStockUnits}
          onChange={(event) => onChange('initialStockUnits', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Estoque inicial (caixas)</span>
        <input
          min="0"
          type="number"
          value={form.initialStockBoxes}
          onChange={(event) => onChange('initialStockBoxes', event.target.value)}
        />
      </label>
      <label className="field planning-note-field">
        <span>Observação</span>
        <input value={form.note} onChange={(event) => onChange('note', event.target.value)} />
      </label>
      <div className="planning-form-preview">
        <span>{formatInteger(units16)} un. 16 M</span>
        <span>{formatInteger(units30)} un. 30 M</span>
        <strong>
          {formatCurrency(
            units16 * PURCHASE_PLANNING_CONFIG.bobbins['16'].unitCost
            + units30 * PURCHASE_PLANNING_CONFIG.bobbins['30'].unitCost,
          )}
        </strong>
      </div>
      <div className="button-row planning-form-actions">
        <button className="button primary" type="submit">
          <Save size={17} aria-hidden="true" />
          Salvar mês
        </button>
        <button className="button secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function Purchases({
  rawPurchases,
  records,
  datasetState,
  onSave,
  onDelete,
  onReplace,
}) {
  const [selectedYear, setSelectedYear] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    onlyCritical: false,
    onlyWithoutPurchase: false,
    onlyWithConsumption: false,
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(true);
  const [importError, setImportError] = useState('');
  const tableRef = useRef(null);

  const planning = useMemo(
    () => buildPurchasePlanning(records, rawPurchases, selectedYear),
    [records, rawPurchases, selectedYear],
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
    () => getPlanningTotalsForType(visibleRows, filters.type),
    [visibleRows, filters.type],
  );
  const operationalMonth = useMemo(
    () => getOperationalMonth(planning.rows, planning.year),
    [planning.rows, planning.year],
  );
  const criticalMonths = planning.rows.filter((row) => row.status === 'Crítico').length;

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setIsFormOpen(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.month) {
      return;
    }

    onSave({
      id: form.id || `planejamento-${form.month}-${Date.now()}`,
      monthly: true,
      month: form.month,
      requestDate: form.requestDate,
      purchaseDate: form.purchaseDate,
      deliveryDate: form.deliveryDate,
      boxes16: Number(form.boxes16) || 0,
      boxes30: Number(form.boxes30) || 0,
      initialStockUnits: Number(form.initialStockUnits) || 0,
      initialStockBoxes: Number(form.initialStockBoxes) || 0,
      note: form.note,
    });
    resetForm();
  }

  function editRow(row) {
    setForm(planningRowToForm(row));
    setIsFormOpen(true);
    window.requestAnimationFrame(() => {
      document.querySelector('.monthly-planning-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function importJson(file) {
    if (!file) {
      return;
    }

    setImportError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        onReplace(normalizeImportedPurchases(JSON.parse(event.target.result)));
      } catch (error) {
        setImportError(error.message || 'Não foi possível importar o JSON.');
      }
    };
    reader.readAsText(file);
  }

  function exportMonthlyCsv() {
    downloadCsv(`planejamento-mensal-${planning.year}.csv`, planning.rows, [
      { label: 'Mês compra', value: (row) => formatPlanningMonth(row.monthKey) },
      { label: 'Mês consumo', value: (row) => formatPlanningMonth(row.consumptionMonth) },
      { label: 'Transações mês compra', key: 'transactions' },
      { label: 'Data solicitação', value: (row) => formatPlanningDate(row.requestDate) },
      { label: 'Data compra', value: (row) => formatPlanningDate(row.purchaseDate) },
      { label: 'Data entrega prevista', value: (row) => formatPlanningDate(row.formalDeliveryDate) },
      { label: 'Caixas 16 M', key: 'boxes16' },
      { label: 'Unidades 16 M', key: 'units16' },
      { label: 'Valor 16 M', key: 'value16' },
      { label: 'Caixas 30 M', key: 'boxes30' },
      { label: 'Unidades 30 M', key: 'units30' },
      { label: 'Valor 30 M', key: 'value30' },
      { label: 'Caixas solicitadas', key: 'boxesRequested' },
      { label: 'Unidades solicitadas', key: 'unitsRequested' },
      { label: 'Consumo atual', key: 'consumptionUnits' },
      { label: '% estoque caixas', value: (row) => formatStockPercent(row, 'stockBoxesPercent') },
      { label: '% estoque unidades', value: (row) => formatStockPercent(row, 'stockUnitsPercent') },
      { label: 'Saldo', value: (row) => formatBalance(row) },
      { label: 'Status', key: 'status' },
    ]);
  }

  function exportAnnualCsv() {
    downloadCsv(`resumo-anual-planejamento-${planning.year}.csv`, [
      { id: planning.year, year: planning.year, ...planning.totals, criticalMonths },
    ], [
      { label: 'Ano', key: 'year' },
      { label: 'Unidades 16 M', key: 'units16' },
      { label: 'Unidades 30 M', key: 'units30' },
      { label: 'Caixas 16 M', key: 'boxes16' },
      { label: 'Caixas 30 M', key: 'boxes30' },
      { label: 'Valor 16 M', key: 'value16' },
      { label: 'Valor 30 M', key: 'value30' },
      { label: 'Valor total', key: 'totalValue' },
      { label: 'Consumo anual', key: 'consumptionUnits' },
      { label: 'Meses críticos', key: 'criticalMonths' },
    ]);
  }

  function exportAlertsCsv() {
    downloadCsv(`alertas-planejamento-${planning.year}.csv`, planning.alerts, [
      { label: 'Mês', key: 'month' },
      { label: 'Alerta', key: 'type' },
      { label: 'Valor afetado', key: 'affected' },
      { label: 'Explicação', key: 'explanation' },
      { label: 'Recomendação', key: 'recommendation' },
    ]);
  }

  return (
    <div className="page-grid purchase-planning-page">
      <section className="section-heading split">
        <div>
          <p className="eyebrow">Bobinas</p>
          <h2>Planejamento de Compras</h2>
          <p>Planejamento mensal de reposição, consumo atual e saldo operacional.</p>
        </div>
        <div className="button-row planning-heading-actions">
          <button className="button secondary" type="button" onClick={() => setIsFormOpen((current) => !current)}>
            <Plus size={17} aria-hidden="true" />
            Novo planejamento mensal
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => downloadJson('planejamento-compras.json', serializePlanningForJson(rawPurchases))}
          >
            <FileJson size={17} aria-hidden="true" />
            Exportar JSON
          </button>
          <label className="button secondary file-button">
            <Upload size={17} aria-hidden="true" />
            Importar JSON
            <input accept=".json,application/json" type="file" onChange={(event) => importJson(event.target.files?.[0])} />
          </label>
        </div>
      </section>

      <section className="planning-filters">
        <label className="field">
          <span>Ano</span>
          <select value={selectedYear || planning.year} onChange={(event) => setSelectedYear(event.target.value)}>
            {planning.years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Status de cobertura</span>
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Tipo de bobina</span>
          <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
            <option value="">Todos</option>
            <option value="16">56 MM X 16 M</option>
            <option value="30">56 MM X 30 M</option>
          </select>
        </label>
        <label className="field">
          <span>UF</span>
          <select disabled value="">
            <option value="">Suporte futuro</option>
          </select>
        </label>
        <div className="planning-filter-switches">
          <FilterSwitch
            checked={filters.onlyCritical}
            label="Somente meses críticos"
            onChange={(value) => updateFilter('onlyCritical', value)}
          />
          <FilterSwitch
            checked={filters.onlyWithoutPurchase}
            label="Meses sem compra"
            onChange={(value) => updateFilter('onlyWithoutPurchase', value)}
          />
          <FilterSwitch
            checked={filters.onlyWithConsumption}
            label="Somente com consumo"
            onChange={(value) => updateFilter('onlyWithConsumption', value)}
          />
        </div>
      </section>

      <SourceLegend planning={planning} />

      {isFormOpen ? (
        <MonthlyPlanningForm
          form={form}
          onCancel={resetForm}
          onChange={updateForm}
          onSubmit={handleSubmit}
        />
      ) : null}

      {importError ? <div className="upload-status danger">{importError}</div> : null}

      <section className="planning-metrics-grid">
        <PlanningMetricCard
          icon={PackageCheck}
          label="Unidades 56 MM X 16 M"
          value={formatInteger(visibleTotals.units16)}
          detail={`${PURCHASE_PLANNING_CONFIG.bobbins['16'].unitsPerBox} unidades por caixa`}
        />
        <PlanningMetricCard
          icon={PackageCheck}
          label="Unidades 56 MM X 30 M"
          value={formatInteger(visibleTotals.units30)}
          detail={`${PURCHASE_PLANNING_CONFIG.bobbins['30'].unitsPerBox} unidades por caixa`}
          tone="blue-medium"
        />
        <PlanningMetricCard icon={Boxes} label="Caixas 56 MM X 16 M" value={formatInteger(visibleTotals.boxes16)} detail="Planejamento anual" />
        <PlanningMetricCard icon={Boxes} label="Caixas 56 MM X 30 M" value={formatInteger(visibleTotals.boxes30)} detail="Planejamento anual" tone="blue-medium" />
        <PlanningMetricCard icon={CircleDollarSign} label="Valor 56 MM X 16 M" value={formatCurrency(visibleTotals.value16)} detail="R$ 1,14 por unidade" />
        <PlanningMetricCard icon={CircleDollarSign} label="Valor 56 MM X 30 M" value={formatCurrency(visibleTotals.value30)} detail="R$ 2,09 por unidade" tone="blue-medium" />
        <PlanningMetricCard icon={ShoppingCart} label="Consumo atual" value={formatInteger(operationalMonth?.consumptionUnits || 0)} detail={operationalMonth?.monthLabel || 'Sem período'} tone="orange" />
        <PlanningMetricCard
          icon={Archive}
          label="Saldo projetado final"
          value={Number.isFinite(planning.rows[planning.rows.length - 1]?.balanceUnits)
            ? formatInteger(planning.rows[planning.rows.length - 1].balanceUnits)
            : 'Não informado'}
          detail={Number.isFinite(planning.rows[planning.rows.length - 1]?.balanceUnits)
            ? 'Após consumo de dezembro'
            : 'Informe o estoque inicial do ano'}
          tone={Number.isFinite(planning.rows[planning.rows.length - 1]?.balanceUnits)
            && planning.rows[planning.rows.length - 1].balanceUnits < 0 ? 'red' : 'orange'}
        />
        <PlanningMetricCard icon={AlertTriangle} label="Meses críticos" value={formatInteger(criticalMonths)} detail="Abaixo da cobertura mínima" tone={criticalMonths ? 'red' : 'green'} />
      </section>

      {operationalMonth ? (
        <section className="operational-month">
          <div className="operational-month-title">
            <span>Mês Atual Operacional</span>
            <strong>{formatPlanningMonth(operationalMonth.monthKey)}</strong>
          </div>
          <OperationalItem icon={CalendarDays} label="Data solicitação" value={formatPlanningDate(operationalMonth.requestDate)} />
          <OperationalItem icon={CalendarDays} label="Data compra" value={formatPlanningDate(operationalMonth.purchaseDate)} />
          <OperationalItem icon={CalendarDays} label="Previsão de entrega" value={formatPlanningDate(operationalMonth.deliveryDate)} />
          <OperationalItem
            icon={Boxes}
            label="Caixas solicitadas"
            value={formatInteger(operationalMonth.boxesRequested)}
            detail={`16 M: ${formatInteger(operationalMonth.boxes16)} | 30 M: ${formatInteger(operationalMonth.boxes30)}`}
          />
          <OperationalItem
            icon={PackageCheck}
            label="Unidades solicitadas"
            value={formatInteger(operationalMonth.unitsRequested)}
            detail={`16 M: ${formatInteger(operationalMonth.units16)} | 30 M: ${formatInteger(operationalMonth.units30)}`}
          />
          <OperationalItem icon={ShoppingCart} label="Consumo atual" value={formatInteger(operationalMonth.consumptionUnits)} detail="Base Bobinas" />
          <OperationalItem
            icon={Archive}
            label="% estoque caixas"
            value={formatStockPercent(operationalMonth, 'stockBoxesPercent')}
            detail={`Meta: ≥ ${PURCHASE_PLANNING_CONFIG.thresholds.attention}%`}
            tone={Number.isFinite(operationalMonth.stockBoxesPercent) && operationalMonth.stockBoxesPercent < 60 ? 'warning' : 'success'}
          />
          <OperationalItem
            icon={Archive}
            label="% estoque unidades"
            value={formatStockPercent(operationalMonth, 'stockUnitsPercent')}
            detail={`Meta: ≥ ${PURCHASE_PLANNING_CONFIG.thresholds.attention}%`}
            tone={Number.isFinite(operationalMonth.stockUnitsPercent) && operationalMonth.stockUnitsPercent < 60 ? 'warning' : 'success'}
          />
          <div className="operational-status">
            <span>Status da cobertura</span>
            {planningStatus(operationalMonth.status, operationalMonth.statusTone)}
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <History size={17} aria-hidden="true" />
            Ver detalhes
          </button>
        </section>
      ) : null}

      <section className="planning-table-section" ref={tableRef}>
        <div className="section-heading compact">
          <div>
            <h3>Planejamento mensal consolidado</h3>
            <p>Uma linha por mês, com os 12 meses do ano e saldo calculado em ordem cronológica.</p>
          </div>
          <div className="button-row">
            <button className="button secondary" type="button" onClick={exportMonthlyCsv}>
              <Download size={16} aria-hidden="true" />
              Planejamento CSV
            </button>
            <button className="button secondary" type="button" onClick={exportAnnualCsv}>
              <Download size={16} aria-hidden="true" />
              Resumo anual
            </button>
            <button className="button secondary" type="button" onClick={exportAlertsCsv}>
              <Download size={16} aria-hidden="true" />
              Alertas CSV
            </button>
          </div>
        </div>
        <PlanningTable
          rows={visibleRows}
          selectedType={filters.type}
          totals={visibleTotals}
          onDelete={onDelete}
          onEdit={editRow}
        />
        {!visibleRows.length ? <div className="empty-state compact-empty">Nenhum mês corresponde aos filtros ativos.</div> : null}
      </section>

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
              <div className="planning-alert-empty">
                Nenhum alerta identificado para {planning.year}.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <footer className="planning-data-footnote">
        <span>
          <strong>Planilha:</strong> {datasetState?.meta?.totalRecords || records.length} registros Bobinas.
        </span>
        <span>
          <strong>LocalStorage:</strong> usado somente para complementos manuais e estoque inicial.
        </span>
      </footer>
    </div>
  );
}
