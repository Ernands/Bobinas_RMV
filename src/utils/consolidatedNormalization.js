import { parseNumber } from './calculations';
import { CONSOLIDATED_MONTHS, getTransactionRange } from './consolidatedConstants';
import { normalizeText } from './normalization';

const COLUMN_ALIASES = {
  year: ['ano', 'ano referencia', 'ano de referencia'],
  destination: ['destino', 'cliente', 'local', 'local destino'],
  uf: ['uf', 'estado'],
  transactions: ['qtd transacoes', 'qtd transações', 'quantidade transacoes', 'quantidade transações', 'transacoes', 'transações'],
  requested: ['solicitacao de bobinas', 'solicitação de bobinas', 'bobinas solicitadas', 'solicitado bobinas'],
  correios: ['qt correios bobinas', 'qtd correios bobinas', 'correios bobinas', 'bobinas correios', 'bobinas enviadas'],
  difference: ['diferenca', 'diferença'],
  boxes16: ['qt 16 m', 'qt 16m', 'qtd 16 m', 'qtd 16m', 'caixas 16 m', 'caixas 16m'],
  units16: ['56 mm x 16 m', '56mm x 16m', '56mmx16m', 'unidades 16 m', 'unidades 16m'],
  cost16: ['custo 16 m', 'custo 16m', 'valor 16 m', 'valor 16m'],
  boxes30: ['qt 30 m', 'qt 30m', 'qtd 30 m', 'qtd 30m', 'caixas 30 m', 'caixas 30m'],
  units30: ['56 mm x 30 m', '56mm x 30m', '56mmx30m', 'unidades 30 m', 'unidades 30m'],
  cost30: ['custo 30 m', 'custo 30m', 'valor 30 m', 'valor 30m'],
  bobbinCost: ['custo total bobinas', 'valor total bobinas', 'total bobinas'],
  correiosCost: ['custo correios', 'valor correios', 'total correios'],
  operationCost: ['custo total operacao', 'custo total operação', 'valor total operacao', 'valor total operação'],
};

const FIELD_LABELS = {
  year: 'Ano',
  destination: 'Destino',
  uf: 'UF',
  transactions: 'Qtd transações',
  requested: 'Solicitação de Bobinas',
  correios: 'Qt Correios bobinas',
  difference: 'Diferença',
  boxes16: 'Qt 16 m',
  units16: '56 MM X 16 M',
  cost16: 'Custo 16 m',
  boxes30: 'Qt 30 m',
  units30: '56 MM X 30 M',
  cost30: 'Custo 30 m',
  bobbinCost: 'Custo Total Bobinas',
  correiosCost: 'Custo Correios',
  operationCost: 'Custo Total Operação',
};

const REQUIRED_FIELDS = ['destination', 'uf', 'transactions', 'requested', 'correios'];
const CURRENT_YEAR = new Date().getFullYear();

function toColumnKey(text) {
  return normalizeText(text).replace(/[^a-z0-9]/g, '');
}

function normalizeEmptyText(value) {
  const text = String(value ?? '').trim();
  return text && text !== '-' ? text : 'Não informado';
}

function rowHasContent(row) {
  return Object.values(row || {}).some((value) => String(value ?? '').trim() !== '');
}

function identifyColumns(headers) {
  const normalizedHeaders = headers.map((header) => ({
    header,
    key: toColumnKey(header),
  }));

  return Object.entries(COLUMN_ALIASES).reduce((columns, [field, aliases]) => {
    const aliasKeys = aliases.map(toColumnKey);
    const exact = normalizedHeaders.find((item) => aliasKeys.includes(item.key));
    const partial = exact || normalizedHeaders.find((item) => (
      aliasKeys.some((alias) => alias.length > 4 && (item.key.includes(alias) || alias.includes(item.key)))
    ));

    columns[field] = partial?.header || null;
    return columns;
  }, {});
}

function getValue(row, columnName) {
  return columnName ? row[columnName] : '';
}

function parseSafeNumber(value, fallback = 0) {
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeUf(value) {
  const raw = normalizeEmptyText(value);
  const normalized = normalizeText(raw);

  if (normalized === 'nao informado') {
    return 'Não informado';
  }

  if (normalized === 'enfermeira') {
    return 'RN';
  }

  return raw.toUpperCase();
}

function classifyStatus({ requested, correios, difference }) {
  if (requested === 0 && correios === 0) {
    return 'Sem movimentação';
  }
  if (requested > 0 && correios === 0) {
    return 'Sem envio Correios';
  }
  if (difference === 0) {
    return 'OK';
  }
  if (difference < 0) {
    return 'Correios menor que solicitação';
  }
  if (difference > 0) {
    return 'Correios maior que solicitação';
  }
  return 'Sem movimentação';
}

function parseMonthValues(row, columns) {
  return CONSOLIDATED_MONTHS.reduce((months, month) => {
    const column = columns.months[month.key];
    months[month.key] = parseSafeNumber(getValue(row, column), 0);
    return months;
  }, {});
}

function identifyMonthColumns(headers) {
  const normalizedHeaders = headers.map((header) => ({
    header,
    key: toColumnKey(header),
  }));

  return CONSOLIDATED_MONTHS.reduce((columns, month) => {
    const aliasKeys = month.aliases.map(toColumnKey);
    const exact = normalizedHeaders.find((item) => aliasKeys.includes(item.key));
    columns[month.key] = exact?.header || null;
    return columns;
  }, {});
}

export function normalizeConsolidatedRows(rawRows) {
  const rows = rawRows.filter(rowHasContent);
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  const columns = {
    ...identifyColumns(headers),
    months: identifyMonthColumns(headers),
  };
  const missingColumns = REQUIRED_FIELDS
    .filter((field) => !columns[field])
    .map((field) => FIELD_LABELS[field]);

  let invalidNumberCount = 0;
  let rowsWithoutDestination = 0;

  const records = rows.map((row, index) => {
    const destination = normalizeEmptyText(getValue(row, columns.destination));
    const transactionsRaw = getValue(row, columns.transactions);
    const requestedRaw = getValue(row, columns.requested);
    const correiosRaw = getValue(row, columns.correios);
    const differenceRaw = getValue(row, columns.difference);
    const transactionsParsed = parseNumber(transactionsRaw);
    const requestedParsed = parseNumber(requestedRaw);
    const correiosParsed = parseNumber(correiosRaw);
    const differenceParsed = parseNumber(differenceRaw);
    const issues = [];

    if (destination === 'Não informado') {
      rowsWithoutDestination += 1;
      issues.push('Destino não informado');
    }

    [
      transactionsParsed,
      requestedParsed,
      correiosParsed,
      differenceRaw === '' || differenceRaw === null || differenceRaw === undefined ? 0 : differenceParsed,
    ].forEach((value) => {
      if (!Number.isFinite(value)) {
        invalidNumberCount += 1;
      }
    });

    const transactions = Number.isFinite(transactionsParsed) ? transactionsParsed : 0;
    const requested = Number.isFinite(requestedParsed) ? requestedParsed : 0;
    const correios = Number.isFinite(correiosParsed) ? correiosParsed : 0;
    const difference = Number.isFinite(differenceParsed) ? differenceParsed : correios - requested;
    const year = parseSafeNumber(getValue(row, columns.year), CURRENT_YEAR);
    const range = getTransactionRange(transactions);
    const months = parseMonthValues(row, columns);

    return {
      id: `${index + 1}-${normalizeText(destination)}`,
      rowNumber: index + 2,
      year: String(year),
      destination,
      uf: normalizeUf(getValue(row, columns.uf)),
      transactions,
      requested,
      correios,
      difference,
      boxes16: parseSafeNumber(getValue(row, columns.boxes16), 0),
      units16: parseSafeNumber(getValue(row, columns.units16), 0),
      cost16: parseSafeNumber(getValue(row, columns.cost16), 0),
      boxes30: parseSafeNumber(getValue(row, columns.boxes30), 0),
      units30: parseSafeNumber(getValue(row, columns.units30), 0),
      cost30: parseSafeNumber(getValue(row, columns.cost30), 0),
      bobbinCost: parseSafeNumber(getValue(row, columns.bobbinCost), 0),
      correiosCost: parseSafeNumber(getValue(row, columns.correiosCost), 0),
      operationCost: parseSafeNumber(getValue(row, columns.operationCost), 0),
      months,
      transactionRange: range.key,
      transactionRangeLabel: range.label,
      status: classifyStatus({ requested, correios, difference }),
      issues,
      original: row,
    };
  });

  return {
    records,
    meta: {
      totalRows: rows.length,
      totalRecords: records.length,
      invalidNumberCount,
      rowsWithoutDestination,
      missingColumns,
      identifiedColumns: {
        ...Object.fromEntries(
          Object.entries(columns)
            .filter(([field]) => field !== 'months')
            .map(([field, column]) => [FIELD_LABELS[field] || field, column || 'Não identificada']),
        ),
        Meses: Object.fromEntries(
          CONSOLIDATED_MONTHS.map((month) => [month.label, columns.months[month.key] || 'Não identificada']),
        ),
      },
    },
  };
}
