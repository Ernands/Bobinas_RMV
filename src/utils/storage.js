const STORAGE_KEY = 'dashboard-bobinas-purchases-v1';
const DATA_SOURCE_KEY = 'dashboard-bobinas-data-source-v1';
export const DEFAULT_DATA_SOURCE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTPXzArw3sHwIxmGgPN7FSiUTV4yuvxLmlg5nbJclIoLcWH20V53-QCh_nveTC36slUff1Nsi0tNYJ/pubhtml';
const LEGACY_DATA_SOURCE_IDS = [
  '1B8nB1e3SM7bk3YaZl46EIMJVIkaEQOjmxppBBH0mqyo',
  '1dFEhUjVOTUztxGduxWg8VjkHEzedaeSl',
];
const DEFAULT_PURCHASE_YEAR = 2026;

function purchaseId(month, type) {
  return `${month}-${type.replace(/\s+/g, '-').toLowerCase()}`;
}

export function createDefaultPurchases(year = DEFAULT_PURCHASE_YEAR) {
  const defaults = [
    ['01', '56 MM X 16 M', 210],
    ['01', '56 MM X 30 M', 110],
    ['02', '56 MM X 16 M', 250],
    ['02', '56 MM X 30 M', 110],
    ['03', '56 MM X 16 M', 327],
    ['03', '56 MM X 30 M', 267],
    ['04', '56 MM X 16 M', 390],
    ['04', '56 MM X 30 M', 210],
    ['05', '56 MM X 16 M', 300],
    ['05', '56 MM X 30 M', 200],
    ['06', '56 MM X 16 M', 300],
    ['06', '56 MM X 30 M', 200],
  ];

  return defaults.map(([month, type, boxes]) => {
    const monthKey = `${year}-${month}`;
    return {
      id: purchaseId(monthKey, type),
      month: monthKey,
      type,
      boxes,
      note: 'Carga inicial',
    };
  });
}

export function loadPurchases() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    const defaults = createDefaultPurchases();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  } catch {
    return createDefaultPurchases();
  }
}

export function savePurchases(purchases) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  } catch {
    // localStorage pode estar indisponível em modo privado; a aplicação continua em memória.
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
    // localStorage pode estar indisponível; a URL continua editável na sessão.
  }
}

export function normalizeImportedPurchases(value) {
  const source = Array.isArray(value) ? value : value?.purchases;
  if (!Array.isArray(source)) {
    throw new Error('O arquivo JSON não contém uma lista de compras.');
  }

  return source
    .filter((item) => item.month && item.type && Number(item.boxes) > 0)
    .map((item, index) => ({
      id: item.id || `${item.month}-${item.type}-${index}`,
      month: item.month,
      type: item.type,
      boxes: Number(item.boxes),
      note: item.note || item.observation || '',
    }));
}
