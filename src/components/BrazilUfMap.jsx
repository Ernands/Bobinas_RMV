import { useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { BRAZIL_MAP_VIEWBOX, BRAZIL_STATE_PATHS } from '../data/brazilStatePaths';
import { formatCurrency, formatDecimal, formatInteger } from '../utils/calculations';

const UNKNOWN_UF = 'UF não identificada';

const DEFAULT_METRICS = [
  { key: 'shipments', label: 'Quantidade de postagens', format: formatInteger },
  { key: 'correiosCost', label: 'Custo Correios', format: formatCurrency },
  { key: 'bobbinCost', label: 'Custo Bobinas', format: formatCurrency },
  { key: 'totalCost', label: 'Custo total', format: formatCurrency },
];

const DEFAULT_TOOLTIP_FIELDS = [
  { key: 'shipments', label: 'Postagens', format: formatInteger },
  { key: 'correiosCost', label: 'Custo Correios', format: formatCurrency },
  { key: 'bobbinCost', label: 'Custo Bobinas', format: formatCurrency },
  { key: 'totalCost', label: 'Custo total', format: formatCurrency },
  { key: 'averageCost', label: 'Custo médio', format: formatCurrency },
  { key: 'totalWeight', label: 'Peso total', format: (value) => `${formatDecimal(value)} kg` },
  { key: 'pac', label: 'PAC', format: formatInteger },
  { key: 'sedex', label: 'SEDEX', format: formatInteger },
  { key: 'reversos', label: 'Reversos', format: formatInteger },
];

const COLOR_SCALE = ['#DBEAFE', '#93C5FD', '#60A5FA', '#2563EB', '#1D4ED8'];
const EMPTY_COLOR = '#F3F4F6';

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function emptyUfRow(uf, stateName = uf) {
  return {
    id: uf,
    name: uf,
    stateName,
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
  };
}

function normalizeMapRow(source, uf, stateName = uf) {
  const row = {
    ...emptyUfRow(uf, stateName),
    ...(source || {}),
    name: uf,
    stateName,
  };
  const sourceTotal = safeNumber(source?.totalCost);
  const correiosCost = safeNumber(row.correiosCost) || (!safeNumber(row.bobbinCost) ? sourceTotal : 0);
  const bobbinCost = safeNumber(row.bobbinCost);
  const totalCost = safeNumber(row.totalCost) || correiosCost + bobbinCost;
  const shipments = safeNumber(row.shipments);
  const pac = safeNumber(row.pac);
  const sedex = safeNumber(row.sedex);
  const reversos = safeNumber(row.reversos);
  const pacCost = safeNumber(row.pacCost);
  const sedexCost = safeNumber(row.sedexCost);
  const reverseCost = safeNumber(row.reverseCost);

  return {
    ...row,
    destinations: safeNumber(row.destinations),
    shipments,
    correiosCost,
    bobbinCost,
    totalCost,
    operationCost: totalCost,
    averageCost: shipments ? totalCost / shipments : safeNumber(row.averageCost),
    totalWeight: safeNumber(row.totalWeight),
    pac,
    pacCost,
    pacAverage: pac ? pacCost / pac : safeNumber(row.pacAverage),
    sedex,
    sedexCost,
    sedexAverage: sedex ? sedexCost / sedex : safeNumber(row.sedexAverage),
    reversos,
    reverseCost,
    reverseAverage: reversos ? reverseCost / reversos : safeNumber(row.reverseAverage),
    boxes: safeNumber(row.boxes),
  };
}

function metricValue(row, metric) {
  return safeNumber(row?.[metric]);
}

function colorForValue(value, maxValue) {
  if (!value || !maxValue) {
    return EMPTY_COLOR;
  }

  const index = Math.min(
    COLOR_SCALE.length - 1,
    Math.max(0, Math.ceil((value / maxValue) * COLOR_SCALE.length) - 1),
  );
  return COLOR_SCALE[index];
}

function hasOperationalData(row) {
  return Boolean(
    row.shipments
    || row.correiosCost
    || row.bobbinCost
    || row.totalCost
    || row.destinations
    || row.boxes,
  );
}

function sortUfRows(rows, metric) {
  return [...rows].sort((a, b) => (
    metricValue(b, metric) - metricValue(a, metric)
    || b.shipments - a.shipments
    || b.totalCost - a.totalCost
    || a.name.localeCompare(b.name, 'pt-BR')
  ));
}

function buildTooltipLines(row, fields) {
  return [
    `${row.stateName || row.name} (${row.name})`,
    ...fields.map((field) => `${field.label}: ${field.format(row[field.key] || 0)}`),
  ];
}

function UfSidebarRow({ isSelected, onClick, row }) {
  return (
    <button className={`uf-ranking-row${isSelected ? ' selected' : ''}`} type="button" onClick={onClick}>
      <strong>{row.name}</strong>
      <span>{formatInteger(row.shipments)} postagens</span>
      <span>Correios {formatCurrency(row.correiosCost)}</span>
      <span>Bobinas {formatCurrency(row.bobbinCost)}</span>
      <b>Total {formatCurrency(row.totalCost)}</b>
    </button>
  );
}

function UfHorizontalSummary({ isSelected, onClick, row }) {
  return (
    <button className={`uf-summary-card${isSelected ? ' selected' : ''}`} type="button" onClick={onClick}>
      <strong>{row.name}</strong>
      <span>{row.stateName}</span>
      <dl>
        <div>
          <dt>Destinos únicos</dt>
          <dd>{formatInteger(row.destinations)}</dd>
        </div>
        <div>
          <dt>PAC</dt>
          <dd>{formatInteger(row.pac)}</dd>
          <small>{formatCurrency(row.pacAverage)}</small>
        </div>
        <div>
          <dt>SEDEX</dt>
          <dd>{formatInteger(row.sedex)}</dd>
          <small>{formatCurrency(row.sedexAverage)}</small>
        </div>
        <div>
          <dt>Reverso</dt>
          <dd>{formatInteger(row.reversos)}</dd>
          <small>{formatCurrency(row.reverseAverage)}</small>
        </div>
        <div>
          <dt>Caixas</dt>
          <dd>{formatInteger(row.boxes)}</dd>
          <small>bobinas</small>
        </div>
      </dl>
    </button>
  );
}

export default function BrazilUfMap({
  categoryFilter = '',
  categoryLabel = 'Atendimento',
  categoryOptions = [],
  metric = 'shipments',
  metrics = DEFAULT_METRICS,
  onCategoryFilterChange,
  onMetricChange,
  onUfClick = () => {},
  rows,
  selectedUf,
  subtitle = 'Mapa coroplético do Brasil por estado, respeitando os filtros ativos.',
  title = 'Distribuição por UF',
  tooltipFields = DEFAULT_TOOLTIP_FIELDS,
}) {
  const [tooltip, setTooltip] = useState(null);
  const metricConfig = metrics.find((item) => item.key === metric) || metrics[0] || DEFAULT_METRICS[0];

  const { maxValue, minValue, rankedRows, stateRows, summaryRows, unknown } = useMemo(() => {
    const byUf = new Map((rows || []).map((row) => [row.name, row]));
    const mappedStates = BRAZIL_STATE_PATHS.map((state) => ({
      ...state,
      row: normalizeMapRow(byUf.get(state.uf), state.uf, state.name),
    }));
    const values = mappedStates
      .map((state) => metricValue(state.row, metric))
      .filter((value) => value > 0);
    const unknownRow = byUf.get(UNKNOWN_UF)
      ? normalizeMapRow(byUf.get(UNKNOWN_UF), UNKNOWN_UF, UNKNOWN_UF)
      : null;
    const rowsForSidebar = [
      ...mappedStates.map((state) => state.row),
      ...(unknownRow && hasOperationalData(unknownRow) ? [unknownRow] : []),
    ];

    return {
      maxValue: values.length ? Math.max(...values) : 0,
      minValue: values.length ? Math.min(...values) : 0,
      rankedRows: sortUfRows(rowsForSidebar, metric),
      stateRows: mappedStates,
      summaryRows: mappedStates.map((state) => state.row),
      unknown: unknownRow,
    };
  }, [metric, rows]);

  function handleUfClick(uf) {
    onUfClick(selectedUf === uf ? '' : uf);
  }

  function handleKeyDown(event, uf) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleUfClick(uf);
    }
  }

  return (
    <section className="brazil-map-card">
      <div className="section-heading compact map-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="map-controls">
          {categoryOptions.length ? (
            <label className="field inline-field">
              <span>{categoryLabel}</span>
              <select value={categoryFilter} onChange={(event) => onCategoryFilterChange?.(event.target.value)}>
                {categoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field inline-field">
            <span>Ordenar por</span>
            <select value={metric} onChange={(event) => onMetricChange?.(event.target.value)}>
              {metrics.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="brazil-map-layout">
        <div className="brazil-map-panel">
          <svg className="brazil-map-svg" role="img" viewBox={BRAZIL_MAP_VIEWBOX} aria-label="Mapa do Brasil por UF">
            <title>Distribuição operacional por UF</title>
            {stateRows.map(({ d, label, row, uf }) => {
              const value = metricValue(row, metric);
              const fill = colorForValue(value, maxValue);
              const isSelected = selectedUf === uf;
              const stateTitle = buildTooltipLines(row, tooltipFields).join('\n');

              return (
                <g key={uf}>
                  <title>{stateTitle}</title>
                  <path
                    aria-label={stateTitle}
                    className={`brazil-state-path${isSelected ? ' selected' : ''}${value ? '' : ' empty'}`}
                    d={d}
                    fill={fill}
                    role="button"
                    strokeWidth={isSelected ? 2.6 : 1}
                    tabIndex={0}
                    onBlur={() => setTooltip(null)}
                    onClick={() => handleUfClick(uf)}
                    onFocus={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setTooltip({ row, x: rect.left + rect.width / 2, y: rect.top });
                    }}
                    onKeyDown={(event) => handleKeyDown(event, uf)}
                    onMouseLeave={() => setTooltip(null)}
                    onMouseMove={(event) => setTooltip({ row, x: event.clientX, y: event.clientY })}
                  />
                  <text className={`brazil-state-label${value ? '' : ' empty'}`} x={label[0]} y={label[1]}>
                    {uf}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="map-legend" aria-label={`Legenda de ${metricConfig.label}`}>
            <span>Menor</span>
            <div className="map-legend-scale">
              {COLOR_SCALE.map((color) => <i key={color} style={{ background: color }} />)}
            </div>
            <span>Maior</span>
            <strong>{metricConfig.format(maxValue)}</strong>
          </div>
          <div className="map-legend-note">
            <span className="map-empty-swatch" />
            Estados sem dados aparecem em cinza.
            {minValue ? <span> Menor valor positivo: {metricConfig.format(minValue)}.</span> : null}
          </div>
        </div>

        <aside className="uf-map-sidebar">
          <div className="uf-map-selected">
            <MapPinned size={18} aria-hidden="true" />
            <div>
              <span>UF selecionada</span>
              <strong>{selectedUf || 'Todas'}</strong>
            </div>
          </div>
          <div className="uf-ranking-list all-ufs">
            <h4>UFs por {metricConfig.label.toLowerCase()}</h4>
            <div className="uf-ranking-scroll">
              {rankedRows.map((row) => (
                <UfSidebarRow
                  isSelected={selectedUf === row.name}
                  key={`sidebar-${row.name}`}
                  row={row}
                  onClick={() => handleUfClick(row.name)}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="uf-summary-strip" aria-label="Resumo horizontal por UF">
        {summaryRows.map((row) => (
          <UfHorizontalSummary
            isSelected={selectedUf === row.name}
            key={`summary-${row.name}`}
            row={row}
            onClick={() => handleUfClick(row.name)}
          />
        ))}
        {unknown && hasOperationalData(unknown) ? (
          <UfHorizontalSummary
            isSelected={selectedUf === UNKNOWN_UF}
            key="summary-unknown"
            row={unknown}
            onClick={() => handleUfClick(UNKNOWN_UF)}
          />
        ) : null}
      </div>

      {unknown?.shipments ? (
        <button
          className={`unknown-uf-row${selectedUf === UNKNOWN_UF ? ' selected' : ''}`}
          type="button"
          onClick={() => handleUfClick(UNKNOWN_UF)}
        >
          <strong>UF não identificada</strong>
          <span>
            {formatInteger(unknown.shipments)} postagens · {formatCurrency(unknown.correiosCost)}
          </span>
        </button>
      ) : null}

      {tooltip ? (
        <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {buildTooltipLines(tooltip.row, tooltipFields).map((line, index) => (
            index ? <span key={line}>{line}</span> : <strong key={line}>{line}</strong>
          ))}
        </div>
      ) : null}
    </section>
  );
}
