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
import { formatCurrency, formatDecimal, formatInteger } from '../utils/calculations';

export default function MonthlyDemand({ analytics }) {
  const rows = analytics.monthlyDemand;
  const latest = rows[rows.length - 1];

  return (
    <div className="page-grid">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Relatório principal</p>
          <h2>Demanda mensal por abertura</h2>
          <p>
            A data de abertura representa a solicitação do cliente e é usada como base principal de
            consumo, caixas e previsão.
          </p>
        </div>
      </section>

      {latest ? (
        <article className="interpretation">
          A demanda de {latest.month} foi de {formatInteger(latest.units16)} unidades para 56 MM X 16 M,
          equivalente a {formatInteger(latest.minBoxes16)} caixas mínimas, e {formatInteger(latest.units30)}
          {' '}unidades para 56 MM X 30 M.
        </article>
      ) : null}

      <section className="charts-grid two">
        <ChartCard title="Unidades solicitadas" subtitle="Por mês de abertura">
          <ResponsiveContainer height={300} width="100%">
            <LineChart data={rows}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={20} />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Legend />
              <Line dataKey="units" name="Total" stroke="#2563EB" strokeWidth={3} type="monotone" />
              <Line dataKey="units16" name="56x16" stroke="#16A34A" strokeWidth={2} type="monotone" />
              <Line dataKey="units30" name="56x30" stroke="#F59E0B" strokeWidth={2} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Caixas equivalentes" subtitle="Demanda convertida em caixas">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={rows}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="month" minTickGap={20} />
              <YAxis />
              <Tooltip formatter={(value) => formatDecimal(value)} />
              <Legend />
              <Bar dataKey="boxesEquivalent16" fill="#16A34A" name="Caixas 56x16" radius={[4, 4, 0, 0]} />
              <Bar dataKey="boxesEquivalent30" fill="#F59E0B" name="Caixas 56x30" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <DataTable
        columns={[
          { key: 'monthKey', label: 'Mês', value: (row) => row.month },
          { key: 'orders', label: 'Pedidos', value: (row) => formatInteger(row.orders), sortValue: (row) => row.orders },
          { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
          { key: 'units16', label: 'Total 56x16', value: (row) => formatInteger(row.units16), sortValue: (row) => row.units16 },
          { key: 'units30', label: 'Total 56x30', value: (row) => formatInteger(row.units30), sortValue: (row) => row.units30 },
          { key: 'boxesEquivalent16', label: 'Caixas eq. 56x16', value: (row) => formatDecimal(row.boxesEquivalent16), sortValue: (row) => row.boxesEquivalent16 },
          { key: 'minBoxes16', label: 'Caixas mín. 56x16', value: (row) => formatInteger(row.minBoxes16), sortValue: (row) => row.minBoxes16 },
          { key: 'cost16', label: 'Custo 56x16', value: (row) => formatCurrency(row.cost16), sortValue: (row) => row.cost16 },
          { key: 'boxesEquivalent30', label: 'Caixas eq. 56x30', value: (row) => formatDecimal(row.boxesEquivalent30), sortValue: (row) => row.boxesEquivalent30 },
          { key: 'minBoxes30', label: 'Caixas mín. 56x30', value: (row) => formatInteger(row.minBoxes30), sortValue: (row) => row.minBoxes30 },
          { key: 'cost30', label: 'Custo 56x30', value: (row) => formatCurrency(row.cost30), sortValue: (row) => row.cost30 },
          { key: 'totalCost', label: 'Custo total', value: (row) => formatCurrency(row.totalCost), sortValue: (row) => row.totalCost },
        ]}
        defaultSort={{ key: 'monthKey', direction: 'asc' }}
        rows={rows}
      />
    </div>
  );
}
