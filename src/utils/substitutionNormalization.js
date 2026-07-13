import { getMonthKey, parseDate } from './dateUtils';
import { normalizeText } from './normalization';

const COLUMN_ALIASES = {
  destination: ['destino', 'local destino', 'nome destino', 'cliente'],
  coban: ['coban'],
  uf: ['uf', 'estado'],
  store: ['loja'],
  callNumber: ['chamado', 'numero chamado', 'n chamado', 'nº chamado'],
  callCode: ['chamados', 'codigo chamado', 'código chamado'],
  equipment: ['equipamentos', 'equipamento', 'material', 'modelo'],
  serial: ['serie', 'série'],
  patrimony: ['patrimonio', 'patrimônio'],
  date: ['data', 'data substituicao', 'data substituição'],
  modality: ['modalidade'],
  error: ['erros gerais', 'erro geral', 'motivo por erro', 'motivo erro', 'erro'],
};

const FIELD_LABELS = {
  destination: 'Destino',
  coban: 'COBAN',
  uf: 'UF',
  store: 'LOJA',
  callNumber: 'Chamado',
  callCode: 'CHAMADOS',
  equipment: 'EQUIPAMENTOS',
  serial: 'Série',
  patrimony: 'Patrimônio',
  date: 'DATA',
  modality: 'MODALIDADE',
  error: 'ERROS GERAIS',
};

const REQUIRED_FIELDS = ['destination', 'uf', 'callNumber', 'equipment', 'date', 'error'];

function toColumnKey(text) {
  return normalizeText(text).replace(/[^a-z0-9]/g, '');
}

function normalizeEmptyText(value) {
  const text = String(value ?? '').trim();
  return text && text !== '-' ? text : 'Não informado';
}

function getValue(row, columnName) {
  return columnName ? row[columnName] : '';
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
      aliasKeys.some((alias) => alias.length > 3 && (item.key.includes(alias) || alias.includes(item.key)))
    ));

    columns[field] = partial?.header || null;
    return columns;
  }, {});
}

export function extractSubstitutionCallNumber(value) {
  const digits = String(value ?? '').match(/\d+/g)?.join('') || '';
  return digits.replace(/^0+/, '') || digits;
}

export function normalizeSubstitutionRows(rawRows) {
  const rows = rawRows.filter(rowHasContent);
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row || {}).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  const columns = identifyColumns(headers);
  const missingColumns = REQUIRED_FIELDS
    .filter((field) => !columns[field])
    .map((field) => FIELD_LABELS[field]);

  let invalidDateCount = 0;
  let missingCallCount = 0;

  const records = rows.map((row, index) => {
    const dateRaw = getValue(row, columns.date);
    const callRaw = getValue(row, columns.callNumber);
    const date = parseDate(dateRaw);
    const callNumber = extractSubstitutionCallNumber(callRaw);
    const issues = [];

    if (columns.date && dateRaw && !date) {
      issues.push('Data inválida');
      invalidDateCount += 1;
    }

    if (!callNumber) {
      issues.push('Chamado não identificado');
      missingCallCount += 1;
    }

    return {
      id: `${index + 1}-${callNumber || normalizeText(getValue(row, columns.destination))}`,
      rowNumber: index + 2,
      destination: normalizeEmptyText(getValue(row, columns.destination)),
      coban: normalizeEmptyText(getValue(row, columns.coban)),
      uf: normalizeEmptyText(getValue(row, columns.uf)).toUpperCase(),
      store: normalizeEmptyText(getValue(row, columns.store)),
      callNumber,
      callCode: normalizeEmptyText(getValue(row, columns.callCode)),
      equipment: normalizeEmptyText(getValue(row, columns.equipment)),
      serial: normalizeEmptyText(getValue(row, columns.serial)),
      patrimony: normalizeEmptyText(getValue(row, columns.patrimony)),
      date,
      monthKey: date ? getMonthKey(date) : '',
      modality: normalizeEmptyText(getValue(row, columns.modality)),
      error: normalizeEmptyText(getValue(row, columns.error)),
      issues,
      original: row,
    };
  });

  return {
    records,
    meta: {
      totalRows: rows.length,
      totalRecords: records.length,
      invalidDateCount,
      missingCallCount,
      missingColumns,
      headers,
      identifiedColumns: Object.fromEntries(
        Object.entries(columns).map(([field, column]) => [FIELD_LABELS[field] || field, column || 'Não identificada']),
      ),
    },
  };
}
