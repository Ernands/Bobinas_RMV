export const DATASET_CONFIGS = [
  {
    id: 'bobinas',
    sheetName: 'Bobinas',
    gid: '94895701',
    label: 'Bobinas',
    type: 'bobinas',
    enabled: true,
  },
  {
    id: 'consolidado',
    sheetName: 'Consolidado Bobinas',
    gid: '1318139925',
    label: 'Consolidado Bobinas',
    type: 'consolidado',
    enabled: true,
  },
  {
    id: 'correios',
    sheetName: 'Envios Correios',
    gid: '641203793',
    label: 'Envios Correios',
    type: 'correios',
    enabled: true,
  },
  {
    id: 'futuro1',
    sheetName: 'Futuro1',
    gid: '1375191094',
    label: 'Futuro1',
    type: 'generic',
    enabled: false,
  },
  {
    id: 'futuro2',
    sheetName: 'Futuro2',
    gid: '1543667616',
    label: 'Futuro2',
    type: 'generic',
    enabled: false,
  },
];

export function getDatasetConfig(datasetId) {
  return DATASET_CONFIGS.find((dataset) => dataset.id === datasetId) || null;
}

export function getEnabledDatasets() {
  return DATASET_CONFIGS.filter((dataset) => dataset.enabled);
}
