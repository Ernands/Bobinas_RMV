import { getMonthKey, parseDate } from './dateUtils';
import { parseNumber } from './calculations';
import { normalizeText } from './normalization';

const COLUMN_ALIASES = {
  postingDate: ['data da postagem', 'data postagem', 'postagem', 'data'],
  tracking: ['rastreamento', 'objeto', 'codigo rastreio', 'código rastreio'],
  serviceCode: ['cod serviço', 'cod. serviço', 'codigo servico', 'código serviço', 'cod servico'],
  service: ['serviço', 'servico', 'serviço dos correios', 'servico dos correios'],
  weight: ['peso', 'peso kg', 'peso em kg'],
  postingUnit: ['unidade da postagem', 'unidade postagem', 'agencia', 'agência'],
  cep: ['cep'],
  unitValue: ['valor unitário', 'valor unitario'],
  discountValue: ['valor desconto', 'desconto'],
  serviceValue: ['valor serviço', 'valor servico', 'valor total'],
  coban: ['coban'],
  loja: ['loja'],
  chamado: ['chamado', 'tipo de chamado', 'solicitação'],
};

const FIELD_LABELS = {
  postingDate: 'Data da postagem',
  tracking: 'Rastreamento',
  serviceCode: 'Cod. Serviço',
  service: 'Serviço',
  weight: 'Peso',
  postingUnit: 'Unidade da postagem',
  cep: 'CEP',
  unitValue: 'Valor unitário',
  discountValue: 'Valor desconto',
  serviceValue: 'Valor serviço',
  coban: 'Coban',
  loja: 'Loja',
  chamado: 'Chamado',
};

const REQUIRED_FIELDS = ['postingDate', 'tracking', 'service', 'weight', 'serviceValue'];

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

function parseWeightKg(value) {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  const text = String(value)
    .replace(/kg/gi, '')
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!text || text === '-' || text === ',' || text === '.') {
    return Number.NaN;
  }

  if (text.includes(',') && text.includes('.')) {
    return parseNumber(text);
  }

  const normalized = text.replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : Number.NaN;
}

function splitCalled(value) {
  const text = normalizeEmptyText(value);
  if (text === 'Não informado') {
    return {
      callType: 'Não informado',
      callNumber: '',
    };
  }

  const match = text.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (!match) {
    return {
      callType: text,
      callNumber: '',
    };
  }

  return {
    callType: match[1].trim() || 'Não informado',
    callNumber: match[2],
  };
}

function classifyService(service) {
  const normalized = normalizeText(service).toUpperCase();
  const isPac = normalized.includes('PAC');
  const isSedex = normalized.includes('SEDEX');
  const isReverse = normalized.includes('REVERSO');

  return {
    isPac,
    isSedex,
    isReverse,
    serviceGroup: isReverse ? 'Reverso' : isSedex ? 'SEDEX' : isPac ? 'PAC' : 'Outros',
  };
}

export function normalizeCorreiosRows(rawRows) {
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
  let invalidValueCount = 0;
  let invalidWeightCount = 0;
  let missingCalledCount = 0;

  const records = rows.map((row, index) => {
    const postingRaw = getValue(row, columns.postingDate);
    const weightRaw = getValue(row, columns.weight);
    const serviceValueRaw = getValue(row, columns.serviceValue);
    const unitValueRaw = getValue(row, columns.unitValue);
    const discountValueRaw = getValue(row, columns.discountValue);
    const postingDate = parseDate(postingRaw);
    const weightKg = parseWeightKg(weightRaw);
    const serviceValue = parseNumber(serviceValueRaw);
    const unitValue = parseNumber(unitValueRaw);
    const discountValue = parseNumber(discountValueRaw);
    const called = splitCalled(getValue(row, columns.chamado));
    const service = normalizeEmptyText(getValue(row, columns.service));
    const serviceClassification = classifyService(service);
    const issues = [];

    if (columns.postingDate && postingRaw && !postingDate) {
      issues.push('Data da postagem inválida');
      invalidDateCount += 1;
    }

    if (!Number.isFinite(weightKg)) {
      issues.push('Peso inválido');
      invalidWeightCount += 1;
    }

    if (!Number.isFinite(serviceValue)) {
      issues.push('Valor serviço inválido');
      invalidValueCount += 1;
    }

    if (called.callType === 'Não informado') {
      issues.push('Chamado não informado');
      missingCalledCount += 1;
    }

    return {
      id: `${index + 1}-${normalizeText(getValue(row, columns.tracking))}`,
      rowNumber: index + 2,
      postingDate,
      postingMonth: postingDate ? getMonthKey(postingDate) : '',
      year: postingDate ? postingDate.getFullYear() : null,
      tracking: normalizeEmptyText(getValue(row, columns.tracking)),
      serviceCode: normalizeEmptyText(getValue(row, columns.serviceCode)),
      service,
      ...serviceClassification,
      weightKg: Number.isFinite(weightKg) ? weightKg : 0,
      postingUnit: normalizeEmptyText(getValue(row, columns.postingUnit)),
      cep: normalizeEmptyText(getValue(row, columns.cep)),
      unitValue: Number.isFinite(unitValue) ? unitValue : 0,
      discountValue: Number.isFinite(discountValue) ? discountValue : 0,
      serviceValue: Number.isFinite(serviceValue) ? serviceValue : 0,
      coban: normalizeEmptyText(getValue(row, columns.coban)),
      loja: normalizeEmptyText(getValue(row, columns.loja)),
      chamadoRaw: normalizeEmptyText(getValue(row, columns.chamado)),
      callType: called.callType,
      callNumber: called.callNumber,
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
      invalidValueCount,
      invalidWeightCount,
      missingCalledCount,
      missingColumns,
      identifiedColumns: Object.fromEntries(
        Object.entries(columns).map(([field, column]) => [FIELD_LABELS[field] || field, column || 'Não identificada']),
      ),
    },
  };
}
