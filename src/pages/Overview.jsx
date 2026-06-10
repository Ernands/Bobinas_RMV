import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Boxes, ClipboardList, DollarSign, PackageCheck, Truck } from 'lucide-react';
import AlertBox from '../components/AlertBox';
import ChartCard from '../components/ChartCard';
import MetricCard from '../components/MetricCard';
import DataTable from '../components/DataTable';
import { formatCurrency, formatInteger } from '../utils/calculations';

function DashboardEmptyState() {
  return (
    <article className="empty-state">
      <h2>Importe uma planilha CSV/XLSX para iniciar</h2>
      <p>Os cards, gráficos e tabelas serão preenchidos apenas com dados carregados no navegador.</p>
    </article>
  );
}

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

function isPendingStatus(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase() === 'pendente';
}

export default function Overview({ analytics, hasData }) {
  const { summary, monthlyDemand, monthlyShipping, alerts } = analytics;
  const totalDemandUnits = monthlyDemand.reduce((sum, row) => sum + row.units, 0);
  const totalBoxes = monthlyDemand.reduce((sum, row) => sum + row.minBoxes16 + row.minBoxes30, 0);
  const totalCost = monthlyDemand.reduce((sum, row) => sum + row.totalCost, 0);
  const sentShippingRows = monthlyShipping.map((shippingRow) => {
    const sentRecords = analytics.records?.filter((record) => (
      record.exitMonth === shippingRow.monthKey
      && !isPendingStatus(record.status)
    )) || [];
    const sentUnits = sentRecords.reduce((sum, record) => sum + record.quantity, 0);
    return {
      ...shippingRow,
      sentUnits,
    };
  });
  const totalSentUnits = sentShippingRows.reduce((sum, row) => sum + row.sentUnits, 0);
  const monthlyChart = monthlyDemand.map((row) => {
    const shipping = sentShippingRows.find((item) => item.monthKey === row.monthKey);
    return {
      month: row.month,
      solicitadas: row.units,
      enviadas: shipping?.sentUnits || 0,
      caixas: row.minBoxes16 + row.minBoxes30,
    };
  });
  const monthlySummaryRows = monthlyDemand.slice(-8).map((row) => ({
    ...row,
    boxes16: row.minBoxes16,
    boxes30: row.minBoxes30,
    boxesTotal: row.minBoxes16 + row.minBoxes30,
  }));
  const forecast16Rows = buildForecastRows(analytics.bobbin16.forecast);
  const forecast30Rows = buildForecastRows(analytics.bobbin30.forecast);

  return (
    <div className="page-grid">
      <section className="metrics-grid">
        <MetricCard
          icon={ClipboardList}
          title="Total de Pedidos"
          value={formatInteger(summary.totalRecords)}
          subtitle={hasData ? 'registros da planilha' : 'aguardando importação'}
        />
        <MetricCard
          icon={Boxes}
          title="Unidades Solicitadas"
          value={formatInteger(totalDemandUnits)}
          subtitle="pela data de abertura"
          tone="primary"
        />
        <MetricCard
          icon={Truck}
          title="Unidades Enviadas"
          value={formatInteger(totalSentUnits)}
          subtitle="sem status pendente"
          tone="success"
        />
        <MetricCard
          icon={PackageCheck}
          title="Caixas Equivalentes"
          value={formatInteger(totalBoxes)}
          subtitle="mínimas arredondadas"
          tone="warning"
        />
        <MetricCard
          icon={DollarSign}
          title="Custo Estimado"
          value={formatCurrency(totalCost)}
          subtitle="56x16 e 56x30"
          tone="success"
        />
      </section>

      {!hasData ? <DashboardEmptyState /> : <AlertBox alerts={alerts} />}

      <section className="charts-grid two">
        <ChartCard title="Demanda Mensal" subtitle="Unidades solicitadas por mês de abertura">
          <ResponsiveContainer height={300} width="100%">
            <ComposedChart data={monthlyChart}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={24} />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Legend />
              <Bar dataKey="solicitadas" fill="#2563EB" name="Unidades solicitadas" radius={[4, 4, 0, 0]} />
              <Line dataKey="caixas" name="Caixas" stroke="#60A5FA" strokeWidth={2} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Abertura x Saída" subtitle="Unidades solicitadas e enviadas">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={monthlyChart}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={24} />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Legend />
              <Bar dataKey="solicitadas" fill="#2563EB" name="Abertura" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enviadas" fill="#16A34A" name="Saída" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <ChartCard title="Resumo Mensal" subtitle="Demanda por abertura detalhada por tipo">
        <DataTable
          columns={[
            { key: 'monthKey', label: 'Mês', value: (row) => row.month },
            { key: 'units', label: 'Unidades totais', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
            { key: 'boxesTotal', label: 'Caixas totais', value: (row) => formatInteger(row.boxesTotal), sortValue: (row) => row.boxesTotal },
            { key: 'totalCost', label: 'Valor total', value: (row) => formatCurrency(row.totalCost), sortValue: (row) => row.totalCost },
            { key: 'units16', label: 'Unid. 56x16', value: (row) => formatInteger(row.units16), sortValue: (row) => row.units16 },
            { key: 'boxes16', label: 'Caixas 56x16', value: (row) => formatInteger(row.boxes16), sortValue: (row) => row.boxes16 },
            { key: 'cost16', label: 'Valor 56x16', value: (row) => formatCurrency(row.cost16), sortValue: (row) => row.cost16 },
            { key: 'units30', label: 'Unid. 56x30', value: (row) => formatInteger(row.units30), sortValue: (row) => row.units30 },
            { key: 'boxes30', label: 'Caixas 56x30', value: (row) => formatInteger(row.boxes30), sortValue: (row) => row.boxes30 },
            { key: 'cost30', label: 'Valor 56x30', value: (row) => formatCurrency(row.cost30), sortValue: (row) => row.cost30 },
          ]}
          rows={monthlySummaryRows}
        />
      </ChartCard>

      <section className="cards-grid two">
        <ChartCard title="Previsão 56 MM X 16 M" subtitle="Cenários para próximo pedido">
          <DataTable
            columns={[
              { key: 'scenario', label: 'Cenário' },
              { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
              { key: 'boxes', label: 'Caixas equivalentes', value: (row) => formatInteger(row.boxes), sortValue: (row) => row.boxes },
              { key: 'note', label: 'Observação' },
            ]}
            emptyMessage="Dados insuficientes para previsão."
            rows={forecast16Rows}
          />
        </ChartCard>

        <ChartCard title="Previsão 56 MM X 30 M" subtitle="Cenários para próximo pedido">
          <DataTable
            columns={[
              { key: 'scenario', label: 'Cenário' },
              { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
              { key: 'boxes', label: 'Caixas equivalentes', value: (row) => formatInteger(row.boxes), sortValue: (row) => row.boxes },
              { key: 'note', label: 'Observação' },
            ]}
            emptyMessage="Dados insuficientes para previsão."
            rows={forecast30Rows}
          />
        </ChartCard>
      </section>

      <section className="cards-grid two">
        <article className="info-card">
          <PackageCheck size={22} aria-hidden="true" />
          <div>
            <h3>Distribuição por bobina</h3>
            <DataTable
              columns={[
                { key: 'name', label: 'Tipo' },
                { key: 'count', label: 'Registros', value: (row) => formatInteger(row.count), sortValue: (row) => row.count },
                { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
              ]}
              rows={summary.byBobbinType}
            />
          </div>
        </article>
        <article className="info-card">
          <ClipboardList size={22} aria-hidden="true" />
          <div>
            <h3>Leitura rápida</h3>
            <p>
              A análise usa a data de abertura como principal indicador de demanda e a data de saída
              para avaliar operação e atrasos.
            </p>
            {analytics.partialMonth.isPartial ? <p>{analytics.partialMonth.message}</p> : null}
          </div>
        </article>
      </section>
    </div>
  );
}
