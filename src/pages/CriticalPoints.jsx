import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import AlertBox from '../components/AlertBox';

export default function CriticalPoints({
  bobinasAlerts,
  correiosAlerts,
  hasBobinasData,
  hasCorreiosData,
}) {
  const alerts = [
    ...(bobinasAlerts || []).map((alert) => ({ ...alert, title: `Bobinas: ${alert.title}` })),
    ...(correiosAlerts || []).map((alert) => ({ ...alert, title: `Correios: ${alert.title}` })),
  ];

  return (
    <div className="page-grid">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Gestão</p>
          <h2>Pontos Críticos</h2>
          <p>Consolida alertas operacionais das bases carregadas.</p>
        </div>
      </section>

      {!hasBobinasData || !hasCorreiosData ? (
        <section className="alerts-grid">
          {!hasBobinasData ? (
            <article className="alert-box warning">
              <AlertTriangle size={20} aria-hidden="true" />
              <div>
                <strong>Bobinas não carregada</strong>
                <p>Os pontos críticos de Bobinas aparecem quando a aba Bobinas é carregada.</p>
              </div>
            </article>
          ) : null}
          {!hasCorreiosData ? (
            <article className="alert-box warning">
              <AlertTriangle size={20} aria-hidden="true" />
              <div>
                <strong>Correios não carregada</strong>
                <p>Os pontos críticos de Envios Correios aparecem quando a aba Correios é carregada.</p>
              </div>
            </article>
          ) : null}
        </section>
      ) : null}

      {alerts.length ? (
        <AlertBox alerts={alerts} />
      ) : (
        <section className="alerts-grid">
          <article className="alert-box success">
            <CheckCircle2 size={20} aria-hidden="true" />
            <div>
              <strong>Sem pontos críticos no recorte atual</strong>
              <p>As bases carregadas não indicam alertas relevantes neste momento.</p>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
