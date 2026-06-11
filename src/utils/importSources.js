import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';

export function parseCsvText(text) {
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

async function parseExcel(file) {
  const rows = await readXlsxFile(file);
  const [headers = [], ...body] = rows;
  const normalizedHeaders = headers.map((header, index) => String(header || `Coluna ${index + 1}`).trim());

  return body.map((row) => normalizedHeaders.reduce((record, header, index) => {
    record[header] = row[index] ?? '';
    return record;
  }, {}));
}

export async function parseLocalFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  return extension === 'csv' ? parseCsv(file) : parseExcel(file);
}

export function toRemoteCsvUrl(value, options = {}) {
  const url = String(value || '').trim();
  if (!url) {
    return '';
  }

  const requestedGid = options.gid || url.match(/[?#&]gid=(\d+)/)?.[1];
  const gid = requestedGid ? `&gid=${requestedGid}&single=true` : '';

  const publishedMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/e\/([^/]+)/);
  if (publishedMatch) {
    return `https://docs.google.com/spreadsheets/d/e/${publishedMatch[1]}/pub?output=csv${gid}`;
  }

  const spreadsheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
  if (spreadsheetMatch) {
    const editGid = requestedGid || '0';
    return `https://docs.google.com/spreadsheets/d/${spreadsheetMatch[1]}/export?format=csv&gid=${editGid}`;
  }

  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  return url;
}

export async function parseRemoteCsv(sourceUrl, options = {}) {
  const csvUrl = toRemoteCsvUrl(sourceUrl, options);
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

export async function loadRemoteDatasets(sourceUrl, datasetConfigs) {
  return Promise.all(datasetConfigs.map(async (dataset) => {
    try {
      const rows = await parseRemoteCsv(sourceUrl, { gid: dataset.gid });
      return {
        id: dataset.id,
        rows,
      };
    } catch (error) {
      return {
        id: dataset.id,
        error: error.message || 'Erro ao carregar a base.',
      };
    }
  }));
}
