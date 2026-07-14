import { useEffect, useMemo, useState } from 'react';
import { Boxes, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Header from './components/Header';
import UploadBox from './components/UploadBox';
import Filters from './components/Filters';
import Overview from './pages/Overview';
import MonthlyDemand from './pages/MonthlyDemand';
import ShippingDelays from './pages/ShippingDelays';
import Purchases from './pages/Purchases';
import Destinations from './pages/Destinations';
import Exports from './pages/Exports';
import Correios from './pages/Correios';
import PurchaseForecast from './pages/PurchaseForecast';
import CriticalPoints from './pages/CriticalPoints';
import Substitutions from './pages/Substitutions';
import { DATASET_CONFIGS, getDatasetConfig } from './config/datasets';
import { getActiveGroupId, getNavGroups, getPageMeta } from './config/navigation';
import { applyFilters, buildAnalytics } from './utils/calculations';
import {
  buildCorreiosAnalytics,
  EMPTY_CORREIOS_FILTERS,
  getCorreiosYearOptions,
  resolveDefaultCorreiosYear,
} from './utils/correiosAnalytics';
import {
  buildConsolidatedAnalytics,
  EMPTY_CONSOLIDATED_FILTERS,
  getConsolidatedYearOptions,
  resolveDefaultConsolidatedYear,
} from './utils/consolidatedAnalytics';
import { formatMonth } from './utils/dateUtils';
import { normalizeConsolidatedRows } from './utils/consolidatedNormalization';
import { normalizeCorreiosRows } from './utils/correiosNormalization';
import { normalizeRows } from './utils/normalization';
import { normalizePurchasePlanningRows } from './utils/purchasePlanningNormalization';
import { normalizeSubstitutionRows } from './utils/substitutionNormalization';
import { loadDataSourceUrl, loadPurchases, saveDataSourceUrl, savePurchases } from './utils/storage';

const EMPTY_FILTERS = {
  referenceYear: '',
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

const BOBINAS_FILTER_TABS = new Set([
  'overview',
  'monthly',
  'shipping',
]);

function uniqueOptions(records, field) {
  return Array.from(
    new Set(records.map((record) => record[field]).filter((value) => value && value !== 'Não informado')),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function uniqueMonthOptions(records, referenceDateField = '') {
  const months = new Set();
  records.forEach((record) => {
    const monthKeys = referenceDateField
      ? [record[referenceDateField]]
      : [record.openingMonth, record.exitMonth];
    monthKeys.forEach((monthKey) => {
      if (monthKey) {
        months.add(monthKey);
      }
    });
  });

  return Array.from(months)
    .sort()
    .map((monthKey) => ({
      value: monthKey,
      label: formatMonth(monthKey),
    }));
}

function uniqueYearOptions(records, referenceDateField = '') {
  const years = new Set();
  records.forEach((record) => {
    const monthKeys = referenceDateField
      ? [record[referenceDateField]]
      : [record.openingMonth, record.exitMonth];
    monthKeys.forEach((monthKey) => {
      if (monthKey) {
        years.add(monthKey.slice(0, 4));
      }
    });
  });

  return Array.from(years).sort((a, b) => b.localeCompare(a));
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

function getDataSourceStatus(datasets, sourceError) {
  const enabledStates = DATASET_CONFIGS
    .filter((dataset) => dataset.enabled)
    .map((dataset) => datasets[dataset.id])
    .filter(Boolean);

  const hasMissingColumns = enabledStates.some((state) => state.meta?.missingColumns?.length);
  const hasError = Boolean(sourceError) || enabledStates.some((state) => state.status === 'error') || hasMissingColumns;
  const isLoading = enabledStates.some((state) => state.status === 'loading');
  const hasLoadedData = enabledStates.some((state) => state.status === 'loaded');

  if (hasError) {
    return {
      tone: 'danger',
      title: sourceError || 'Fonte de dados com erro ou coluna pendente',
    };
  }

  if (isLoading) {
    return {
      tone: 'loading',
      title: 'Carregando fonte de dados',
    };
  }

  if (hasLoadedData) {
    return {
      tone: 'success',
      title: 'Fonte de dados carregada sem erros',
    };
  }

  return {
    tone: 'idle',
    title: 'Configurar fonte de dados',
  };
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
  if (config?.type === 'consolidado') {
    return normalizeConsolidatedRows(rows);
  }
  if (config?.type === 'purchases') {
    return normalizePurchasePlanningRows(rows);
  }
  if (config?.type === 'substitutions') {
    return normalizeSubstitutionRows(rows);
  }
  return normalizeGenericRows(rows);
}

function Sidebar({ activeTab, isCollapsed, onChange, onToggle }) {
  const activeGroupId = getActiveGroupId(activeTab);
  const [openGroupId, setOpenGroupId] = useState(activeGroupId);

  useEffect(() => {
    setOpenGroupId(activeGroupId);
  }, [activeGroupId]);

  function toggleGroup(groupId) {
    setOpenGroupId((current) => (current === groupId ? '' : groupId));
  }

  return (
    <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}`}>
      <button
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        className="sidebar-collapse-toggle"
        title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        type="button"
        onClick={onToggle}
      >
        {isCollapsed
          ? <PanelLeftOpen size={18} aria-hidden="true" />
          : <PanelLeftClose size={18} aria-hidden="true" />}
      </button>

      <div aria-hidden={isCollapsed} className="sidebar-content">
        <div className="brand">
          <div className="brand-mark">
            <Boxes size={23} aria-hidden="true" />
          </div>
          <div>
            <strong>RMV Operacional</strong>
            <span>Painel local</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {getNavGroups().map((group) => {
            const isOpen = openGroupId === group.id;
            const panelId = `sidebar-group-${group.id}`;
            const GroupIcon = group.icon;

            return (
              <div className="sidebar-group" key={group.id}>
                <button
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  className={`sidebar-group-trigger${isOpen ? ' open' : ''}`}
                  tabIndex={isCollapsed ? -1 : undefined}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                >
                  <span className="sidebar-group-title">
                    <GroupIcon size={15} aria-hidden="true" />
                    {group.label}
                  </span>
                  <ChevronDown className="sidebar-group-chevron" size={16} aria-hidden="true" />
                </button>

                <div
                  aria-hidden={!isOpen}
                  className={`sidebar-group-items${isOpen ? ' open' : ''}`}
                  id={panelId}
                >
                  {group.items.map((item) => (
                    <button
                      className={activeTab === item.id ? 'active' : ''}
                      disabled={item.disabled}
                      key={item.id}
                      tabIndex={!isCollapsed && isOpen ? undefined : -1}
                      title={item.disabled ? 'Em preparação' : undefined}
                      type="button"
                      onClick={() => onChange(item.id)}
                    >
                      <item.icon size={18} aria-hidden="true" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span>Sem banco</span>
          <span>Sem API</span>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [datasets, setDatasets] = useState(() => createInitialDatasets());
  const [lastSourceLabel, setLastSourceLabel] = useState('');
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [correiosFilters, setCorreiosFilters] = useState(EMPTY_CORREIOS_FILTERS);
  const [consolidatedFilters, setConsolidatedFilters] = useState(EMPTY_CONSOLIDATED_FILTERS);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [includePartialMonth, setIncludePartialMonth] = useState(false);
  const [rawPurchases, setRawPurchases] = useState(() => loadPurchases());
  const [dataSourceUrl, setDataSourceUrl] = useState(() => loadDataSourceUrl());

  const records = datasets.bobinas?.records || [];
  const correiosRecords = datasets.correios?.records || [];
  const consolidatedRecords = datasets.consolidado?.records || [];
  const purchasePlanningRecords = datasets.compras?.records || [];
  const substitutionRecords = datasets.substituicoes?.records || [];

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

  useEffect(() => {
    const years = getConsolidatedYearOptions(consolidatedRecords);
    if (!years.length) {
      return;
    }

    setConsolidatedFilters((current) => (
      years.includes(String(current.year))
        ? current
        : { ...current, year: resolveDefaultConsolidatedYear(consolidatedRecords) }
    ));
  }, [consolidatedRecords]);

  useEffect(() => {
    const years = uniqueYearOptions(records);
    if (!years.length) {
      return;
    }

    setFilters((current) => (
      current.referenceYear
        ? current
        : { ...current, referenceYear: years[0] }
    ));
  }, [records]);

  const bobinasReferenceDateField = activeTab === 'shipping' ? 'exitMonth' : 'openingMonth';

  const filteredRecords = useMemo(
    () => applyFilters(records, filters, bobinasReferenceDateField),
    [records, filters, bobinasReferenceDateField],
  );

  const bobinasExitFilteredRecords = useMemo(
    () => applyFilters(records, filters, 'exitMonth'),
    [records, filters],
  );

  const analytics = useMemo(
    () => buildAnalytics(filteredRecords, rawPurchases, includePartialMonth, {
      referenceDateField: bobinasReferenceDateField,
      referenceMonth: filters.referenceMonth,
    }),
    [filteredRecords, rawPurchases, includePartialMonth, bobinasReferenceDateField, filters.referenceMonth],
  );

  const correiosAnalytics = useMemo(
    () => buildCorreiosAnalytics(correiosRecords, correiosFilters),
    [correiosRecords, correiosFilters],
  );

  const consolidatedAnalytics = useMemo(
    () => buildConsolidatedAnalytics(consolidatedRecords, consolidatedFilters),
    [consolidatedRecords, consolidatedFilters],
  );

  const dataSourceStatus = useMemo(
    () => getDataSourceStatus(datasets, sourceError),
    [datasets, sourceError],
  );

  const pageMeta = useMemo(
    () => getPageMeta(activeTab),
    [activeTab],
  );

  const options = useMemo(() => ({
    years: uniqueYearOptions(records, bobinasReferenceDateField),
    months: uniqueMonthOptions(records, bobinasReferenceDateField),
    bobbinTypes: uniqueOptions(records, 'bobbinType'),
    ufs: uniqueOptions(records, 'uf'),
    destinations: uniqueOptions(records, 'destination'),
    statuses: uniqueOptions(records, 'status'),
    shippingMethods: uniqueOptions(records, 'shippingMethod'),
    callTypes: uniqueOptions(records, 'callType'),
  }), [records, bobinasReferenceDateField]);

  const overviewOptions = useMemo(() => ({
    years: Array.from(new Set([
      ...options.years,
      ...correiosAnalytics.options.years,
      ...consolidatedAnalytics.options.years,
    ].filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    ufs: Array.from(new Set([
      ...options.ufs,
      ...correiosAnalytics.options.ufs,
      ...consolidatedAnalytics.options.ufs,
    ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    callTypes: Array.from(new Set([
      ...options.callTypes,
      ...correiosAnalytics.options.callTypes,
    ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    destinations: options.destinations,
  }), [options, correiosAnalytics.options, consolidatedAnalytics.options]);

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
    if (loadedIds.includes('consolidado')) {
      setConsolidatedFilters(EMPTY_CONSOLIDATED_FILTERS);
    }
    if (loadedIds.length === 1 && loadedIds[0] === 'correios') {
      setActiveTab('correios');
    }
    if (loadedIds.length === 1 && loadedIds[0] === 'consolidado') {
      setActiveTab('destinations');
    }
    if (loadedIds.length === 1 && loadedIds[0] === 'compras') {
      setActiveTab('purchases');
    }
    if (loadedIds.length === 1 && loadedIds[0] === 'substituicoes') {
      setActiveTab('substitutions');
    }
  }

  function savePurchase(purchase) {
    setRawPurchases((current) => {
      if (purchase.monthly) {
        return [
          ...current.filter((item) => item.month !== purchase.month),
          purchase,
        ];
      }
      const exists = current.some((item) => item.id === purchase.id);
      return exists
        ? current.map((item) => (item.id === purchase.id ? purchase : item))
        : [...current, purchase];
    });
  }

  function deletePurchase(id) {
    const ids = Array.isArray(id) ? id : [id];
    setRawPurchases((current) => current.filter((item) => !ids.includes(item.id)));
  }

  const pageProps = {
    analytics,
    hasData: filteredRecords.length > 0,
    includePartialMonth,
    onIncludePartialMonthChange: setIncludePartialMonth,
  };

  const showBobinasFilters = records.length > 0 && activeTab !== 'overview' && BOBINAS_FILTER_TABS.has(activeTab);

  return (
    <div
      className={`app-shell notranslate${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}
      translate="no"
    >
      <Sidebar
        activeTab={activeTab}
        isCollapsed={isSidebarCollapsed}
        onChange={setActiveTab}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />
      <main className="main-shell">
        <Header
          dataSourceStatus={dataSourceStatus}
          onDataSourceClick={() => setIsDataSourceOpen(true)}
          onPrint={() => window.print()}
          pageMeta={pageMeta}
        />
        <UploadBox
          dataSourceUrl={dataSourceUrl}
          datasetConfigs={DATASET_CONFIGS}
          datasetStatuses={datasets}
          isOpen={isDataSourceOpen}
          lastSourceLabel={lastSourceLabel}
          onClose={() => setIsDataSourceOpen(false)}
          onDatasetLoading={handleDatasetLoading}
          onDatasetsLoaded={handleDatasetsLoaded}
          onSourceErrorChange={setSourceError}
          onSourceUrlChange={setDataSourceUrl}
        />

        {showBobinasFilters ? (
          <Filters
            filters={filters}
            options={options}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_FILTERS)}
            referenceDateLabel={activeTab === 'shipping' ? 'Mês/Ano (saída)' : 'Mês/Ano (abertura)'}
          />
        ) : null}

        <div className="content-area">
          {activeTab === 'overview' ? (
            <Overview
              {...pageProps}
              bobinasExitRecords={bobinasExitFilteredRecords}
              bobinasFilters={filters}
              consolidatedAnalytics={consolidatedAnalytics}
              consolidatedFilters={consolidatedFilters}
              correiosRecords={correiosRecords}
              correiosAnalytics={correiosAnalytics}
              correiosFilters={correiosFilters}
              datasetStates={datasets}
              hasConsolidatedData={consolidatedRecords.length > 0}
              hasCorreiosData={correiosRecords.length > 0}
              onBobinasFiltersChange={setFilters}
              onConsolidatedFiltersChange={setConsolidatedFilters}
              onCorreiosFiltersChange={setCorreiosFilters}
              overviewOptions={overviewOptions}
              planningRecords={purchasePlanningRecords}
              substitutionRecords={substitutionRecords}
            />
          ) : null}
          {activeTab === 'monthly' ? <MonthlyDemand {...pageProps} /> : null}
          {activeTab === 'shipping' ? <ShippingDelays {...pageProps} /> : null}
          {activeTab === 'purchases' ? (
            <Purchases
              bobbinRecords={records}
              datasetState={datasets.compras}
              planningRecords={purchasePlanningRecords}
              rawPurchases={rawPurchases}
              onDelete={deletePurchase}
              onReplace={setRawPurchases}
              onSave={savePurchase}
            />
          ) : null}
          {activeTab === 'destinations' ? (
            <Destinations
              analytics={consolidatedAnalytics}
              datasetState={datasets.consolidado}
              filters={consolidatedFilters}
              hasData={consolidatedRecords.length > 0}
              onFiltersChange={setConsolidatedFilters}
            />
          ) : null}
          {activeTab === 'correios' ? (
            <Correios
              analytics={correiosAnalytics}
              filters={correiosFilters}
              hasData={correiosRecords.length > 0}
              onFiltersChange={setCorreiosFilters}
            />
          ) : null}
          {activeTab === 'substitutions' ? (
            <Substitutions
              correiosRecords={correiosRecords}
              datasetState={datasets.substituicoes}
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
            <Exports
              analytics={analytics}
              consolidatedAnalytics={consolidatedAnalytics}
              correiosAnalytics={correiosAnalytics}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
