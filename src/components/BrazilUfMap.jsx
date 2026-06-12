import { formatCurrency, formatDecimal, formatInteger } from '../utils/calculations';

const UF_LAYOUT = [
  { uf: 'RR', name: 'Roraima', row: 1, col: 4 },
  { uf: 'AP', name: 'Amapá', row: 1, col: 7 },
  { uf: 'AM', name: 'Amazonas', row: 2, col: 3 },
  { uf: 'PA', name: 'Pará', row: 2, col: 6 },
  { uf: 'MA', name: 'Maranhão', row: 2, col: 8 },
  { uf: 'CE', name: 'Ceará', row: 2, col: 10 },
  { uf: 'RN', name: 'Rio Grande do Norte', row: 2, col: 11 },
  { uf: 'AC', name: 'Acre', row: 3, col: 1 },
  { uf: 'RO', name: 'Rondônia', row: 3, col: 3 },
  { uf: 'TO', name: 'Tocantins', row: 3, col: 7 },
  { uf: 'PI', name: 'Piauí', row: 3, col: 9 },
  { uf: 'PB', name: 'Paraíba', row: 3, col: 11 },
  { uf: 'PE', name: 'Pernambuco', row: 4, col: 11 },
  { uf: 'MT', name: 'Mato Grosso', row: 4, col: 5 },
  { uf: 'GO', name: 'Goiás', row: 5, col: 7 },
  { uf: 'BA', name: 'Bahia', row: 5, col: 10 },
  { uf: 'AL', name: 'Alagoas', row: 5, col: 12 },
  { uf: 'SE', name: 'Sergipe', row: 6, col: 12 },
  { uf: 'MS', name: 'Mato Grosso do Sul', row: 6, col: 5 },
  { uf: 'DF', name: 'Distrito Federal', row: 6, col: 8 },
  { uf: 'MG', name: 'Minas Gerais', row: 7, col: 9 },
  { uf: 'ES', name: 'Espírito Santo', row: 7, col: 11 },
  { uf: 'SP', name: 'São Paulo', row: 8, col: 8 },
  { uf: 'RJ', name: 'Rio de Janeiro', row: 8, col: 10 },
  { uf: 'PR', name: 'Paraná', row: 9, col: 7 },
  { uf: 'SC', name: 'Santa Catarina', row: 10, col: 7 },
  { uf: 'RS', name: 'Rio Grande do Sul', row: 11, col: 6 },
];

const METRICS = [
  { key: 'shipments', label: 'Envios', format: formatInteger },
  { key: 'totalCost', label: 'Valor total', format: formatCurrency },
  { key: 'averageCost', label: 'Custo médio', format: formatCurrency },
  { key: 'totalWeight', label: 'Peso total', format: (value) => `${formatDecimal(value)} kg` },
  { key: 'pac', label: 'PAC', format: formatInteger },
  { key: 'sedex', label: 'SEDEX', format: formatInteger },
  { key: 'reversos', label: 'Reversos', format: formatInteger },
];

function emptyUfRow(uf) {
  return {
    id: uf,
    name: uf,
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

export default function BrazilUfMap({
  metric = 'totalCost',
  onMetricChange,
  onUfClick,
  rows,
  selectedUf,
}) {
  const byUf = new Map((rows || []).map((row) => [row.name, row]));
  const metricConfig = METRICS.find((item) => item.key === metric) || METRICS[0];
  const maxValue = Math.max(
    0,
    ...UF_LAYOUT.map((item) => metricValue(byUf.get(item.uf), metric)),
  );
  const unknown = byUf.get('UF não identificada');

  function intensity(row) {
    if (!maxValue || !metricValue(row, metric)) {
      return 0;
    }
    return Math.max(1, Math.ceil((metricValue(row, metric) / maxValue) * 4));
  }

  return (
    <section className="brazil-map-card">
      <div className="section-heading compact">
        <div>
          <h3>Distribuição por UF</h3>
          <p>Mapa por UF respeitando os filtros ativos.</p>
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

      <div className="brazil-uf-map" aria-label="Mapa Brasil por UF">
        {UF_LAYOUT.map((item) => {
          const row = byUf.get(item.uf) || emptyUfRow(item.uf);
          const title = [
            `${item.name} (${item.uf})`,
            `Envios: ${formatInteger(row.shipments)}`,
            `Valor total: ${formatCurrency(row.totalCost)}`,
            `Custo médio: ${formatCurrency(row.averageCost)}`,
            `Peso total: ${formatDecimal(row.totalWeight)} kg`,
            `PAC: ${formatInteger(row.pac)}`,
            `SEDEX: ${formatInteger(row.sedex)}`,
            `Reversos: ${formatInteger(row.reversos)}`,
          ].join('\n');

          return (
            <button
              className={`uf-map-tile level-${intensity(row)}${selectedUf === item.uf ? ' selected' : ''}`}
              key={item.uf}
              style={{ gridColumn: item.col, gridRow: item.row }}
              title={title}
              type="button"
              onClick={() => onUfClick(selectedUf === item.uf ? '' : item.uf)}
            >
              <strong>{item.uf}</strong>
              <span>{metricConfig.format(metricValue(row, metric))}</span>
            </button>
          );
        })}
      </div>

      {unknown?.shipments ? (
        <button
          className={`unknown-uf-row${selectedUf === 'UF não identificada' ? ' selected' : ''}`}
          type="button"
          onClick={() => onUfClick(selectedUf === 'UF não identificada' ? '' : 'UF não identificada')}
        >
          <strong>UF não identificada</strong>
          <span>
            {formatInteger(unknown.shipments)} envios · {formatCurrency(unknown.totalCost)}
          </span>
        </button>
      ) : null}
    </section>
  );
}
