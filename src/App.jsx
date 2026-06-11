import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  MapPinned,
  PackageOpen,
  ReceiptText,
  ShieldCheck,
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
import { applyFilters, buildAnalytics } from './utils/calculations';
import { formatMonth } from './utils/dateUtils';
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

const MENU = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'monthly', label: 'Demanda Mensal', icon: BarChart3 },
  { id: 'shipping', label: 'Saídas e Atrasos', icon: CalendarClock },
  { id: 'bobbin16', label: '56 MM X 16 M', icon: ClipboardList },
  { id: 'bobbin30', label: '56 MM X 30 M', icon: ReceiptText },
  { id: 'purchases', label: 'Compras Planejadas', icon: PackageOpen },
  { id: 'coverage', label: 'Cobertura', icon: ShieldCheck },
  { id: 'destinations', label: 'Destinos', icon: MapPinned },
  { id: 'exports', label: 'Exportações', icon: FileDown },
];

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
        {MENU.map((item) => (
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
      </nav>

      <div className="sidebar-footer">
        <span>Sem banco</span>
        <span>Sem API</span>
      </div>
    </aside>
  );
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [importMeta, setImportMeta] = useState(null);
  const [fileName, setFileName] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [activeTab, setActiveTab] = useState('overview');
  const [includePartialMonth, setIncludePartialMonth] = useState(false);
  const [rawPurchases, setRawPurchases] = useState(() => loadPurchases());
  const [dataSourceUrl, setDataSourceUrl] = useState(() => loadDataSourceUrl());

  useEffect(() => {
    savePurchases(rawPurchases);
  }, [rawPurchases]);

  useEffect(() => {
    saveDataSourceUrl(dataSourceUrl);
  }, [dataSourceUrl]);

  const filteredRecords = useMemo(
    () => applyFilters(records, filters),
    [records, filters],
  );

  const analytics = useMemo(
    () => buildAnalytics(filteredRecords, rawPurchases, includePartialMonth),
    [filteredRecords, rawPurchases, includePartialMonth],
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

  function handleRowsLoaded(rows, uploadedFileName) {
    const normalized = normalizeRows(rows);
    setRecords(normalized.records);
    setImportMeta(normalized.meta);
    setFileName(uploadedFileName);
    setFilters(EMPTY_FILTERS);
    setActiveTab('overview');
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

  return (
    <div className="app-shell notranslate" translate="no">
      <Sidebar activeTab={activeTab} onChange={setActiveTab} />
      <main className="main-shell">
        <Header activeLabel={MENU.find((item) => item.id === activeTab)?.label} onPrint={() => window.print()} />
        <UploadBox
          dataSourceUrl={dataSourceUrl}
          fileName={fileName}
          meta={importMeta}
          onRowsLoaded={handleRowsLoaded}
          onSourceUrlChange={setDataSourceUrl}
        />

        {records.length ? (
          <Filters
            filters={filters}
            options={options}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />
        ) : null}

        <div className="content-area">
          {activeTab === 'overview' ? <Overview {...pageProps} /> : null}
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
          {activeTab === 'exports' ? <Exports {...pageProps} /> : null}
        </div>
      </main>
    </div>
  );
}
