import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const ICONS = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

export default function AlertBox({ alerts }) {
  if (!alerts?.length) {
    return (
      <section className="alerts-grid">
        <article className="alert-box success">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div>
            <strong>Sem alertas críticos</strong>
            <p>Os dados filtrados não indicam atraso, compra abaixo da demanda ou mês parcial.</p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="alerts-grid">
      {alerts.map((alert) => {
        const Icon = ICONS[alert.type] || Info;
        return (
          <article className={`alert-box ${alert.type}`} key={`${alert.title}-${alert.message}`}>
            <Icon size={20} aria-hidden="true" />
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
