export interface FunnelData {
  id: string;
  name: string;
  code?: string | null;
  funnel_type?: string | null;
  visibility?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  category?: string | null;
  product_name?: string | null;
  predicted_investment?: number | null;

  // Verba por etapa (PORCENTAGEM - 0 a 100)
  budget_captacao_percent?: number | null;
  budget_aquecimento_percent?: number | null;
  budget_evento_percent?: number | null;
  budget_venda_percent?: number | null;
  budget_lembrete_percent?: number | null;
  budget_impulsionamento_percent?: number | null;

  // Informações
  lesson_type?: string | null;
  launch_type?: string | null;
  manager?: string | null;
  client?: string | null;

  // Metas
  ticket_medio?: number | null;
  leads_goal?: number | null;
  cpl_goal?: number | null;

  // Datas
  captacao_start?: string | null;
  captacao_end?: string | null;
  aquecimento_start?: string | null;
  aquecimento_end?: string | null;
  cpl_start?: string | null;
  cpl_end?: string | null;
  lembrete_start?: string | null;
  carrinho_start?: string | null;
  fechamento_date?: string | null;

  // Links antigos (mantidos por compatibilidade)
  drive_link?: string | null;
  dashboard_link?: string | null;
  briefing_link?: string | null;

  created_at: string;
  updated_at: string;
}

export interface FunnelLink {
  id: string;
  funnel_id: string;
  name: string;
  link_type: string;
  url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FunnelDiaryEntry {
  id: string;
  funnel_id: string;
  content: string;
  author_id?: string | null;
  author_name: string;
  created_at: string;
}

export interface FunnelChecklistItem {
  id: string;
  funnel_id: string;
  title: string;
  description?: string | null;
  is_completed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type DateStatus = 'future' | 'in_progress' | 'completed';

export interface Milestone {
  name: string;
  date: string;
  status: DateStatus;
}

export function getDateStatus(date: string | null): DateStatus {
  if (!date) return 'future';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate > today) return 'future';
  if (targetDate.getTime() === today.getTime()) return 'in_progress';
  return 'completed';
}

export function getNextMilestone(funnel: FunnelData): Milestone | null {
  const milestones: Milestone[] = [
    { name: 'Início da Captação', date: funnel.captacao_start || '', status: 'future' },
    { name: 'Fim da Captação', date: funnel.captacao_end || '', status: 'future' },
    { name: 'Início do Aquecimento', date: funnel.aquecimento_start || '', status: 'future' },
    { name: 'Início do CPL', date: funnel.cpl_start || '', status: 'future' },
    { name: 'Início do Carrinho', date: funnel.carrinho_start || '', status: 'future' },
    { name: 'Fechamento', date: funnel.fechamento_date || '', status: 'future' },
  ].filter(m => m.date && new Date(m.date) > new Date());

  if (milestones.length === 0) return null;

  return milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
}

export function getFunnelProgress(funnel: FunnelData): number {
  const start = funnel.captacao_start ? new Date(funnel.captacao_start) : null;
  const end = funnel.fechamento_date ? new Date(funnel.fechamento_date) : null;
  if (!start || !end) return 0;

  const today = new Date();
  const total = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();

  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === undefined || value === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCountdown(targetDate: string): string {
  const target = new Date(targetDate);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return 'Hoje';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
