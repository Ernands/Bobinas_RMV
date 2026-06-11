import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Gauge,
  PackageCheck,
  Truck,
} from 'lucide-react';
import AlertBox from '../components/AlertBox';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatInteger } from '../utils/calculations';

function isSentStatus(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase() === 'enviado';
}

export default function ExecutiveSummary({
  bobinasAnalytics,
  correiosAnalytics,
  hasBobinasData,
  hasCorreiosData,
}) {
  const bobinasUnits = bobinasAnalytics.monthlyDemand.reduce((sum, row) => sum + row.units, 0);
  const bobinasSentUnits = (bobinasAnalytics.records || [])
    .filter((record) => isSentStatus(record.status))
    .reduce((sum, record) => sum + record.quantity, 0);
  const bobinasCost = bobinasAnalytics.monthlyDemand.reduce((sum, row) => sum + row.totalCost, 0);
  const topCallType = correiosAnalytics.callTypes[0];
  const alerts = [
    ...(bobinasAnalytics.alerts || []),
    ...(correiosAnalytics.alerts || []),
  ].slice(0, 8);

  const rows = [
    {
      id: 'bobinas',
      area: 'Bobinas',
      indicator: 'Unidades solicitadas',
      value: hasBobinasData ? formatInteger(bobinasUnits) : 'Não carregado',
    },
    {
      id: 'bobinas-sent',
      area: 'Bobinas',
      indicator: 'Unidades enviadas',
      value: hasBobinasData ? formatInteger(bobinasSentUnits) : 'Não carregado',
    },
    {
      id: 'correios-cost',
      area: 'Correios',
      indicator: 'Gasto com postagens',
      value: hasCorreiosData ? formatCurrency(correiosAnalytics.summary.totalCost) : 'Não carregado',
    },
    {
      id: 'correios-top',
      area: 'Correios',
      indicator: 'Principal tipo de chamado por custo',
      value: topCallType?.callType || 'Não informado',
    },
  ];

  return (
    <div className="page-grid">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Resumo Executivo</h2>
          <p>Consolida os principais indicadores operacionais de Bobinas e Envios Correios.</p>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          icon={Boxes}
          title="Bobinas solicitadas"
          value={hasBobinasData ? formatInteger(bobinasUnits) : '0'}
          subtitle={hasBobinasData ? 'pela data de abertura' : 'base não carregada'}
        />
        <MetricCard
          icon={Truck}
          title="Bobinas enviadas"
          value={hasBobinasData ? formatInteger(bobinasSentUnits) : '0'}
          subtitle="somente status enviado"
          tone="success"
        />
        <MetricCard
          icon={DollarSign}
          title="Custo estimado de bobinas"
          value={hasBobinasData ? formatCurrency(bobinasCost) : formatCurrency(0)}
          tone="warning"
        />
        <MetricCard
          icon={PackageCheck}
          title="Envios Correios"
          value={hasCorreiosData ? formatInteger(correiosAnalytics.summary.shipments) : '0'}
          subtitle={hasCorreiosData ? correiosAnalytics.selectedYear : 'base não carregada'}
        />
        <MetricCard
          icon={DollarSign}
          title="Gasto com Correios"
          value={hasCorreiosData ? formatCurrency(correiosAnalytics.summary.totalCost) : formatCurrency(0)}
          tone="success"
        />
        <MetricCard
          icon={Gauge}
          title="Custo médio postagem"
          value={hasCorreiosData ? formatCurrency(correiosAnalytics.summary.averageCost) : formatCurrency(0)}
        />
        <MetricCard
          icon={AlertTriangle}
          title="Chamado líder em custo"
          value={topCallType?.callType || 'Sem dados'}
          subtitle={topCallType ? formatCurrency(topCallType.totalCost) : 'Correios não carregado'}
          tone="warning"
        />
        <MetricCard
          icon={DollarSign}
          title="Maior custo logístico"
          value={hasCorreiosData ? correiosAnalytics.summary.peakMonth.month : 'Sem dados'}
          subtitle={hasCorreiosData ? formatCurrency(correiosAnalytics.summary.peakMonth.totalCost) : ''}
        />
      </section>

      {!hasCorreiosData ? (
        <article className="alert-box warning">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>Base Envios Correios ainda não carregada</strong>
            <p>O resumo executivo está exibindo somente os indicadores disponíveis de Bobinas.</p>
          </div>
        </article>
      ) : null}

      <AlertBox alerts={alerts} />

      <ChartCard title="Leitura executiva" subtitle="Indicadores principais por área">
        <DataTable
          columns={[
            { key: 'area', label: 'Área' },
            { key: 'indicator', label: 'Indicador' },
            { key: 'value', label: 'Valor' },
          ]}
          rows={rows}
        />
      </ChartCard>
    </div>
  );
}
