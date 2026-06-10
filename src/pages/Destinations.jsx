import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Building2, MapPinned, PackageCheck } from 'lucide-react';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import { formatDateBR } from '../utils/dateUtils';
import { formatInteger, formatDecimal } from '../utils/calculations';

const VALID_UFS = new Set([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]);

function isValidUf(uf) {
  return VALID_UFS.has(String(uf || '').trim().toUpperCase());
}

export default function Destinations({ analytics }) {
  const [filters, setFilters] = useState({
    uf: '',
    destination: '',
    minUnits: '',
    onlyInvalidUf: false,
  });

  const destinationRows = analytics.destinations;
  const ufOptions = useMemo(
    () => Array.from(new Set(destinationRows.map((row) => row.uf))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [destinationRows],
  );
  const destinationOptions = useMemo(
    () => Array.from(new Set(destinationRows.map((row) => row.destination))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [destinationRows],
  );

  const filteredRows = useMemo(() => destinationRows.filter((row) => {
    if (filters.uf && row.uf !== filters.uf) {
      return false;
    }
    if (filters.destination && row.destination !== filters.destination) {
      return false;
    }
    if (filters.minUnits && row.units < Number(filters.minUnits)) {
      return false;
    }
    if (filters.onlyInvalidUf && isValidUf(row.uf)) {
      return false;
    }
    return true;
  }), [destinationRows, filters]);

  const summary = useMemo(() => {
    const totalUnits = filteredRows.reduce((sum, row) => sum + row.units, 0);
    const totalOrders = filteredRows.reduce((sum, row) => sum + row.orders, 0);
    const invalidUfRows = destinationRows.filter((row) => !isValidUf(row.uf));
    const byUfMap = new Map();

    filteredRows.forEach((row) => {
      const current = byUfMap.get(row.uf) || { name: row.uf, units: 0, orders: 0, destinations: 0 };
      current.units += row.units;
      current.orders += row.orders;
      current.destinations += 1;
      byUfMap.set(row.uf, current);
    });

    return {
      totalDestinations: filteredRows.length,
      totalUnits,
      totalOrders,
      invalidUfRows,
      topDestinations: [...filteredRows].sort((a, b) => b.units - a.units).slice(0, 10),
      byUf: Array.from(byUfMap.values()).sort((a, b) => b.units - a.units).slice(0, 12),
    };
  }, [destinationRows, filteredRows]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="page-grid">
      <section className="section-heading split">
        <div>
          <p className="eyebrow">Clientes e locais</p>
          <h2>Relatório por destino</h2>
          <p>Consolida pedidos, unidades, tipos de bobina e janelas de abertura e saída por destino.</p>
        </div>
        <button
          className="button secondary"
          type="button"
          onClick={() => setFilters({ uf: '', destination: '', minUnits: '', onlyInvalidUf: false })}
        >
          Limpar filtros
        </button>
      </section>

      <section className="destination-filters">
        <label className="field">
          <span>UF</span>
          <select value={filters.uf} onChange={(event) => updateFilter('uf', event.target.value)}>
            <option value="">Todas</option>
            {ufOptions.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Destino</span>
          <select value={filters.destination} onChange={(event) => updateFilter('destination', event.target.value)}>
            <option value="">Todos</option>
            {destinationOptions.map((destination) => (
              <option key={destination} value={destination}>
                {destination}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Unidades mínimas</span>
          <input
            min="0"
            type="number"
            value={filters.minUnits}
            onChange={(event) => updateFilter('minUnits', event.target.value)}
          />
        </label>
        <label className="check-field">
          <input
            checked={filters.onlyInvalidUf}
            type="checkbox"
            onChange={(event) => updateFilter('onlyInvalidUf', event.target.checked)}
          />
          <span>Somente UFs inválidas</span>
        </label>
      </section>

      {summary.invalidUfRows.length ? (
        <article className="alert-box warning">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>UFs para revisar</strong>
            <p>
              {summary.invalidUfRows.length} destino(s) possuem UF fora da lista oficial. Se aparecer
              “Enfermeira” no Chrome, é tradução automática de RN; a página agora bloqueia tradução.
            </p>
          </div>
        </article>
      ) : null}

      <section className="metrics-grid">
        <MetricCard icon={Building2} title="Destinos" value={formatInteger(summary.totalDestinations)} />
        <MetricCard icon={PackageCheck} title="Unidades" value={formatInteger(summary.totalUnits)} tone="primary" />
        <MetricCard icon={MapPinned} title="Pedidos" value={formatInteger(summary.totalOrders)} />
        <MetricCard
          icon={AlertTriangle}
          title="UFs inválidas"
          value={formatInteger(summary.invalidUfRows.length)}
          tone={summary.invalidUfRows.length ? 'warning' : 'success'}
        />
      </section>

      <section className="charts-grid two">
        <ChartCard title="Volume por UF" subtitle="Unidades por estado">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={summary.byUf}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatInteger(value)} />
              <Bar dataKey="units" fill="#2563EB" name="Unidades" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top destinos" subtitle="Maiores volumes no recorte">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={summary.topDestinations}>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" />
              <XAxis dataKey="destination" hide />
              <YAxis />
              <Tooltip
                formatter={(value) => formatInteger(value)}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.destination || ''}
              />
              <Bar dataKey="units" fill="#16A34A" name="Unidades" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <DataTable
        columns={[
          { key: 'destination', label: 'Destino', render: (row) => <span translate="no">{row.destination}</span> },
          {
            key: 'uf',
            label: 'UF',
            render: (row) => (
              <span className={isValidUf(row.uf) ? 'uf-pill' : 'uf-pill invalid'} translate="no">
                {row.uf}
              </span>
            ),
          },
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
        rows={filteredRows}
      />
    </div>
  );
}
