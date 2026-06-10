import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';

function getSortValue(column, row) {
  if (column.sortValue) {
    return column.sortValue(row);
  }
  if (column.value) {
    return column.value(row);
  }
  return row[column.key];
}

export default function DataTable({ columns, rows, emptyMessage = 'Nenhum dado para exibir.', defaultSort }) {
  const [sort, setSort] = useState(defaultSort || { key: columns[0]?.key, direction: 'asc' });

  const sortedRows = useMemo(() => {
    if (!sort?.key) {
      return rows;
    }

    const column = columns.find((item) => item.key === sort.key);
    if (!column) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aValue = getSortValue(column, a);
      const bValue = getSortValue(column, b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sort.direction === 'asc'
        ? String(aValue ?? '').localeCompare(String(bValue ?? ''), 'pt-BR')
        : String(bValue ?? '').localeCompare(String(aValue ?? ''), 'pt-BR');
    });
  }, [columns, rows, sort]);

  function toggleSort(column) {
    if (column.sortable === false) {
      return;
    }
    setSort((current) => ({
      key: column.key,
      direction: current?.key === column.key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                <button
                  className="table-sort"
                  disabled={column.sortable === false}
                  type="button"
                  onClick={() => toggleSort(column)}
                >
                  {column.label}
                  {column.sortable === false ? null : <ArrowDownUp size={14} aria-hidden="true" />}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length ? sortedRows.map((row, index) => (
            <tr key={row.id || row.monthKey || `${row.destination || 'row'}-${index}`}>
              {columns.map((column) => {
                const raw = column.value ? column.value(row) : row[column.key];
                return (
                  <td className={column.className || ''} key={column.key}>
                    {column.render ? column.render(row, raw) : raw}
                  </td>
                );
              })}
            </tr>
          )) : (
            <tr>
              <td className="empty-cell" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
