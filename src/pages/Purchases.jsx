import { useMemo, useState } from 'react';
import { Download, Pencil, Save, Trash2, Upload } from 'lucide-react';
import DataTable from '../components/DataTable';
import {
  BOBBIN_CONFIGS,
  calculateCost,
  formatCurrency,
  formatInteger,
  getBobbinConfig,
} from '../utils/calculations';
import { downloadJson } from '../utils/csvExport';
import { normalizeImportedPurchases } from '../utils/storage';

const EMPTY_FORM = {
  id: '',
  month: '',
  type: BOBBIN_CONFIGS['16'].label,
  boxes: '',
  note: '',
};

export default function Purchases({ rawPurchases, purchases, onSave, onDelete, onReplace }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [importError, setImportError] = useState('');

  const preview = useMemo(() => {
    const config = getBobbinConfig(form.type);
    const boxes = Number(form.boxes) || 0;
    const units = boxes * config.unitsPerBox;
    return {
      units,
      cost: calculateCost(units, config.unitCost),
    };
  }, [form.boxes, form.type]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.month || !form.type || Number(form.boxes) <= 0) {
      return;
    }

    onSave({
      id: form.id || `${form.month}-${form.type}-${Date.now()}`,
      month: form.month,
      type: form.type,
      boxes: Number(form.boxes),
      note: form.note,
    });
    resetForm();
  }

  function editPurchase(row) {
    setForm({
      id: row.id,
      month: row.month,
      type: row.type,
      boxes: row.boxes,
      note: row.note || '',
    });
  }

  function importJson(file) {
    if (!file) {
      return;
    }

    setImportError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        onReplace(normalizeImportedPurchases(parsed));
      } catch (error) {
        setImportError(error.message || 'Não foi possível importar o JSON.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="page-grid">
      <section className="section-heading split">
        <div>
          <p className="eyebrow">LocalStorage</p>
          <h2>Compras planejadas</h2>
          <p>
            Cadastre pedidos por mês. A entrega estimada é o mês seguinte e o mês atendido é dois
            meses depois do pedido.
          </p>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            type="button"
            onClick={() => downloadJson('compras-planejadas.json', { purchases: rawPurchases })}
          >
            <Download size={18} aria-hidden="true" />
            Exportar JSON
          </button>
          <label className="button secondary file-button">
            <Upload size={18} aria-hidden="true" />
            Importar JSON
            <input accept=".json,application/json" type="file" onChange={(event) => importJson(event.target.files?.[0])} />
          </label>
        </div>
      </section>

      <form className="purchase-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Mês do pedido</span>
          <input required type="month" value={form.month} onChange={(event) => updateField('month', event.target.value)} />
        </label>
        <label className="field">
          <span>Tipo de bobina</span>
          <select value={form.type} onChange={(event) => updateField('type', event.target.value)}>
            <option value={BOBBIN_CONFIGS['16'].label}>{BOBBIN_CONFIGS['16'].label}</option>
            <option value={BOBBIN_CONFIGS['30'].label}>{BOBBIN_CONFIGS['30'].label}</option>
          </select>
        </label>
        <label className="field">
          <span>Quantidade de caixas</span>
          <input
            min="1"
            required
            type="number"
            value={form.boxes}
            onChange={(event) => updateField('boxes', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Observação</span>
          <input value={form.note} onChange={(event) => updateField('note', event.target.value)} />
        </label>
        <div className="purchase-preview">
          <span>{formatInteger(preview.units)} unidades</span>
          <strong>{formatCurrency(preview.cost)}</strong>
        </div>
        <div className="button-row">
          <button className="button primary" type="submit">
            <Save size={18} aria-hidden="true" />
            {form.id ? 'Salvar edição' : 'Adicionar compra'}
          </button>
          {form.id ? (
            <button className="button secondary" type="button" onClick={resetForm}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      {importError ? <div className="upload-status danger">{importError}</div> : null}

      <DataTable
        columns={[
          { key: 'orderMonthLabel', label: 'Mês do pedido', sortValue: (row) => row.month },
          { key: 'type', label: 'Tipo' },
          { key: 'boxes', label: 'Caixas', value: (row) => formatInteger(row.boxes), sortValue: (row) => row.boxes },
          { key: 'units', label: 'Unidades', value: (row) => formatInteger(row.units), sortValue: (row) => row.units },
          { key: 'cost', label: 'Custo total', value: (row) => formatCurrency(row.cost), sortValue: (row) => row.cost },
          { key: 'deliveryMonthLabel', label: 'Entrega estimada', sortValue: (row) => row.deliveryMonth },
          { key: 'servedMonthLabel', label: 'Mês atendido', sortValue: (row) => row.servedMonth },
          { key: 'note', label: 'Observação', value: (row) => row.note || '-' },
          {
            key: 'actions',
            label: '',
            sortable: false,
            render: (row) => (
              <div className="row-actions">
                <button className="icon-button" title="Editar compra" type="button" onClick={() => editPurchase(row)}>
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button className="icon-button danger" title="Excluir compra" type="button" onClick={() => onDelete(row.id)}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ),
          },
        ]}
        rows={purchases}
      />
    </div>
  );
}
