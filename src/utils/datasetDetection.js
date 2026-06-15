import { normalizeText } from './normalization';

const BOBINAS_COLUMN_HINTS = [
  'tipo de chamado',
  'data de abertura',
  'data de saída',
  'tipo de bobina',
  'quantidade',
  'destino',
  'uf',
  'forma de envio',
  'rastreamento',
  'status',
];

const CORREIOS_COLUMN_HINTS = [
  'data da postagem',
  'rastreamento',
  'cod serviço',
  'cod. serviço',
  'serviço',
  'peso',
  'unidade da postagem',
  'cep',
  'valor unitário',
  'valor desconto',
  'valor serviço',
  'coban',
  'loja',
  'chamado',
];

const CONSOLIDADO_COLUMN_HINTS = [
  'destino',
  'uf',
  'qtd transacoes',
  'qtd transações',
  'solicitacao de bobinas',
  'solicitação de bobinas',
  'qt correios bobinas',
  'diferenca',
  'diferença',
  '56 mm x 16 m',
  '56 mm x 30 m',
  'custo total bobinas',
  'custo correios',
  'custo total operacao',
  'custo total operação',
];

function toColumnKey(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function getHeaders(rows) {
  return Array.from(rows.reduce((set, row) => {
    Object.keys(row || {}).forEach((key) => set.add(key));
    return set;
  }, new Set()));
}

function scoreHeaders(headers, hints) {
  const headerKeys = headers.map(toColumnKey);
  const hintKeys = hints.map(toColumnKey);

  return hintKeys.reduce((score, hint) => (
    score + (headerKeys.some((header) => header === hint || header.includes(hint) || hint.includes(header)) ? 1 : 0)
  ), 0);
}

export function detectDatasetType(rows) {
  const headers = getHeaders(rows);
  if (!headers.length) {
    return null;
  }

  const bobinasScore = scoreHeaders(headers, BOBINAS_COLUMN_HINTS);
  const correiosScore = scoreHeaders(headers, CORREIOS_COLUMN_HINTS);
  const consolidadoScore = scoreHeaders(headers, CONSOLIDADO_COLUMN_HINTS);

  if (consolidadoScore >= 6 && consolidadoScore >= bobinasScore && consolidadoScore >= correiosScore) {
    return 'consolidado';
  }

  if (correiosScore >= 6 && correiosScore > bobinasScore) {
    return 'correios';
  }

  if (bobinasScore >= 4) {
    return 'bobinas';
  }

  return null;
}
