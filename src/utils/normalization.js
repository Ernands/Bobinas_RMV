import { getMonthKey, daysBetween, parseDate } from './dateUtils';
import { getBobbinConfig, getBobbinKey, parseNumber } from './calculations';

const COLUMN_ALIASES = {
  callType: ['tipo de chamado', 'tipo chamado', 'chamado', 'tipo solicitacao', 'tipo solicitação'],
  exitDate: ['data saida', 'data de saida', 'data de saída', 'saida', 'saída', 'dt saida', 'data envio'],
  openingDate: ['abertura', 'data abertura', 'data de abertura', 'dt abertura', 'data chamado', 'data solicitacao'],
  bobbinType: ['tipo bobina', 'tipo de bobina', 'bobina', 'modelo bobina', 'produto', 'material'],
  quantity: ['qtd bobinas', 'qtd. bobinas', 'quantidade', 'qtd', 'qtde', 'unidades', 'total bobinas'],
  destination: ['destino', 'cliente', 'local destino', 'nome destino', 'estabelecimento'],
  uf: ['uf', 'estado'],
  shippingMethod: ['forma de envio', 'envio', 'transportadora', 'metodo envio', 'método envio'],
  tracking: ['rastreamento', 'codigo rastreio', 'código rastreio', 'rastreio', 'tracking'],
  status: ['status', 'situacao', 'situação'],
};

const FIELD_LABELS = {
  callType: 'Tipo de chamado',
  exitDate: 'Data de saída',
  openingDate: 'Data de abertura',
  bobbinType: 'Tipo de bobina',
  quantity: 'Quantidade',
  destination: 'Destino',
  uf: 'UF',
  shippingMethod: 'Forma de envio',
  tracking: 'Rastreamento',
  status: 'Status',
};

const REQUIRED_FIELDS = ['openingDate', 'exitDate', 'bobbinType', 'quantity'];

export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toColumnKey(text) {
  return normalizeText(text).replace(/[^a-z0-9]/g, '');
}

function normalizeEmptyText(value) {
  const text = String(value ?? '').trim();
  return text || 'Não informado';
}

function canonicalBobbinType(value) {
  const text = normalizeEmptyText(value);
  const key = getBobbinKey(text);
  if (key === '16' || key === '30') {
    return getBobbinConfig(key).label;
  }
  return text;
}

export function identifyColumns(headers) {
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

function getValue(row, columnName) {
  if (!columnName) {
    return '';
  }
  return row[columnName];
}

function rowHasContent(row) {
  return Object.values(row).some((value) => String(value ?? '').trim() !== '');
}

export function normalizeRows(rawRows) {
  const rows = rawRows.filter(rowHasContent);
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  const columns = identifyColumns(headers);
  const missingColumns = REQUIRED_FIELDS
    .filter((field) => !columns[field])
    .map((field) => FIELD_LABELS[field]);

  let invalidDateCount = 0;
  let invalidQuantityCount = 0;
  let negativeDelayCount = 0;

  const records = rows.map((row, index) => {
    const openingRaw = getValue(row, columns.openingDate);
    const exitRaw = getValue(row, columns.exitDate);
    const quantityRaw = getValue(row, columns.quantity);
    const openingDate = parseDate(openingRaw);
    const exitDate = parseDate(exitRaw);
    const quantity = parseNumber(quantityRaw);
    const issues = [];

    if (columns.openingDate && openingRaw && !openingDate) {
      issues.push('Data de abertura inválida');
      invalidDateCount += 1;
    }

    if (columns.exitDate && exitRaw && !exitDate) {
      issues.push('Data de saída inválida');
      invalidDateCount += 1;
    }

    if (!Number.isFinite(quantity)) {
      issues.push('Quantidade inválida');
      invalidQuantityCount += 1;
    }

    const delayDays = openingDate && exitDate ? daysBetween(openingDate, exitDate) : null;
    if (Number.isFinite(delayDays) && delayDays < 0) {
      issues.push('Saída anterior à abertura');
      negativeDelayCount += 1;
    }

    return {
      id: `${index + 1}-${normalizeText(getValue(row, columns.destination))}`,
      rowNumber: index + 2,
      callType: normalizeEmptyText(getValue(row, columns.callType)),
      openingDate,
      exitDate,
      openingMonth: openingDate ? getMonthKey(openingDate) : '',
      exitMonth: exitDate ? getMonthKey(exitDate) : '',
      bobbinType: canonicalBobbinType(getValue(row, columns.bobbinType)),
      quantity: Number.isFinite(quantity) ? quantity : 0,
      destination: normalizeEmptyText(getValue(row, columns.destination)),
      uf: normalizeEmptyText(getValue(row, columns.uf)) === 'Não informado'
        ? 'Não informado'
        : normalizeEmptyText(getValue(row, columns.uf)).toUpperCase(),
      shippingMethod: normalizeEmptyText(getValue(row, columns.shippingMethod)),
      tracking: normalizeEmptyText(getValue(row, columns.tracking)),
      status: normalizeEmptyText(getValue(row, columns.status)),
      delayDays,
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
      invalidQuantityCount,
      negativeDelayCount,
      missingColumns,
      identifiedColumns: Object.fromEntries(
        Object.entries(columns).map(([field, column]) => [FIELD_LABELS[field] || field, column || 'Não identificada']),
      ),
    },
  };
}
