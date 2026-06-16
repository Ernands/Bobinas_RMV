import { useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { BRAZIL_MAP_VIEWBOX, BRAZIL_STATE_PATHS } from '../data/brazilStatePaths';
import { formatCurrency, formatDecimal, formatInteger } from '../utils/calculations';

const UNKNOWN_UF = 'UF não identificada';

const METRICS = [
  { key: 'totalCost', label: 'Valor total', format: formatCurrency },
  { key: 'shipments', label: 'Quantidade de envios', format: formatInteger },
  { key: 'averageCost', label: 'Custo médio', format: formatCurrency },
  { key: 'totalWeight', label: 'Peso total', format: (value) => `${formatDecimal(value)} kg` },
  { key: 'pac', label: 'Quantidade PAC', format: formatInteger },
  { key: 'sedex', label: 'Quantidade SEDEX', format: formatInteger },
  { key: 'reversos', label: 'Quantidade Reversos', format: formatInteger },
];

const COLOR_SCALE = ['#DBEAFE', '#93C5FD', '#60A5FA', '#2563EB', '#1D4ED8'];
const EMPTY_COLOR = '#F3F4F6';

function emptyUfRow(uf, stateName = uf) {
  return {
    id: uf,
    name: uf,
    stateName,
    shipments: 0,
    totalCost: 0,
    averageCost: 0,
    totalWeight: 0,
    pac: 0,
    sedex: 0,
    reversos: 0,
  };
}

function metricValue(row, metric) {
  return Number(row?.[metric] || 0);
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

function tooltipLines(row) {
  return [
    `${row.stateName || row.name} (${row.name})`,
    `Valor total: ${formatCurrency(row.totalCost)}`,
    `Quantidade de envios: ${formatInteger(row.shipments)}`,
    `Custo médio: ${formatCurrency(row.averageCost)}`,
    `Peso total: ${formatDecimal(row.totalWeight)} kg`,
    `PAC: ${formatInteger(row.pac)}`,
    `SEDEX: ${formatInteger(row.sedex)}`,
    `Reversos: ${formatInteger(row.reversos)}`,
  ];
}

function RankingList({ metric, onUfClick, rows, title }) {
  const metricConfig = METRICS.find((item) => item.key === metric) || METRICS[0];

  return (
    <div className="uf-ranking-list">
      <h4>{title}</h4>
      {rows.length ? rows.map((row, index) => (
        <button key={`${title}-${row.name}`} type="button" onClick={() => onUfClick(row.name)}>
          <span className="uf-ranking-index">{index + 1}</span>
          <strong>{row.name}</strong>
          <span>{metricConfig.format(metricValue(row, metric))}</span>
        </button>
      )) : (
        <p>Nenhuma UF com dados no recorte.</p>
      )}
    </div>
  );
}

export default function BrazilUfMap({
  metric = 'totalCost',
  onMetricChange,
  onUfClick,
  rows,
  selectedUf,
}) {
  const [tooltip, setTooltip] = useState(null);
  const metricConfig = METRICS.find((item) => item.key === metric) || METRICS[0];

  const { maxValue, minValue, stateRows, topByQuantity, topByValue, unknown } = useMemo(() => {
    const byUf = new Map((rows || []).map((row) => [row.name, row]));
    const mappedStates = BRAZIL_STATE_PATHS.map((state) => ({
      ...state,
      row: {
        ...emptyUfRow(state.uf, state.name),
        ...(byUf.get(state.uf) || {}),
        name: state.uf,
        stateName: state.name,
      },
    }));
    const values = mappedStates
      .map((state) => metricValue(state.row, metric))
      .filter((value) => value > 0);
    const rankedRows = (rows || []).filter((row) => row.name !== UNKNOWN_UF);

    return {
      maxValue: values.length ? Math.max(...values) : 0,
      minValue: values.length ? Math.min(...values) : 0,
      stateRows: mappedStates,
      topByQuantity: [...rankedRows].sort((a, b) => b.shipments - a.shipments || b.totalCost - a.totalCost).slice(0, 5),
      topByValue: [...rankedRows].sort((a, b) => b.totalCost - a.totalCost || b.shipments - a.shipments).slice(0, 5),
      unknown: byUf.get(UNKNOWN_UF) || null,
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
      <div className="section-heading compact">
        <div>
          <h3>Distribuição por UF</h3>
          <p>Mapa coroplético do Brasil por estado, respeitando os filtros ativos.</p>
        </div>
        <label className="field inline-field">
          <span>Métrica</span>
          <select value={metric} onChange={(event) => onMetricChange(event.target.value)}>
            {METRICS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="brazil-map-layout">
        <div className="brazil-map-panel">
          <svg className="brazil-map-svg" role="img" viewBox={BRAZIL_MAP_VIEWBOX} aria-label="Mapa do Brasil por UF">
            <title>Distribuição dos envios dos Correios por UF</title>
            {stateRows.map(({ d, label, row, uf }) => {
              const value = metricValue(row, metric);
              const fill = colorForValue(value, maxValue);
              const isSelected = selectedUf === uf;
              const title = tooltipLines(row).join('\n');

              return (
                <g key={uf}>
                  <title>{title}</title>
                  <path
                    aria-label={title}
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

          <div className="map-legend" aria-label={`Legenda da métrica ${metricConfig.label}`}>
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
          <RankingList metric="totalCost" onUfClick={handleUfClick} rows={topByValue} title="Top UFs por valor" />
          <RankingList metric="shipments" onUfClick={handleUfClick} rows={topByQuantity} title="Top UFs por quantidade" />
        </aside>
      </div>

      {unknown?.shipments ? (
        <button
          className={`unknown-uf-row${selectedUf === UNKNOWN_UF ? ' selected' : ''}`}
          type="button"
          onClick={() => handleUfClick(UNKNOWN_UF)}
        >
          <strong>UF não identificada</strong>
          <span>
            {formatInteger(unknown.shipments)} envios · {formatCurrency(unknown.totalCost)}
          </span>
        </button>
      ) : null}

      {tooltip ? (
        <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltipLines(tooltip.row).map((line, index) => (
            index ? <span key={line}>{line}</span> : <strong key={line}>{line}</strong>
          ))}
        </div>
      ) : null}
    </section>
  );
}
