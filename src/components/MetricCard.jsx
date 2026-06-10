export default function MetricCard({ title, value, subtitle, icon: Icon, tone = 'default' }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-icon">{Icon ? <Icon size={20} aria-hidden="true" /> : null}</div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
    </article>
  );
}
