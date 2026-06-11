import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Link2, RefreshCw, UploadCloud } from 'lucide-react';
import { detectDatasetType } from '../utils/datasetDetection';
import { loadRemoteDatasets, parseLocalFile } from '../utils/importSources';

function statusLabel(dataset, state) {
  if (!dataset.enabled) {
    return 'Oculto por enquanto';
  }
  if (state?.status === 'loading') {
    return 'Carregando...';
  }
  if (state?.status === 'error') {
    return state.error || 'Erro ao carregar';
  }
  if (state?.status === 'loaded') {
    return `${state.meta?.totalRecords || state.records?.length || 0} registros carregados`;
  }
  return 'Aguardando carga';
}

function DatasetStatusPanel({ datasetConfigs, datasetStatuses }) {
  return (
    <div className="dataset-status-grid">
      {datasetConfigs.map((dataset) => {
        const state = datasetStatuses[dataset.id] || {};
        const tone = !dataset.enabled ? 'muted' : state.status || 'idle';
        return (
          <article className={`dataset-status ${tone}`} key={dataset.id}>
            <strong>{dataset.label}</strong>
            <span>{statusLabel(dataset, state)}</span>
          </article>
        );
      })}
    </div>
  );
}

export default function UploadBox({
  dataSourceUrl,
  datasetConfigs,
  datasetStatuses,
  lastSourceLabel,
  onDatasetsLoaded,
  onDatasetLoading,
  onSourceUrlChange,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualDatasetId, setManualDatasetId] = useState('');
  const autoLoadRef = useRef(false);

  useEffect(() => {
    if (!dataSourceUrl || autoLoadRef.current) {
      return;
    }

    autoLoadRef.current = true;
    handleRemoteSource(dataSourceUrl, true);
  }, [dataSourceUrl]);

  async function handleFile(file) {
    if (!file) {
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const rows = await parseLocalFile(file);
      const detectedType = manualDatasetId || detectDatasetType(rows);

      if (!detectedType) {
        throw new Error('Não foi possível identificar a base. Selecione Bobinas ou Envios Correios antes de importar.');
      }

      onDatasetLoading([detectedType]);
      onDatasetsLoaded([{ id: detectedType, rows }], file.name);
    } catch (uploadError) {
      setError(uploadError.message || 'Erro ao importar a planilha.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoteSource(url = dataSourceUrl, isAutomatic = false) {
    if (!url) {
      return;
    }

    const enabledDatasets = datasetConfigs.filter((dataset) => dataset.enabled);
    setError('');
    setIsLoading(true);
    onDatasetLoading(enabledDatasets.map((dataset) => dataset.id));

    try {
      const results = await loadRemoteDatasets(url, enabledDatasets);
      onDatasetsLoaded(results, isAutomatic ? 'Google Sheets automático' : 'Google Sheets atualizado');
    } catch (remoteError) {
      setError(remoteError.message || 'Erro ao carregar a planilha online.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="upload-panel">
      <div className="upload-copy">
        <FileSpreadsheet size={30} aria-hidden="true" />
        <div>
          <h2>Fonte de dados</h2>
          <p>Carregue abas do Google Sheets ou envie um CSV/XLSX manualmente.</p>
        </div>
      </div>

      <div className="source-controls">
        <label className="source-url">
          <Link2 size={18} aria-hidden="true" />
          <input
            aria-label="URL da planilha Google Sheets"
            placeholder="URL do Google Sheets publicado ou compartilhado"
            type="url"
            value={dataSourceUrl}
            onChange={(event) => onSourceUrlChange(event.target.value)}
          />
        </label>
        <select
          aria-label="Tipo da base do arquivo manual"
          className="source-select"
          value={manualDatasetId}
          onChange={(event) => setManualDatasetId(event.target.value)}
        >
          <option value="">Detectar arquivo</option>
          {datasetConfigs.filter((dataset) => dataset.enabled).map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.label}
            </option>
          ))}
        </select>
        <button
          className="button primary"
          disabled={isLoading || !dataSourceUrl}
          type="button"
          onClick={() => handleRemoteSource()}
        >
          <RefreshCw size={18} aria-hidden="true" />
          {isLoading ? 'Carregando...' : 'Atualizar dados'}
        </button>
        <label className="upload-drop">
          <UploadCloud size={22} aria-hidden="true" />
          <span>Arquivo</span>
          <input
            accept=".csv,.xlsx"
            disabled={isLoading}
            type="file"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>
      </div>

      <DatasetStatusPanel datasetConfigs={datasetConfigs} datasetStatuses={datasetStatuses} />

      {lastSourceLabel ? (
        <div className="upload-status success">
          <strong>{lastSourceLabel}</strong>
          <span>Fontes carregadas sem banco de dados.</span>
        </div>
      ) : null}

      {Object.values(datasetStatuses).some((state) => state.meta?.missingColumns?.length) ? (
        <div className="upload-status warning">
          {Object.values(datasetStatuses)
            .filter((state) => state.meta?.missingColumns?.length)
            .map((state) => `${state.label}: ${state.meta.missingColumns.join(', ')}`)
            .join(' | ')}
        </div>
      ) : null}

      {error ? <div className="upload-status danger">{error}</div> : null}
    </section>
  );
}
