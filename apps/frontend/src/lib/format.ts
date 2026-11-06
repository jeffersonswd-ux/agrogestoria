export const currency = (value?: number | null, opts: { compact?: boolean } = {}) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: opts.compact ? 'compact' : 'standard',
        maximumFractionDigits: opts.compact ? 1 : 2,
      }).format(value);

export const number = (value?: number | null, digits = 2) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);

export const area = (value?: number | null) => (value == null ? '—' : `${number(value)} ha`);

export const date = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—';

export const dateTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString('pt-BR') : '—';

export const initials = (name?: string | null) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

export const STATUS_LABEL: Record<string, string> = {
  ATIVO: 'Ativo',
  BLOQUEADO: 'Bloqueado',
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada',
  CANCELADA: 'Cancelada',
  COLHIDA: 'Colhida',
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  VENCIDO: 'Vencido',
  ABERTA: 'Aberta',
  RECEBIDA: 'Recebida',
  CONECTADO: 'Conectado',
  DESCONECTADO: 'Desconectado',
  AGUARDANDO_QR: 'Aguardando QR',
  CONECTANDO: 'Conectando',
};

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_CLIENTE: 'Administrador',
  GERENTE_FAZENDA: 'Gerente de Fazenda',
  OPERADOR: 'Operador',
  FINANCEIRO: 'Financeiro',
  AGRONOMO: 'Agrônomo',
};
