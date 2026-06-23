const STORAGE_KEY = 'dashboard-bobinas-purchases-v1';
const DATA_SOURCE_KEY = 'dashboard-bobinas-data-source-v1';
export const DEFAULT_DATA_SOURCE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTPXzArw3sHwIxmGgPN7FSiUTV4yuvxLmlg5nbJclIoLcWH20V53-QCh_nveTC36slUff1Nsi0tNYJ/pubhtml';
const LEGACY_DATA_SOURCE_IDS = [
  '1B8nB1e3SM7bk3YaZl46EIMJVIkaEQOjmxppBBH0mqyo',
  '1dFEhUjVOTUztxGduxWg8VjkHEzedaeSl',
];

export function loadPurchases() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const withoutLegacyDemo = parsed.filter((item) => item?.note !== 'Carga inicial');
        if (withoutLegacyDemo.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutLegacyDemo));
        }
        return withoutLegacyDemo;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch {
    return [];
  }
}

export function savePurchases(purchases) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  } catch {
    // O planejamento continua em memoria quando o armazenamento local estiver indisponivel.
  }
}

export function loadDataSourceUrl() {
  try {
    const stored = localStorage.getItem(DATA_SOURCE_KEY);
    if (stored && !LEGACY_DATA_SOURCE_IDS.some((id) => stored.includes(id))) {
      return stored;
    }

    localStorage.setItem(DATA_SOURCE_KEY, DEFAULT_DATA_SOURCE_URL);
    return DEFAULT_DATA_SOURCE_URL;
  } catch {
    return DEFAULT_DATA_SOURCE_URL;
  }
}

export function saveDataSourceUrl(url) {
  try {
    localStorage.setItem(DATA_SOURCE_KEY, url || '');
  } catch {
    // A URL continua editavel durante a sessao quando o armazenamento falhar.
  }
}

export function normalizeImportedPurchases(value) {
  const source = Array.isArray(value) ? value : value?.purchases;
  if (!Array.isArray(source)) {
    throw new Error('O arquivo JSON não contém uma lista de compras.');
  }

  return source
    .filter((item) => item.month && (
      Number(item.boxes) > 0
      || Number(item.boxes16) > 0
      || Number(item.boxes30) > 0
      || item.requestDate
      || item.purchaseDate
      || item.deliveryDate
      || Number(item.initialStockUnits) > 0
      || Number(item.initialStockBoxes) > 0
    ))
    .map((item, index) => ({
      id: item.id || `${item.month}-${item.type || 'mensal'}-${index}`,
      month: item.month,
      type: item.type || '',
      boxes: Number(item.boxes) || 0,
      boxes16: Number(item.boxes16) || 0,
      boxes30: Number(item.boxes30) || 0,
      requestDate: item.requestDate || '',
      purchaseDate: item.purchaseDate || '',
      deliveryDate: item.deliveryDate || '',
      initialStockUnits: Number(item.initialStockUnits) || 0,
      initialStockBoxes: Number(item.initialStockBoxes) || 0,
      note: item.note || item.observation || '',
    }));
}
