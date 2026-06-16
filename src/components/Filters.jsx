import { useMemo, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = useMemo(
    () => Object.entries(filters).filter(([key, value]) => Boolean(value) && !(key === 'statusMode' && value === 'all')).length,
    [filters],
  );

  function setFilter(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section className={`filters-panel ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2>Recorte da análise</h2>
        </div>
        <div className="heading-actions">
          <span className="filter-summary">
            {activeCount ? `${activeCount} filtro(s) ativo(s)` : 'Sem filtros ativos'}
          </span>
          <button
            className={`icon-button filters-toggle ${isOpen ? 'open' : ''}`}
            type="button"
            title={isOpen ? 'Recolher filtros' : 'Expandir filtros'}
            onClick={() => setIsOpen((current) => !current)}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" title="Limpar filtros" onClick={onReset}>
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="filters-grid">
          <label className="field">
            <span>Ano</span>
            <select
              value={filters.referenceYear}
              onChange={(event) => setFilter('referenceYear', event.target.value)}
            >
              <option value="">Todos</option>
              {(options.years || []).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Mês/Ano</span>
            <select value={filters.referenceMonth} onChange={(event) => setFilter('referenceMonth', event.target.value)}>
              <option value="">Todos</option>
              {options.months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status do relatório</span>
            <select value={filters.statusMode} onChange={(event) => setFilter('statusMode', event.target.value)}>
              <option value="all">Enviado e Pendente</option>
              <option value="sent">Somente Enviado</option>
              <option value="pending">Somente Pendente</option>
            </select>
          </label>
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
      ) : null}
    </section>
  );
}
