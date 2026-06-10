import DataTable from '../components/DataTable';
import { formatDateBR } from '../utils/dateUtils';
import { formatInteger, formatDecimal } from '../utils/calculations';

export default function Destinations({ analytics }) {
  return (
    <div className="page-grid">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Clientes e locais</p>
          <h2>Relatório por destino</h2>
          <p>Consolida pedidos, unidades, tipos de bobina e janelas de abertura e saída por destino.</p>
        </div>
      </section>

      <DataTable
        columns={[
          { key: 'destination', label: 'Destino' },
          { key: 'uf', label: 'UF' },
          { key: 'orders', label: 'Pedidos', value: (row) => formatInteger(row.orders), sortValue: (row) => row.orders },
          { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
          { key: 'units16', label: 'Total 56x16', value: (row) => formatInteger(row.units16), sortValue: (row) => row.units16 },
          { key: 'units30', label: 'Total 56x30', value: (row) => formatInteger(row.units30), sortValue: (row) => row.units30 },
          { key: 'firstOpening', label: 'Primeira abertura', value: (row) => formatDateBR(row.firstOpening), sortValue: (row) => row.firstOpening?.getTime() || 0 },
          { key: 'lastOpening', label: 'Última abertura', value: (row) => formatDateBR(row.lastOpening), sortValue: (row) => row.lastOpening?.getTime() || 0 },
          { key: 'firstExit', label: 'Primeira saída', value: (row) => formatDateBR(row.firstExit), sortValue: (row) => row.firstExit?.getTime() || 0 },
          { key: 'lastExit', label: 'Última saída', value: (row) => formatDateBR(row.lastExit), sortValue: (row) => row.lastExit?.getTime() || 0 },
          { key: 'averagePerOrder', label: 'Média por pedido', value: (row) => formatDecimal(row.averagePerOrder), sortValue: (row) => row.averagePerOrder },
        ]}
        rows={analytics.destinations}
      />
    </div>
  );
}
