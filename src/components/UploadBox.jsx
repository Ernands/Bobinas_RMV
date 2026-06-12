import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Link2, RefreshCw, UploadCloud, X } from 'lucide-react';
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
  isOpen,
  lastSourceLabel,
  onClose,
  onDatasetsLoaded,
  onDatasetLoading,
  onSourceErrorChange,
  onSourceUrlChange,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualDatasetId, setManualDatasetId] = useState('');
  const autoLoadRef = useRef(false);

  function updateError(message) {
    setError(message);
    onSourceErrorChange?.(message);
  }

  useEffect(() => {
    if (!dataSourceUrl || autoLoadRef.current) {
      return;
    }

    autoLoadRef.current = true;
    handleRemoteSource(dataSourceUrl, true);
  }, [dataSourceUrl]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  async function handleFile(file) {
    if (!file) {
      return;
    }

    updateError('');
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
      updateError(uploadError.message || 'Erro ao importar a planilha.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoteSource(url = dataSourceUrl, isAutomatic = false) {
    if (!url) {
      return;
    }

    const enabledDatasets = datasetConfigs.filter((dataset) => dataset.enabled);
    updateError('');
    setIsLoading(true);
    onDatasetLoading(enabledDatasets.map((dataset) => dataset.id));

    try {
      const results = await loadRemoteDatasets(url, enabledDatasets);
      onDatasetsLoaded(results, isAutomatic ? 'Google Sheets automático' : 'Google Sheets atualizado');
    } catch (remoteError) {
      updateError(remoteError.message || 'Erro ao carregar a planilha online.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        aria-labelledby="data-source-title"
        aria-modal="true"
        className="data-source-modal"
        role="dialog"
      >
        <div className="data-source-modal-heading">
          <div className="upload-copy">
            <FileSpreadsheet size={30} aria-hidden="true" />
            <div>
              <h2 id="data-source-title">Fonte de dados</h2>
              <p>Carregue abas do Google Sheets ou envie um CSV/XLSX manualmente.</p>
            </div>
          </div>
          <button className="icon-button" type="button" title="Fechar" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
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
    </div>
  );
}
