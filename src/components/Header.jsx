import { Bell, DatabaseZap, Printer } from 'lucide-react';

export default function Header({ activeLabel, onPrint }) {
  return (
    <header className="topbar">
      <div>
        <h1>Dashboard de Bobinas</h1>
        <p>{activeLabel || 'Visão Geral'}</p>
      </div>
      <div className="header-actions">
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
