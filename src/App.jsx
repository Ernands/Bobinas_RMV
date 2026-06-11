import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  FileDown,
  Gauge,
  LayoutDashboard,
  Mail,
  MapPinned,
  PackageOpen,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Header from './components/Header';
import UploadBox from './components/UploadBox';
import Filters from './components/Filters';
import Overview from './pages/Overview';
import MonthlyDemand from './pages/MonthlyDemand';
import ShippingDelays from './pages/ShippingDelays';
import Bobbin16 from './pages/Bobbin16';
import Bobbin30 from './pages/Bobbin30';
import Purchases from './pages/Purchases';
import Coverage from './pages/Coverage';
import Destinations from './pages/Destinations';
import Exports from './pages/Exports';
import Correios from './pages/Correios';
import ExecutiveSummary from './pages/ExecutiveSummary';
import PurchaseForecast from './pages/PurchaseForecast';
import CriticalPoints from './pages/CriticalPoints';
import { DATASET_CONFIGS, getDatasetConfig } from './config/datasets';
import { applyFilters, buildAnalytics } from './utils/calculations';
import {
  buildCorreiosAnalytics,
  EMPTY_CORREIOS_FILTERS,
  getCorreiosYearOptions,
  resolveDefaultCorreiosYear,
} from './utils/correiosAnalytics';
import { formatMonth } from './utils/dateUtils';
import { normalizeCorreiosRows } from './utils/correiosNormalization';
import { normalizeRows } from './utils/normalization';
import { loadDataSourceUrl, loadPurchases, saveDataSourceUrl, savePurchases } from './utils/storage';

const EMPTY_FILTERS = {
  referenceMonth: '',
  statusMode: 'all',
  openingFrom: '',
  openingTo: '',
  exitFrom: '',
  exitTo: '',
  bobbinType: '',
  uf: '',
  destination: '',
  status: '',
  shippingMethod: '',
  callType: '',
  minQuantity: '',
  onlyAbove50: false,
};

const MENU_GROUPS = [
  {
    label: 'Dashboard',
    items: [
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
      { id: 'executive', label: 'Resumo Executivo', icon: Gauge },
    ],
  },
  {
    label: 'Bobinas',
    items: [
      { id: 'monthly', label: 'Demanda Mensal', icon: BarChart3 },
      { id: 'shipping', label: 'Saídas e Atrasos', icon: CalendarClock },
      { id: 'bobbin16', label: '56 MM X 16 M', icon: ClipboardList },
      { id: 'bobbin30', label: '56 MM X 30 M', icon: ReceiptText },
      { id: 'purchases', label: 'Compras Planejadas', icon: PackageOpen },
      { id: 'coverage', label: 'Cobertura', icon: ShieldCheck },
      { id: 'destinations', label: 'Destinos', icon: MapPinned },
    ],
  },
  {
    label: 'Correios',
    items: [
      { id: 'correios', label: 'Envios Correios', icon: Mail },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { id: 'forecast', label: 'Previsão de Compra', icon: TrendingUp },
      { id: 'critical', label: 'Pontos Críticos', icon: AlertTriangle },
      { id: 'exports', label: 'Exportações', icon: FileDown },
    ],
  },
];

const BOBINAS_FILTER_TABS = new Set([
  'overview',
  'monthly',
  'shipping',
  'bobbin16',
  'bobbin30',
  'coverage',
  'destinations',
]);

function getMenuItems() {
  return MENU_GROUPS.flatMap((group) => group.items);
}

function getActiveLabel(activeTab) {
  return getMenuItems().find((item) => item.id === activeTab)?.label;
}

function uniqueOptions(records, field) {
  return Array.from(
    new Set(records.map((record) => record[field]).filter((value) => value && value !== 'Não informado')),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function uniqueMonthOptions(records) {
  const months = new Set();
  records.forEach((record) => {
    if (record.openingMonth) {
      months.add(record.openingMonth);
    }
    if (record.exitMonth) {
      months.add(record.exitMonth);
    }
  });

  return Array.from(months)
    .sort()
    .map((monthKey) => ({
      value: monthKey,
      label: formatMonth(monthKey),
    }));
}

function createDatasetState(dataset) {
  return {
    id: dataset.id,
    label: dataset.label,
    records: [],
    meta: null,
    status: dataset.enabled ? 'idle' : 'disabled',
    error: '',
    sourceLabel: '',
    updatedAt: null,
  };
}

function createInitialDatasets() {
  return DATASET_CONFIGS.reduce((datasets, dataset) => {
    datasets[dataset.id] = createDatasetState(dataset);
    return datasets;
  }, {});
}

function normalizeGenericRows(rows) {
  return {
    records: rows,
    meta: {
      totalRows: rows.length,
      totalRecords: rows.length,
      missingColumns: [],
    },
  };
}

function normalizeDatasetRows(datasetId, rows) {
  const config = getDatasetConfig(datasetId);
  if (config?.type === 'bobinas') {
    return normalizeRows(rows);
  }
  if (config?.type === 'correios') {
    return normalizeCorreiosRows(rows);
  }
  return normalizeGenericRows(rows);
}

function Sidebar({ activeTab, onChange }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Boxes size={23} aria-hidden="true" />
        </div>
        <div>
          <strong>Bobinas</strong>
          <span>Local first</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Menu principal">
        {MENU_GROUPS.map((group) => (
          <div className="sidebar-group" key={group.label}>
            <span>{group.label}</span>
            {group.items.map((item) => (
              <button
                className={activeTab === item.id ? 'active' : ''}
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
              >
                <item.icon size={18} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>Sem banco</span>
        <span>Sem API</span>
      </div>
    </aside>
  );
}

export default function App() {
  const [datasets, setDatasets] = useState(() => createInitialDatasets());
  const [lastSourceLabel, setLastSourceLabel] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [correiosFilters, setCorreiosFilters] = useState(EMPTY_CORREIOS_FILTERS);
  const [activeTab, setActiveTab] = useState('overview');
  const [includePartialMonth, setIncludePartialMonth] = useState(false);
  const [rawPurchases, setRawPurchases] = useState(() => loadPurchases());
  const [dataSourceUrl, setDataSourceUrl] = useState(() => loadDataSourceUrl());

  const records = datasets.bobinas?.records || [];
  const correiosRecords = datasets.correios?.records || [];

  useEffect(() => {
    savePurchases(rawPurchases);
  }, [rawPurchases]);

  useEffect(() => {
    saveDataSourceUrl(dataSourceUrl);
  }, [dataSourceUrl]);

  useEffect(() => {
    const years = getCorreiosYearOptions(correiosRecords);
    if (!years.length) {
      return;
    }

    setCorreiosFilters((current) => (
      years.includes(String(current.year))
        ? current
        : { ...current, year: resolveDefaultCorreiosYear(correiosRecords) }
    ));
  }, [correiosRecords]);

  const filteredRecords = useMemo(
    () => applyFilters(records, filters),
    [records, filters],
  );

  const analytics = useMemo(
    () => buildAnalytics(filteredRecords, rawPurchases, includePartialMonth),
    [filteredRecords, rawPurchases, includePartialMonth],
  );

  const correiosAnalytics = useMemo(
    () => buildCorreiosAnalytics(correiosRecords, correiosFilters),
    [correiosRecords, correiosFilters],
  );

  const options = useMemo(() => ({
    months: uniqueMonthOptions(records),
    bobbinTypes: uniqueOptions(records, 'bobbinType'),
    ufs: uniqueOptions(records, 'uf'),
    destinations: uniqueOptions(records, 'destination'),
    statuses: uniqueOptions(records, 'status'),
    shippingMethods: uniqueOptions(records, 'shippingMethod'),
    callTypes: uniqueOptions(records, 'callType'),
  }), [records]);

  function handleDatasetLoading(datasetIds) {
    setDatasets((current) => {
      const next = { ...current };
      datasetIds.forEach((datasetId) => {
        const dataset = getDatasetConfig(datasetId);
        next[datasetId] = {
          ...(next[datasetId] || createDatasetState(dataset)),
          status: 'loading',
          error: '',
        };
      });
      return next;
    });
  }

  function handleDatasetsLoaded(results, sourceLabel) {
    const updates = results.map((result) => {
      const dataset = getDatasetConfig(result.id);
      if (!dataset) {
        return null;
      }

      if (result.error) {
        return {
          id: result.id,
          label: dataset.label,
          records: [],
          meta: null,
          status: 'error',
          error: result.error,
          sourceLabel,
          updatedAt: new Date().toISOString(),
        };
      }

      try {
        const normalized = normalizeDatasetRows(result.id, result.rows || []);
        return {
          id: result.id,
          label: dataset.label,
          records: normalized.records,
          meta: normalized.meta,
          status: 'loaded',
          error: '',
          sourceLabel,
          updatedAt: new Date().toISOString(),
        };
      } catch (error) {
        return {
          id: result.id,
          label: dataset.label,
          records: [],
          meta: null,
          status: 'error',
          error: error.message || 'Erro ao normalizar a base.',
          sourceLabel,
          updatedAt: new Date().toISOString(),
        };
      }
    }).filter(Boolean);

    setDatasets((current) => {
      const next = { ...current };
      updates.forEach((update) => {
        next[update.id] = {
          ...(next[update.id] || {}),
          ...update,
        };
      });
      return next;
    });
    setLastSourceLabel(sourceLabel);

    const loadedIds = updates.filter((update) => update.status === 'loaded').map((update) => update.id);
    if (loadedIds.includes('bobinas')) {
      setFilters(EMPTY_FILTERS);
    }
    if (loadedIds.length === 1 && loadedIds[0] === 'correios') {
      setActiveTab('correios');
    }
  }

  function savePurchase(purchase) {
    setRawPurchases((current) => {
      const exists = current.some((item) => item.id === purchase.id);
      return exists
        ? current.map((item) => (item.id === purchase.id ? purchase : item))
        : [...current, purchase];
    });
  }

  function deletePurchase(id) {
    setRawPurchases((current) => current.filter((item) => item.id !== id));
  }

  const pageProps = {
    analytics,
    hasData: filteredRecords.length > 0,
    includePartialMonth,
    onIncludePartialMonthChange: setIncludePartialMonth,
  };

  const showBobinasFilters = records.length > 0 && BOBINAS_FILTER_TABS.has(activeTab);

  return (
    <div className="app-shell notranslate" translate="no">
      <Sidebar activeTab={activeTab} onChange={setActiveTab} />
      <main className="main-shell">
        <Header activeLabel={getActiveLabel(activeTab)} onPrint={() => window.print()} />
        <UploadBox
          dataSourceUrl={dataSourceUrl}
          datasetConfigs={DATASET_CONFIGS}
          datasetStatuses={datasets}
          lastSourceLabel={lastSourceLabel}
          onDatasetLoading={handleDatasetLoading}
          onDatasetsLoaded={handleDatasetsLoaded}
          onSourceUrlChange={setDataSourceUrl}
        />

        {showBobinasFilters ? (
          <Filters
            filters={filters}
            options={options}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />
        ) : null}

        <div className="content-area">
          {activeTab === 'overview' ? <Overview {...pageProps} /> : null}
          {activeTab === 'executive' ? (
            <ExecutiveSummary
              bobinasAnalytics={analytics}
              correiosAnalytics={correiosAnalytics}
              hasBobinasData={filteredRecords.length > 0}
              hasCorreiosData={correiosRecords.length > 0}
            />
          ) : null}
          {activeTab === 'monthly' ? <MonthlyDemand {...pageProps} /> : null}
          {activeTab === 'shipping' ? <ShippingDelays {...pageProps} /> : null}
          {activeTab === 'bobbin16' ? <Bobbin16 {...pageProps} /> : null}
          {activeTab === 'bobbin30' ? <Bobbin30 {...pageProps} /> : null}
          {activeTab === 'purchases' ? (
            <Purchases
              purchases={analytics.purchases}
              rawPurchases={rawPurchases}
              onDelete={deletePurchase}
              onReplace={setRawPurchases}
              onSave={savePurchase}
            />
          ) : null}
          {activeTab === 'coverage' ? <Coverage {...pageProps} /> : null}
          {activeTab === 'destinations' ? <Destinations {...pageProps} /> : null}
          {activeTab === 'correios' ? (
            <Correios
              analytics={correiosAnalytics}
              filters={correiosFilters}
              hasData={correiosRecords.length > 0}
              onFiltersChange={setCorreiosFilters}
            />
          ) : null}
          {activeTab === 'forecast' ? <PurchaseForecast {...pageProps} /> : null}
          {activeTab === 'critical' ? (
            <CriticalPoints
              bobinasAlerts={analytics.alerts}
              correiosAlerts={correiosAnalytics.alerts}
              hasBobinasData={filteredRecords.length > 0}
              hasCorreiosData={correiosRecords.length > 0}
            />
          ) : null}
          {activeTab === 'exports' ? (
            <Exports analytics={analytics} correiosAnalytics={correiosAnalytics} />
          ) : null}
        </div>
      </main>
    </div>
  );
}
