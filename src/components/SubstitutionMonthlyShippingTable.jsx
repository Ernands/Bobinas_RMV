import DataTable from './DataTable';
import { CONSOLIDATED_MONTHS } from '../utils/consolidatedConstants';
import { formatCurrency, formatInteger } from '../utils/calculations';

function QuantityCostCell({ count, cost }) {
  return (
    <span className="substitution-month-cost-cell">
      <strong>{formatInteger(count)}</strong>
      <small>{formatCurrency(cost)}</small>
    </span>
  );
}

export default function SubstitutionMonthlyShippingTable({ monthlyShipping }) {
  const rows = [
    {
      id: 'count',
      label: 'Substituições',
      total: monthlyShipping.totalCount,
      values: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [month.key, monthlyShipping.months[month.key].count])),
      renderValue: (value) => formatInteger(value),
      renderTotal: (value) => formatInteger(value),
    },
    {
      id: 'cost',
      label: 'Custo Envio',
      total: monthlyShipping.totalCost,
      values: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [month.key, monthlyShipping.months[month.key].cost])),
      renderValue: (value) => formatCurrency(value),
      renderTotal: (value) => formatCurrency(value),
    },
    {
      id: 'sedex',
      label: 'SEDEX',
      total: { count: monthlyShipping.totalSedex, cost: monthlyShipping.totalSedexCost },
      values: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [
        month.key,
        {
          count: monthlyShipping.months[month.key].sedex,
          cost: monthlyShipping.months[month.key].sedexCost,
        },
      ])),
      renderValue: (value) => <QuantityCostCell count={value.count} cost={value.cost} />,
      renderTotal: (value) => <QuantityCostCell count={value.count} cost={value.cost} />,
    },
    {
      id: 'pac',
      label: 'PAC',
      total: { count: monthlyShipping.totalPac, cost: monthlyShipping.totalPacCost },
      values: Object.fromEntries(CONSOLIDATED_MONTHS.map((month) => [
        month.key,
        {
          count: monthlyShipping.months[month.key].pac,
          cost: monthlyShipping.months[month.key].pacCost,
        },
      ])),
      renderValue: (value) => <QuantityCostCell count={value.count} cost={value.cost} />,
      renderTotal: (value) => <QuantityCostCell count={value.count} cost={value.cost} />,
    },
  ];
  const columns = [
    { key: 'label', label: 'Mês', sortable: false },
    ...CONSOLIDATED_MONTHS.map((month) => ({
      key: month.key,
      label: month.shortLabel.toUpperCase(),
      sortable: false,
      value: (row) => row.values[month.key],
      render: (row, value) => row.renderValue(value),
    })),
    {
      key: 'total',
      label: 'Total anual',
      sortable: false,
      value: (row) => row.total,
      render: (row, value) => row.renderTotal(value),
    },
  ];

  return <DataTable columns={columns} rows={rows} topScrollbar />;
}
