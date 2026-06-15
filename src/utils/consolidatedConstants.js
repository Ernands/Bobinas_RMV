export const CONSOLIDATED_MONTHS = [
  { key: 'jan', label: 'Janeiro', shortLabel: 'Jan', aliases: ['jan', 'janeiro'] },
  { key: 'fev', label: 'Fevereiro', shortLabel: 'Fev', aliases: ['fev', 'fevereiro'] },
  { key: 'mar', label: 'Março', shortLabel: 'Mar', aliases: ['mar', 'marco', 'março'] },
  { key: 'abr', label: 'Abril', shortLabel: 'Abr', aliases: ['abr', 'abril'] },
  { key: 'mai', label: 'Maio', shortLabel: 'Mai', aliases: ['mai', 'maio'] },
  { key: 'jun', label: 'Junho', shortLabel: 'Jun', aliases: ['jun', 'junho'] },
  { key: 'jul', label: 'Julho', shortLabel: 'Jul', aliases: ['jul', 'julho'] },
  { key: 'ago', label: 'Agosto', shortLabel: 'Ago', aliases: ['ago', 'agosto'] },
  { key: 'set', label: 'Setembro', shortLabel: 'Set', aliases: ['set', 'setembro'] },
  { key: 'out', label: 'Outubro', shortLabel: 'Out', aliases: ['out', 'outubro'] },
  { key: 'nov', label: 'Novembro', shortLabel: 'Nov', aliases: ['nov', 'novembro'] },
  { key: 'dez', label: 'Dezembro', shortLabel: 'Dez', aliases: ['dez', 'dezembro'] },
];

export const TRANSACTION_RANGES = [
  { key: 'ate-100', label: 'Até 100', min: 0, max: 100 },
  { key: '101-750', label: '101 a 750', min: 101, max: 750 },
  { key: '751-3000', label: '751 a 3.000', min: 751, max: 3000 },
  { key: '3001-5000', label: '3.001 a 5.000', min: 3001, max: 5000 },
  { key: 'acima-5000', label: 'Acima de 5.000', min: 5001, max: Infinity },
];

export function getTransactionRange(value) {
  const amount = Number.isFinite(value) && value > 0 ? value : 0;
  return TRANSACTION_RANGES.find((range) => amount >= range.min && amount <= range.max) || TRANSACTION_RANGES[0];
}

export function getConsolidatedMonthLabel(monthKey) {
  return CONSOLIDATED_MONTHS.find((month) => month.key === monthKey)?.label || 'Todos';
}
