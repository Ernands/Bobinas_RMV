import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { formatCurrency, formatDecimal, formatInteger, formatPercent } from '../utils/calculations';

export default function ShippingDelays({ analytics }) {
  const { monthlyShipping, comparison, delay } = analytics;

  return (
    <div className="page-grid">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Operação</p>
          <h2>Saídas e atrasos</h2>
          <p>Compara a demanda aberta com as saídas realizadas e mede o prazo entre abertura e envio.</p>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard title="Prazo médio" value={`${formatDecimal(delay.average)} dias`} subtitle={`${formatInteger(delay.count)} registros`} />
        <MetricCard title="Mediana" value={`${formatDecimal(delay.median)} dias`} />
        <MetricCard title="Maior prazo" value={`${formatInteger(delay.max)} dias`} tone="warning" />
        <MetricCard title="Menor prazo" value={`${formatInteger(delay.min)} dias`} tone="success" />
      </section>

      <section className="charts-grid two">
        <ChartCard title="Unidades enviadas" subtitle="Agrupadas pela data de saída">
          <ResponsiveContainer height={300} width="100%">
            <LineChart data={monthlyShipping}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={20} />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Legend />
              <Line dataKey="units" name="Unidades enviadas" stroke="#16A34A" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Prazo médio" subtitle="Dias entre abertura e saída">
          <ResponsiveContainer height={300} width="100%">
            <LineChart data={delay.monthlyAverage}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={20} />
              <YAxis />
              <Tooltip formatter={(value) => `${formatDecimal(value)} dias`} />
              <Line dataKey="averageDelay" name="Prazo médio" stroke="#DC2626" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="charts-grid two">
        <ChartCard title="Distribuição de prazo" subtitle="Faixas de dias">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={delay.distribution}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Bar dataKey="count" fill="#2563EB" name="Registros" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Comparativo abertura x saída" subtitle="Indício de represamento">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={comparison}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={20} />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Legend />
              <Bar dataKey="requestedUnits" fill="#2563EB" name="Solicitado" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shippedUnits" fill="#16A34A" name="Enviado" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="table-section">
        <h3>Relatório mensal por saída</h3>
        <DataTable
          columns={[
            { key: 'monthKey', label: 'Mês', value: (row) => row.month },
            { key: 'shipments', label: 'Envios', value: (row) => formatInteger(row.shipments), sortValue: (row) => row.shipments },
            { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
            { key: 'units16', label: '56x16', value: (row) => formatInteger(row.units16), sortValue: (row) => row.units16 },
            { key: 'units30', label: '56x30', value: (row) => formatInteger(row.units30), sortValue: (row) => row.units30 },
            { key: 'totalCost', label: 'Custo estimado', value: (row) => formatCurrency(row.totalCost), sortValue: (row) => row.totalCost },
            { key: 'deltaPercent', label: 'Comparação mês anterior', value: (row) => formatPercent(row.deltaPercent), sortValue: (row) => row.deltaPercent },
          ]}
          rows={monthlyShipping}
        />
      </section>

      <section className="table-section">
        <h3>Abertura x saída</h3>
        <DataTable
          columns={[
            { key: 'monthKey', label: 'Mês', value: (row) => row.month },
            { key: 'openedOrders', label: 'Chamados abertos', value: (row) => formatInteger(row.openedOrders), sortValue: (row) => row.openedOrders },
            { key: 'requestedUnits', label: 'Unidades solicitadas', value: (row) => formatInteger(row.requestedUnits), sortValue: (row) => row.requestedUnits },
            { key: 'shipments', label: 'Envios realizados', value: (row) => formatInteger(row.shipments), sortValue: (row) => row.shipments },
            { key: 'shippedUnits', label: 'Unidades enviadas', value: (row) => formatInteger(row.shippedUnits), sortValue: (row) => row.shippedUnits },
            { key: 'difference', label: 'Diferença', value: (row) => formatInteger(row.difference), sortValue: (row) => row.difference },
            { key: 'indicator', label: 'Indício' },
          ]}
          rows={comparison}
        />
      </section>

      <section className="table-section">
        <h3>Prazo médio por tipo de bobina</h3>
        <DataTable
          columns={[
            { key: 'type', label: 'Tipo' },
            { key: 'records', label: 'Registros', value: (row) => formatInteger(row.records), sortValue: (row) => row.records },
            { key: 'averageDelay', label: 'Prazo médio', value: (row) => `${formatDecimal(row.averageDelay)} dias`, sortValue: (row) => row.averageDelay },
          ]}
          rows={delay.byType}
        />
      </section>
    </div>
  );
}
