import { Bell, DatabaseZap, Printer } from 'lucide-react';

export default function Header({ dataSourceStatus, onDataSourceClick, onPrint, pageMeta }) {
  const sourceTone = dataSourceStatus?.tone || 'idle';

  return (
    <header className="topbar">
      <div>
        <h1>{pageMeta?.title || 'Painel Operacional RMV'}</h1>
        <p>{pageMeta?.subtitle || 'Visão geral da operação'}</p>
      </div>
      <div className="header-actions">
        <button
          className={`button data-source-button ${sourceTone}`}
          title={dataSourceStatus?.title || 'Abrir fonte de dados'}
          type="button"
          onClick={onDataSourceClick}
        >
          <DatabaseZap size={18} aria-hidden="true" />
          Fonte de dados
        </button>
        <span className="local-badge">
          <DatabaseZap size={18} aria-hidden="true" />
          Sem backend
        </span>
        <button className="icon-button" type="button" title="Alertas">
          <Bell size={18} aria-hidden="true" />
        </button>
        <button className="button secondary" type="button" onClick={onPrint}>
          <Printer size={18} aria-hidden="true" />
          Imprimir
        </button>
      </div>
    </header>
  );
}
