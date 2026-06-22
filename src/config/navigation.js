import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  Mail,
  MapPinned,
  PackageOpen,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export const APP_TITLE = 'Painel Operacional RMV';

export const DEFAULT_PAGE_META = {
  title: APP_TITLE,
  subtitle: 'Visão geral da operação',
};

export const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      {
        id: 'overview',
        label: 'Visão Geral',
        icon: LayoutDashboard,
        subtitle: 'Visão geral da operação',
      },
    ],
  },
  {
    id: 'bobinas',
    label: 'Bobinas',
    icon: Boxes,
    items: [
      {
        id: 'monthly',
        label: 'Demanda Mensal',
        icon: BarChart3,
        subtitle: 'Análise mensal de bobinas',
      },
      {
        id: 'shipping',
        label: 'Saídas e Atrasos',
        icon: CalendarClock,
        subtitle: 'Acompanhamento de saídas e prazos',
      },
      {
        id: 'bobbin16',
        label: '56 MM X 16 M',
        icon: ClipboardList,
        subtitle: 'Análise da bobina 56 MM X 16 M',
      },
      {
        id: 'bobbin30',
        label: '56 MM X 30 M',
        icon: ReceiptText,
        subtitle: 'Análise da bobina 56 MM X 30 M',
      },
      {
        id: 'purchases',
        label: 'Compras Planejadas',
        icon: PackageOpen,
        subtitle: 'Planejamento de compras de bobinas',
      },
      {
        id: 'coverage',
        label: 'Cobertura',
        icon: ShieldCheck,
        subtitle: 'Cobertura de compra x demanda',
      },
      {
        id: 'destinations',
        label: 'Consolidado por Destino',
        icon: MapPinned,
        subtitle: 'Análise de solicitações, custos, envios Correios e divergências por destino',
      },
    ],
  },
  {
    id: 'correios',
    label: 'Correios',
    icon: Mail,
    items: [
      {
        id: 'correios',
        label: 'Envios Correios',
        icon: Mail,
        subtitle: 'Envios, custos e serviços dos Correios',
      },
      {
        id: 'correios-costs',
        label: 'Custos por Serviço',
        icon: BarChart3,
        subtitle: 'Custos por serviço dos Correios',
        disabled: true,
      },
      {
        id: 'correios-uf',
        label: 'Distribuição por UF',
        icon: MapPinned,
        subtitle: 'Distribuição dos Correios por UF',
        disabled: true,
      },
      {
        id: 'correios-reverse',
        label: 'Reversos',
        icon: PackageOpen,
        subtitle: 'Logística reversa dos Correios',
        disabled: true,
      },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    icon: TrendingUp,
    items: [
      {
        id: 'forecast',
        label: 'Previsão de Compra',
        icon: TrendingUp,
        subtitle: 'Planejamento e previsão operacional',
      },
      {
        id: 'critical',
        label: 'Pontos Críticos',
        icon: AlertTriangle,
        subtitle: 'Alertas e prioridades da operação',
      },
      {
        id: 'exports',
        label: 'Exportações',
        icon: FileDown,
        subtitle: 'Relatórios e exportação de dados',
      },
    ],
  },
  {
    id: 'futuros',
    label: 'Futuros',
    icon: ClipboardList,
    items: [
      {
        id: 'futuro1',
        label: 'Futuro1',
        icon: ClipboardList,
        subtitle: 'Base futura em preparação',
        disabled: true,
      },
      {
        id: 'futuro2',
        label: 'Futuro2',
        icon: ClipboardList,
        subtitle: 'Base futura em preparação',
        disabled: true,
      },
    ],
  },
];

export function getNavItems() {
  return NAV_GROUPS.flatMap((group) => group.items);
}

export function getPageMeta(activeTab) {
  const activeItem = getNavItems().find((item) => item.id === activeTab);
  return {
    title: APP_TITLE,
    subtitle: activeItem?.subtitle || DEFAULT_PAGE_META.subtitle,
  };
}

export function getActiveGroupId(activeTab) {
  return NAV_GROUPS.find((group) => group.items.some((item) => item.id === activeTab))?.id || NAV_GROUPS[0].id;
}
