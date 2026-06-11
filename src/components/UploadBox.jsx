import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';
import { FileSpreadsheet, Link2, RefreshCw, UploadCloud } from 'lucide-react';

function parseCsvText(text) {
  const results = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    delimitersToGuess: [',', ';', '\t', '|'],
  });

  if (results.errors?.length) {
    throw new Error(results.errors[0].message);
  }

  return results.data;
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target.result;
        let text = '';

        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch {
          text = new TextDecoder('windows-1252').decode(buffer);
        }

        resolve(parseCsvText(text));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo CSV.'));
    reader.readAsArrayBuffer(file);
  });
}

function toRemoteCsvUrl(value) {
  const url = String(value || '').trim();
  if (!url) {
    return '';
  }

  const publishedMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/e\/([^/]+)/);
  if (publishedMatch) {
    const gidMatch = url.match(/[?#&]gid=(\d+)/);
    const gid = gidMatch?.[1] ? `&gid=${gidMatch[1]}&single=true` : '';
    return `https://docs.google.com/spreadsheets/d/e/${publishedMatch[1]}/pub?output=csv${gid}`;
  }

  const spreadsheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
  if (spreadsheetMatch) {
    const gidMatch = url.match(/[?#&]gid=(\d+)/);
    const gid = gidMatch?.[1] || '0';
    return `https://docs.google.com/spreadsheets/d/${spreadsheetMatch[1]}/export?format=csv&gid=${gid}`;
  }

  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  return url;
}

async function parseRemoteCsv(sourceUrl) {
  const csvUrl = toRemoteCsvUrl(sourceUrl);
  if (!csvUrl) {
    throw new Error('Informe a URL da planilha.');
  }

  const response = await fetch(csvUrl, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Não foi possível acessar a planilha. Verifique se ela está compartilhada ou publicada.');
  }

  const text = await response.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(text)) {
    throw new Error('O Google retornou uma página, não um CSV. Publique a planilha como CSV ou compartilhe para acesso por link.');
  }

  return parseCsvText(text);
}

async function parseExcel(file) {
  const rows = await readXlsxFile(file);
  const [headers = [], ...body] = rows;
  const normalizedHeaders = headers.map((header, index) => String(header || `Coluna ${index + 1}`).trim());

  return body.map((row) => normalizedHeaders.reduce((record, header, index) => {
    record[header] = row[index] ?? '';
    return record;
  }, {}));
}

export default function UploadBox({
  dataSourceUrl,
  onRowsLoaded,
  fileName,
  meta,
  onSourceUrlChange,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
      const extension = file.name.split('.').pop().toLowerCase();
      const rows = extension === 'csv'
        ? await parseCsv(file)
        : await parseExcel(file);
      onRowsLoaded(rows, file.name);
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

    setError('');
    setIsLoading(true);
    try {
      const rows = await parseRemoteCsv(url);
      onRowsLoaded(rows, isAutomatic ? 'Google Sheets automático' : 'Google Sheets atualizado');
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
          <p>Carregue do Google Sheets ou envie um CSV/XLSX manualmente.</p>
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

      {fileName ? (
        <div className="upload-status success">
          <strong>{fileName}</strong>
          <span>{meta?.totalRecords || 0} registros lidos</span>
          <span>{meta?.invalidDateCount || 0} erro(s) de data</span>
          <span>{meta?.invalidQuantityCount || 0} erro(s) de quantidade</span>
        </div>
      ) : null}

      {meta?.missingColumns?.length ? (
        <div className="upload-status warning">
          Colunas não identificadas: {meta.missingColumns.join(', ')}
        </div>
      ) : null}

      {error ? <div className="upload-status danger">{error}</div> : null}
    </section>
  );
}
