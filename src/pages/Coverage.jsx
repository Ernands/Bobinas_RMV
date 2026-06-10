import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import { formatCurrency, formatDecimal, formatInteger } from '../utils/calculations';

function statusClass(status) {
  if (status === 'Ficou abaixo') {
    return 'pill danger';
  }
  if (status === 'Cobriu no limite' || status === 'Mês ainda parcial') {
    return 'pill warning';
  }
  return 'pill success';
}

export default function Coverage({ analytics, hasData }) {
  if (!hasData) {
    return (
      <div className="page-grid">
        <section className="section-heading">
          <div>
            <p className="eyebrow">Compras x demanda</p>
            <h2>Cobertura de compra</h2>
            <p>Importe uma planilha para comparar as compras planejadas com a demanda real.</p>
          </div>
        </section>
        <article className="empty-state">
          <h2>Sem demanda real importada</h2>
          <p>A cobertura será calculada quando houver registros de abertura na planilha.</p>
        </article>
      </div>
    );
  }

  const rows = analytics.coverage;
  const chartRows = rows.map((row) => ({
    label: `${row.servedMonthLabel} ${row.typeKey === '16' ? '16m' : '30m'}`,
    comprado: row.units,
    demanda: row.demandUnits,
  }));

  return (
    <div className="page-grid">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Compras x demanda</p>
          <h2>Cobertura de compra</h2>
          <p>Compara as compras planejadas com a demanda real do mês atendido pela regra de ciclo.</p>
        </div>
      </section>

      <ChartCard title="Compras planejadas x demanda real" subtitle="Unidades por mês atendido">
        <ResponsiveContainer height={340} width="100%">
          <BarChart data={chartRows}>
            <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
            <XAxis dataKey="label" minTickGap={18} />
            <YAxis />
            <Tooltip formatter={(value) => formatInteger(value)} />
            <Legend />
            <Bar dataKey="comprado" fill="#2563EB" name="Comprado" radius={[4, 4, 0, 0]} />
            <Bar dataKey="demanda" fill="#F59E0B" name="Demanda real" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable
        columns={[
          { key: 'orderMonthLabel', label: 'Mês do pedido', sortValue: (row) => row.month },
          { key: 'servedMonthLabel', label: 'Mês atendido', sortValue: (row) => row.servedMonth },
          { key: 'type', label: 'Tipo' },
          { key: 'units', label: 'Unidades compradas', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
          { key: 'boxes', label: 'Caixas compradas', value: (row) => formatInteger(row.boxes), sortValue: (row) => row.boxes },
          { key: 'demandUnits', label: 'Demanda real', value: (row) => formatInteger(row.demandUnits), sortValue: (row) => row.demandUnits },
          { key: 'differenceUnits', label: 'Dif. unidades', value: (row) => formatInteger(row.differenceUnits), sortValue: (row) => row.differenceUnits },
          { key: 'differenceBoxes', label: 'Dif. caixas', value: (row) => formatDecimal(row.differenceBoxes), sortValue: (row) => row.differenceBoxes },
          { key: 'cost', label: 'Custo compra', value: (row) => formatCurrency(row.cost), sortValue: (row) => row.cost },
          { key: 'consumptionCost', label: 'Custo consumo', value: (row) => formatCurrency(row.consumptionCost), sortValue: (row) => row.consumptionCost },
          { key: 'financialBalance', label: 'Saldo financeiro', value: (row) => formatCurrency(row.financialBalance), sortValue: (row) => row.financialBalance },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <span className={statusClass(row.status)}>{row.status}</span>,
          },
        ]}
        rows={rows}
      />
    </div>
  );
}
