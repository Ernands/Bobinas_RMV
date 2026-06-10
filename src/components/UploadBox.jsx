import { useState } from 'react';
import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors?.length) {
          reject(new Error(results.errors[0].message));
          return;
        }
        resolve(results.data);
      },
      error: reject,
    });
  });
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

export default function UploadBox({ onRowsLoaded, fileName, meta }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <section className="upload-panel">
      <div className="upload-copy">
        <FileSpreadsheet size={30} aria-hidden="true" />
        <div>
          <h2>Importar planilha</h2>
          <p>Envie um arquivo CSV ou XLSX. Os dados são processados localmente.</p>
        </div>
      </div>

      <label className="upload-drop">
        <UploadCloud size={24} aria-hidden="true" />
        <span>{isLoading ? 'Lendo arquivo...' : 'Selecionar arquivo'}</span>
        <input
          accept=".csv,.xlsx"
          disabled={isLoading}
          type="file"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>

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
