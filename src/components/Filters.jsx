import { Filter, RotateCcw } from 'lucide-react';

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Filters({ filters, options, onChange, onReset }) {
  function setFilter(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section className="filters-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2>Recorte da análise</h2>
        </div>
        <div className="heading-actions">
          <Filter size={18} aria-hidden="true" />
          <button className="icon-button" type="button" title="Limpar filtros" onClick={onReset}>
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="filters-grid">
        <label className="field">
          <span>Abertura de</span>
          <input
            type="month"
            value={filters.openingFrom}
            onChange={(event) => setFilter('openingFrom', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Abertura até</span>
          <input
            type="month"
            value={filters.openingTo}
            onChange={(event) => setFilter('openingTo', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Saída de</span>
          <input
            type="month"
            value={filters.exitFrom}
            onChange={(event) => setFilter('exitFrom', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Saída até</span>
          <input
            type="month"
            value={filters.exitTo}
            onChange={(event) => setFilter('exitTo', event.target.value)}
          />
        </label>
        <SelectFilter
          label="Tipo de bobina"
          options={options.bobbinTypes}
          value={filters.bobbinType}
          onChange={(value) => setFilter('bobbinType', value)}
        />
        <SelectFilter label="UF" options={options.ufs} value={filters.uf} onChange={(value) => setFilter('uf', value)} />
        <SelectFilter
          label="Destino"
          options={options.destinations}
          value={filters.destination}
          onChange={(value) => setFilter('destination', value)}
        />
        <SelectFilter
          label="Status"
          options={options.statuses}
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
        />
        <SelectFilter
          label="Forma de envio"
          options={options.shippingMethods}
          value={filters.shippingMethod}
          onChange={(value) => setFilter('shippingMethod', value)}
        />
        <SelectFilter
          label="Tipo de chamado"
          options={options.callTypes}
          value={filters.callType}
          onChange={(value) => setFilter('callType', value)}
        />
        <label className="field">
          <span>Quantidade maior que</span>
          <input
            min="0"
            type="number"
            value={filters.minQuantity}
            onChange={(event) => setFilter('minQuantity', event.target.value)}
          />
        </label>
        <label className="check-field">
          <input
            checked={filters.onlyAbove50}
            type="checkbox"
            onChange={(event) => setFilter('onlyAbove50', event.target.checked)}
          />
          <span>Somente pedidos acima de 50 unidades</span>
        </label>
      </div>
    </section>
  );
}
