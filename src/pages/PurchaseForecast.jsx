import { Boxes, PackageCheck, TrendingUp } from 'lucide-react';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import { formatInteger } from '../utils/calculations';

function buildForecastRows(forecast) {
  if (forecast.status !== 'ok') {
    return [];
  }

  const recommendedBase = Math.max(forecast.avg3, forecast.maxRecentUnits);

  return [
    {
      id: 'minimum',
      scenario: 'Mínimo',
      units: forecast.avg3,
      boxes: forecast.minimumBoxes,
      note: 'Média dos últimos 3 meses',
    },
    {
      id: 'recommended',
      scenario: 'Recomendado',
      units: recommendedBase * 1.08,
      boxes: forecast.recommendedBoxes,
      note: 'Maior referência recente + 8%',
    },
    {
      id: 'safe',
      scenario: 'Seguro',
      units: recommendedBase * 1.08 * 1.12,
      boxes: forecast.safeBoxes,
      note: 'Recomendado + 12%',
    },
  ];
}

function ForecastTable({ title, analysis }) {
  return (
    <ChartCard title={title} subtitle={analysis.forecast.explanation}>
      <DataTable
        columns={[
          { key: 'scenario', label: 'Cenário' },
          { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
          { key: 'boxes', label: 'Caixas equivalentes', value: (row) => formatInteger(row.boxes), sortValue: (row) => row.boxes },
          { key: 'note', label: 'Observação' },
        ]}
        emptyMessage="Dados insuficientes para previsão."
        rows={buildForecastRows(analysis.forecast)}
      />
    </ChartCard>
  );
}

export default function PurchaseForecast({ analytics, hasData }) {
  if (!hasData) {
    return (
      <div className="page-grid">
        <article className="empty-state">
          <h2>Sem dados para previsão</h2>
          <p>Carregue a base Bobinas para calcular cenários de próximo pedido.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Gestão</p>
          <h2>Previsão de Compra</h2>
          <p>Cenários de compra para 56 MM X 16 M e 56 MM X 30 M.</p>
        </div>
      </section>

      <section className="metrics-grid compact-metrics">
        <MetricCard
          icon={Boxes}
          title="56 MM X 16 M"
          value={formatInteger(analytics.bobbin16.forecast.recommendedBoxes)}
          subtitle="caixas recomendadas"
        />
        <MetricCard
          icon={PackageCheck}
          title="56 MM X 30 M"
          value={formatInteger(analytics.bobbin30.forecast.recommendedBoxes)}
          subtitle="caixas recomendadas"
          tone="success"
        />
        <MetricCard
          icon={TrendingUp}
          title="Tendência 16 M"
          value={analytics.bobbin16.summary.trend}
          subtitle={`${formatInteger(analytics.bobbin16.summary.trendDelta)}%`}
          tone="warning"
        />
        <MetricCard
          icon={TrendingUp}
          title="Tendência 30 M"
          value={analytics.bobbin30.summary.trend}
          subtitle={`${formatInteger(analytics.bobbin30.summary.trendDelta)}%`}
        />
      </section>

      <section className="cards-grid two">
        <ForecastTable title="Previsão 56 MM X 16 M" analysis={analytics.bobbin16} />
        <ForecastTable title="Previsão 56 MM X 30 M" analysis={analytics.bobbin30} />
      </section>
    </div>
  );
}
