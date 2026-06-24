import {
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Download,
  PackageCheck,
} from 'lucide-react';
import { formatCurrency, formatInteger } from '../utils/calculations';

export default function PurchaseAnnualSummary({
  onExport,
  rows = [],
  subtitle = 'Consolidado anual exatamente como informado na planilha.',
  title = 'Resumo anual de planejamento',
}) {
  if (!rows.length) {
    return null;
  }

  return (
    <section className="annual-summary-section">
      <div className="section-heading compact">
        <div className="annual-summary-title">
          <BarChart3 size={21} aria-hidden="true" />
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
        </div>
        {onExport ? (
          <button className="button secondary" type="button" onClick={onExport}>
            <Download size={16} aria-hidden="true" />
            Exportar
          </button>
        ) : null}
      </div>

      <div className="annual-summary-shell">
        <table className="annual-summary-table">
          <thead>
            <tr>
              <th><CalendarDays size={17} aria-hidden="true" />Ano</th>
              <th className="annual-16"><Boxes size={17} aria-hidden="true" />Total Cx 16M</th>
              <th className="annual-16-soft"><CircleDollarSign size={17} aria-hidden="true" />Valor 16M</th>
              <th className="annual-30"><Boxes size={17} aria-hidden="true" />Total Cx 30M</th>
              <th className="annual-30-soft"><CircleDollarSign size={17} aria-hidden="true" />Valor 30M</th>
              <th><PackageCheck size={17} aria-hidden="true" />Total caixas</th>
              <th><BarChart3 size={17} aria-hidden="true" />Total Transações</th>
              <th><CircleDollarSign size={17} aria-hidden="true" />Total Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className={row.isTotal ? 'annual-total-row' : ''} key={row.id}>
                <td><strong>{row.year}</strong></td>
                <td>
                  <strong>{formatInteger(row.boxes16)}</strong>
                  <small>{formatInteger(row.units16)} un</small>
                </td>
                <td>{formatCurrency(row.value16)}</td>
                <td>
                  <strong>{formatInteger(row.boxes30)}</strong>
                  <small>{formatInteger(row.units30)} un</small>
                </td>
                <td>{formatCurrency(row.value30)}</td>
                <td><strong>{formatInteger(row.totalBoxes)}</strong></td>
                <td>{formatInteger(row.transactions)}</td>
                <td><strong>{formatCurrency(row.totalValue)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
