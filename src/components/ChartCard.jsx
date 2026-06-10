export default function ChartCard({ title, subtitle, children }) {
  return (
    <section className="chart-card">
      <div className="section-heading compact">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="chart-wrap">{children}</div>
    </section>
  );
}
