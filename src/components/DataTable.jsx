import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';

function getSortValue(column, row) {
  if (column.sortValue) {
    return column.sortValue(row);
  }
  if (column.key && row[column.key] !== undefined && row[column.key] !== null) {
    return row[column.key];
  }
  return column.value ? column.value(row) : '';
}

export default function DataTable({ columns, rows, emptyMessage = 'Nenhum dado para exibir.', defaultSort, topScrollbar = false }) {
  const [sort, setSort] = useState(defaultSort || null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const bodyRef = useRef(null);
  const tableRef = useRef(null);
  const topRef = useRef(null);
  const syncingRef = useRef(false);

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

  useEffect(() => {
    if (!topScrollbar) {
      return undefined;
    }

    function updateScrollWidth() {
      setScrollWidth(tableRef.current?.scrollWidth || 0);
    }

    updateScrollWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScrollWidth);
      return () => window.removeEventListener('resize', updateScrollWidth);
    }

    const observer = new ResizeObserver(updateScrollWidth);
    if (tableRef.current) {
      observer.observe(tableRef.current);
    }
    if (bodyRef.current) {
      observer.observe(bodyRef.current);
    }
    window.addEventListener('resize', updateScrollWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScrollWidth);
    };
  }, [columns, sortedRows.length, topScrollbar]);

  function syncScroll(sourceRef, targetRef) {
    if (syncingRef.current) {
      return;
    }

    const source = sourceRef.current;
    const target = targetRef.current;
    if (!source || !target) {
      return;
    }

    syncingRef.current = true;
    target.scrollLeft = source.scrollLeft;
    window.requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }

  return (
    <div className={`table-frame${topScrollbar ? ' has-top-scrollbar' : ''}`}>
      {topScrollbar ? (
        <div
          aria-hidden="true"
          className="table-scrollbar-top"
          onScroll={() => syncScroll(topRef, bodyRef)}
          ref={topRef}
        >
          <div style={{ width: `${scrollWidth}px` }} />
        </div>
      ) : null}

      <div
        className="table-shell"
        onScroll={topScrollbar ? () => syncScroll(bodyRef, topRef) : undefined}
        ref={bodyRef}
      >
        <table ref={tableRef}>
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
    </div>
  );
}
