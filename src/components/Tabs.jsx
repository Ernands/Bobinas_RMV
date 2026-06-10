export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <nav className="tabs" aria-label="Seções do dashboard">
      {tabs.map((tab) => (
        <button
          className={tab.id === activeTab ? 'active' : ''}
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.icon ? <tab.icon size={17} aria-hidden="true" /> : null}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
