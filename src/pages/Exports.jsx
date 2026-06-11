import { Download, Printer } from 'lucide-react';
import { downloadCsv } from '../utils/csvExport';
import { formatDateBR } from '../utils/dateUtils';

export default function Exports({ analytics, correiosAnalytics }) {
  const bobinasActions = [
    {
      label: 'Relatório mensal em CSV',
      filename: 'relatorio-mensal-demanda.csv',
      rows: analytics.monthlyDemand,
      columns: [
        { label: 'Mês', value: (row) => row.month },
        { label: 'Pedidos', key: 'orders' },
        { label: 'Unidades', key: 'units' },
        { label: 'Total 56x16', key: 'units16' },
        { label: 'Total 56x30', key: 'units30' },
        { label: 'Caixas mínimas 56x16', key: 'minBoxes16' },
        { label: 'Caixas mínimas 56x30', key: 'minBoxes30' },
        { label: 'Custo total', key: 'totalCost' },
      ],
    },
    {
      label: 'Cobertura compra x demanda em CSV',
      filename: 'cobertura-compras-demanda.csv',
      rows: analytics.coverage,
      columns: [
        { label: 'Mês pedido', value: (row) => row.orderMonthLabel },
        { label: 'Mês atendido', value: (row) => row.servedMonthLabel },
        { label: 'Tipo', key: 'type' },
        { label: 'Unidades compradas', key: 'units' },
        { label: 'Caixas compradas', key: 'boxes' },
        { label: 'Demanda real', key: 'demandUnits' },
        { label: 'Diferença unidades', key: 'differenceUnits' },
        { label: 'Diferença caixas', key: 'differenceBoxes' },
        { label: 'Custo compra', key: 'cost' },
        { label: 'Custo consumo', key: 'consumptionCost' },
        { label: 'Saldo financeiro', key: 'financialBalance' },
        { label: 'Status', key: 'status' },
      ],
    },
    {
      label: 'Relatório por destino em CSV',
      filename: 'relatorio-destinos.csv',
      rows: analytics.destinations,
      columns: [
        { label: 'Destino', key: 'destination' },
        { label: 'UF', key: 'uf' },
        { label: 'Pedidos', key: 'orders' },
        { label: 'Unidades', key: 'units' },
        { label: 'Total 56x16', key: 'units16' },
        { label: 'Total 56x30', key: 'units30' },
        { label: 'Primeira abertura', value: (row) => formatDateBR(row.firstOpening) },
        { label: 'Última abertura', value: (row) => formatDateBR(row.lastOpening) },
        { label: 'Primeira saída', value: (row) => formatDateBR(row.firstExit) },
        { label: 'Última saída', value: (row) => formatDateBR(row.lastExit) },
        { label: 'Média por pedido', key: 'averagePerOrder' },
      ],
    },
    {
      label: 'Pedidos acima de 50 em CSV',
      filename: 'pedidos-acima-50.csv',
      rows: analytics.largeOrders,
      columns: [
        { label: 'Mês', value: (row) => row.month },
        { label: 'Pedidos acima de 50', key: 'orders' },
        { label: 'Unidades acima de 50', key: 'units' },
        { label: 'Total 56x16', key: 'units16' },
        { label: 'Total 56x30', key: 'units30' },
        { label: 'Participação', key: 'participation' },
        { label: 'Variação unidades', key: 'deltaUnits' },
      ],
    },
  ];
  const correiosActions = correiosAnalytics ? [
    {
      label: 'Resumo anual Correios em CSV',
      filename: 'correios-resumo-anual.csv',
      rows: [{
        year: correiosAnalytics.selectedYear,
        shipments: correiosAnalytics.summary.shipments,
        totalCost: correiosAnalytics.summary.totalCost,
        averageCost: correiosAnalytics.summary.averageCost,
        totalWeight: correiosAnalytics.summary.totalWeight,
        pac: correiosAnalytics.summary.pac,
        sedex: correiosAnalytics.summary.sedex,
        reversos: correiosAnalytics.summary.reversos,
        peakMonth: correiosAnalytics.summary.peakMonth.month,
      }],
      columns: [
        { label: 'Ano', key: 'year' },
        { label: 'Envios', key: 'shipments' },
        { label: 'Valor total', key: 'totalCost' },
        { label: 'Custo médio', key: 'averageCost' },
        { label: 'Peso total', key: 'totalWeight' },
        { label: 'PAC', key: 'pac' },
        { label: 'SEDEX', key: 'sedex' },
        { label: 'Reversos', key: 'reversos' },
        { label: 'Mês maior gasto', key: 'peakMonth' },
      ],
    },
    {
      label: 'Custos por tipo de chamado em CSV',
      filename: 'correios-custos-tipo-chamado.csv',
      rows: correiosAnalytics.callTypes,
      columns: [
        { label: 'Tipo de chamado', key: 'callType' },
        { label: 'Envios', key: 'shipments' },
        { label: 'Valor total', key: 'totalCost' },
        { label: 'Custo médio', key: 'averageCost' },
        { label: 'Peso total', key: 'totalWeight' },
        { label: 'PAC', key: 'pac' },
        { label: 'SEDEX', key: 'sedex' },
        { label: 'Reversos', key: 'reversos' },
        { label: '% custo anual', key: 'percentageCost' },
        { label: 'Mês pico', key: 'peakMonth' },
      ],
    },
    {
      label: 'Matriz mensal por tipo em CSV',
      filename: 'correios-matriz-tipo-chamado.csv',
      rows: correiosAnalytics.matrixRows,
      columns: [
        { label: 'Tipo de chamado', key: 'callType' },
        ...correiosAnalytics.monthly.map((month) => ({
          label: month.month,
          value: (row) => row.monthValues[month.monthKey],
        })),
        { label: 'Total', key: 'totalCost' },
      ],
    },
    {
      label: 'Ranking Cobans em CSV',
      filename: 'correios-ranking-cobans.csv',
      rows: correiosAnalytics.rankings.cobans,
      columns: [
        { label: 'Coban', key: 'name' },
        { label: 'Envios', key: 'shipments' },
        { label: 'Valor total', key: 'totalCost' },
        { label: 'Custo médio', key: 'averageCost' },
      ],
    },
    {
      label: 'Ranking Lojas em CSV',
      filename: 'correios-ranking-lojas.csv',
      rows: correiosAnalytics.rankings.lojas,
      columns: [
        { label: 'Loja', key: 'name' },
        { label: 'Envios', key: 'shipments' },
        { label: 'Valor total', key: 'totalCost' },
        { label: 'Custo médio', key: 'averageCost' },
      ],
    },
    {
      label: 'Tabela detalhada Correios em CSV',
      filename: 'correios-envios-detalhados.csv',
      rows: correiosAnalytics.filteredRecords,
      columns: [
        { label: 'Data da postagem', value: (row) => formatDateBR(row.postingDate) },
        { label: 'Rastreamento', key: 'tracking' },
        { label: 'Serviço dos Correios', key: 'service' },
        { label: 'Tipo de chamado', key: 'callType' },
        { label: 'Número do chamado', key: 'callNumber' },
        { label: 'Peso', key: 'weightKg' },
        { label: 'Unidade da postagem', key: 'postingUnit' },
        { label: 'CEP', key: 'cep' },
        { label: 'Valor unitário', key: 'unitValue' },
        { label: 'Valor desconto', key: 'discountValue' },
        { label: 'Valor serviço', key: 'serviceValue' },
        { label: 'Coban', key: 'coban' },
        { label: 'Loja', key: 'loja' },
      ],
    },
  ] : [];
  const actions = [...bobinasActions, ...correiosActions];

  return (
    <div className="page-grid">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Saídas de dados</p>
          <h2>Exportações</h2>
          <p>Baixe os relatórios consolidados em CSV ou use a impressão nativa do navegador.</p>
        </div>
      </section>

      <section className="export-grid">
        {actions.map((action) => (
          <article className="export-card" key={action.filename}>
            <div>
              <h3>{action.label}</h3>
              <p>{action.rows.length} linha(s) disponíveis</p>
            </div>
            <button
              className="button primary"
              disabled={!action.rows.length}
              type="button"
              onClick={() => downloadCsv(action.filename, action.rows, action.columns)}
            >
              <Download size={18} aria-hidden="true" />
              Baixar CSV
            </button>
          </article>
        ))}

        <article className="export-card">
          <div>
            <h3>Imprimir ou salvar em PDF</h3>
            <p>Usa o recurso nativo do navegador.</p>
          </div>
          <button className="button secondary" type="button" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            Imprimir
          </button>
        </article>
      </section>
    </div>
  );
}
