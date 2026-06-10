import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatPercent,
} from '../utils/calculations';

export default function BobbinDetails({ analysis, includePartialMonth, onIncludePartialMonthChange }) {
  const { config, monthly, summary, forecast } = analysis;
  const latest = monthly[monthly.length - 1];

  return (
    <div className="page-grid">
      <section className="section-heading split">
        <div>
          <p className="eyebrow">Análise específica</p>
          <h2>{config.label}</h2>
          <p>
            Consumo por abertura do chamado, conversão em caixas, custos e previsão do próximo pedido.
          </p>
        </div>
        <label className="switch-field">
          <input
            checked={includePartialMonth}
            type="checkbox"
            onChange={(event) => onIncludePartialMonthChange(event.target.checked)}
          />
          <span>Incluir mês parcial na previsão</span>
        </label>
      </section>

      <section className="metrics-grid">
        <MetricCard title="Pedidos" value={formatInteger(summary.orders)} subtitle="no recorte filtrado" />
        <MetricCard title="Unidades" value={formatInteger(summary.units)} tone="primary" />
        <MetricCard title="Caixas mínimas" value={formatInteger(summary.boxes)} />
        <MetricCard title="Custo estimado" value={formatCurrency(summary.cost)} tone="success" />
      </section>

      <section className="cards-grid three">
        <article className="forecast-card">
          <span>Cenário mínimo</span>
          <strong>{forecast.status === 'ok' ? `${formatInteger(forecast.minimumBoxes)} caixas` : 'Dados insuficientes'}</strong>
          <p>Média dos últimos 3 meses completos.</p>
        </article>
        <article className="forecast-card recommended">
          <span>Cenário recomendado</span>
          <strong>{forecast.status === 'ok' ? `${formatInteger(forecast.recommendedBoxes)} caixas` : 'Dados insuficientes'}</strong>
          <p>Maior referência recente com margem de 8%.</p>
        </article>
        <article className="forecast-card">
          <span>Cenário seguro</span>
          <strong>{forecast.status === 'ok' ? `${formatInteger(forecast.safeBoxes)} caixas` : 'Dados insuficientes'}</strong>
          <p>Recomendado com margem adicional de 12%.</p>
        </article>
      </section>

      <article className="interpretation">
        {forecast.explanation}
        {latest ? ` O último mês exibido é ${latest.month}, com ${formatInteger(latest.units)} unidades e ${formatInteger(latest.minBoxes)} caixas mínimas.` : ''}
      </article>

      <section className="metrics-grid compact-metrics">
        <MetricCard title="Média 3 meses" value={formatInteger(summary.avg3)} subtitle="unidades" />
        <MetricCard title="Média 5 meses" value={formatInteger(summary.avg5)} subtitle="unidades" />
        <MetricCard title="Maior mês" value={summary.maxMonth?.month || 'Não informado'} subtitle={`${formatInteger(summary.maxMonth?.units || 0)} unidades`} />
        <MetricCard title="Tendência" value={summary.trend} subtitle={summary.trend !== 'Dados insuficientes' ? formatPercent(summary.trendDelta) : ''} />
      </section>

      <section className="charts-grid two">
        <ChartCard title="Unidades por mês" subtitle="Data de abertura">
          <ResponsiveContainer height={300} width="100%">
            <LineChart data={monthly}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={20} />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Line dataKey="units" name="Unidades" stroke="#2563EB" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Caixas mínimas" subtitle={`Caixa com ${config.unitsPerBox} unidades`}>
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={monthly}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={20} />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Bar dataKey="minBoxes" fill="#16A34A" name="Caixas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <DataTable
        columns={[
          { key: 'monthKey', label: 'Mês', value: (row) => `${row.month}${row.isPartial ? ' (parcial)' : ''}` },
          { key: 'orders', label: 'Pedidos', value: (row) => formatInteger(row.orders), sortValue: (row) => row.orders },
          { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
          { key: 'boxesEquivalent', label: 'Caixas equivalentes', value: (row) => formatDecimal(row.boxesEquivalent), sortValue: (row) => row.boxesEquivalent },
          { key: 'minBoxes', label: 'Caixas mínimas', value: (row) => formatInteger(row.minBoxes), sortValue: (row) => row.minBoxes },
          { key: 'cost', label: 'Custo mensal', value: (row) => formatCurrency(row.cost), sortValue: (row) => row.cost },
          { key: 'bigOrders', label: 'Pedidos > 50', value: (row) => formatInteger(row.bigOrders), sortValue: (row) => row.bigOrders },
          { key: 'bigUnits', label: 'Unidades > 50', value: (row) => formatInteger(row.bigUnits), sortValue: (row) => row.bigUnits },
        ]}
        rows={monthly}
      />
    </div>
  );
}
