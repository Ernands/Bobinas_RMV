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
  uf: ['uf', 'estado'],
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
  uf: 'UF',
  unitValue: 'Valor unitário',
  discountValue: 'Valor desconto',
  serviceValue: 'Valor serviço',
  coban: 'Coban',
  loja: 'Loja',
  chamado: 'Chamado',
};

const REQUIRED_FIELDS = ['postingDate', 'tracking', 'service', 'weight', 'serviceValue'];
const VALID_UFS = new Set([
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
]);
const UNKNOWN_UF = 'UF não identificada';
const UF_NAME_TO_CODE = {
  ACRE: 'AC',
  ALAGOAS: 'AL',
  AMAZONAS: 'AM',
  AMAPA: 'AP',
  BAHIA: 'BA',
  CEARA: 'CE',
  DISTRITOFEDERAL: 'DF',
  ESPIRITOSANTO: 'ES',
  GOIAS: 'GO',
  MARANHAO: 'MA',
  MINASGERAIS: 'MG',
  MATOGROSSODOSUL: 'MS',
  MATOGROSSO: 'MT',
  PARA: 'PA',
  PARAIBA: 'PB',
  PERNAMBUCO: 'PE',
  PIAUI: 'PI',
  PARANA: 'PR',
  RIODEJANEIRO: 'RJ',
  RIOGRANDEDONORTE: 'RN',
  RONDONIA: 'RO',
  RORAIMA: 'RR',
  RIOGRANDEDOSUL: 'RS',
  SANTACATARINA: 'SC',
  SERGIPE: 'SE',
  SAOPAULO: 'SP',
  TOCANTINS: 'TO',
};

const CEP_UF_RANGES = [
  { uf: 'SP', from: 1000000, to: 19999999 },
  { uf: 'RJ', from: 20000000, to: 28999999 },
  { uf: 'ES', from: 29000000, to: 29999999 },
  { uf: 'MG', from: 30000000, to: 39999999 },
  { uf: 'BA', from: 40000000, to: 48999999 },
  { uf: 'SE', from: 49000000, to: 49999999 },
  { uf: 'PE', from: 50000000, to: 56999999 },
  { uf: 'AL', from: 57000000, to: 57999999 },
  { uf: 'PB', from: 58000000, to: 58999999 },
  { uf: 'RN', from: 59000000, to: 59999999 },
  { uf: 'CE', from: 60000000, to: 63999999 },
  { uf: 'PI', from: 64000000, to: 64999999 },
  { uf: 'MA', from: 65000000, to: 65999999 },
  { uf: 'PA', from: 66000000, to: 68899999 },
  { uf: 'AP', from: 68900000, to: 68999999 },
  { uf: 'AM', from: 69000000, to: 69299999 },
  { uf: 'RR', from: 69300000, to: 69399999 },
  { uf: 'AM', from: 69400000, to: 69899999 },
  { uf: 'AC', from: 69900000, to: 69999999 },
  { uf: 'DF', from: 70000000, to: 72799999 },
  { uf: 'GO', from: 72800000, to: 72999999 },
  { uf: 'DF', from: 73000000, to: 73699999 },
  { uf: 'GO', from: 73700000, to: 76799999 },
  { uf: 'RO', from: 76800000, to: 76999999 },
  { uf: 'TO', from: 77000000, to: 77999999 },
  { uf: 'MT', from: 78000000, to: 78899999 },
  { uf: 'RO', from: 78900000, to: 78999999 },
  { uf: 'MS', from: 79000000, to: 79999999 },
  { uf: 'PR', from: 80000000, to: 87999999 },
  { uf: 'SC', from: 88000000, to: 89999999 },
  { uf: 'RS', from: 90000000, to: 99999999 },
];

function toColumnKey(text) {
  return normalizeText(text).replace(/[^a-z0-9]/g, '');
}

function normalizeEmptyText(value) {
  const text = String(value ?? '').trim();
  return text && text !== '-' ? text : 'Não informado';
}

function normalizeUf(value) {
  const text = normalizeText(value).toUpperCase().replace(/[^A-Z]/g, '');
  return VALID_UFS.has(text) ? text : UF_NAME_TO_CODE[text] || '';
}

function resolveUfFromCep(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length < 5) {
    return '';
  }

  const normalizedCep = digits.length <= 5 ? digits.padEnd(8, '0') : digits.padStart(8, '0');
  const cepNumber = Number(normalizedCep.slice(0, 8));
  const range = CEP_UF_RANGES.find((item) => cepNumber >= item.from && cepNumber <= item.to);
  return range?.uf || '';
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
  let missingUfCount = 0;

  const records = rows.map((row, index) => {
    const postingRaw = getValue(row, columns.postingDate);
    const weightRaw = getValue(row, columns.weight);
    const serviceValueRaw = getValue(row, columns.serviceValue);
    const unitValueRaw = getValue(row, columns.unitValue);
    const discountValueRaw = getValue(row, columns.discountValue);
    const cepRaw = getValue(row, columns.cep);
    const ufFromColumn = normalizeUf(getValue(row, columns.uf));
    const ufFromCep = resolveUfFromCep(cepRaw);
    const uf = ufFromColumn || ufFromCep || UNKNOWN_UF;
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

    if (uf === UNKNOWN_UF) {
      issues.push('UF não identificada');
      missingUfCount += 1;
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
      cep: normalizeEmptyText(cepRaw),
      uf,
      ufSource: ufFromColumn ? 'coluna' : ufFromCep ? 'cep' : 'nao-identificada',
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
      missingUfCount,
      missingColumns,
      identifiedColumns: Object.fromEntries(
        Object.entries(columns).map(([field, column]) => [FIELD_LABELS[field] || field, column || 'Não identificada']),
      ),
    },
  };
}
