import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin text-green-700`} />;
}

export function LoadingBlock({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <Spinner />
      {label}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({ title, icon, actions }: { title: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="card-header">
      {icon}
      <h3 className="card-title flex-1">{title}</h3>
      {actions}
    </div>
  );
}

export function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  const styles = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];
  return (
    <button className={`${styles} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <input className="input" {...rest} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Textarea({ label, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <textarea className="input min-h-[88px]" {...rest} />
    </div>
  );
}

export function Select({ label, className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <select className="input" {...rest}>
        {children}
      </select>
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  }[tone];
  return <span className={`badge ${tones}`}>{children}</span>;
}

export function statusTone(status?: string): 'slate' | 'green' | 'amber' | 'red' | 'blue' {
  switch (status) {
    case 'ATIVO':
    case 'CONCLUIDA':
    case 'PAGO':
    case 'COLHIDA':
    case 'CONECTADO':
    case 'RECEBIDA':
      return 'green';
    case 'BLOQUEADO':
    case 'VENCIDO':
    case 'ATRASADA':
    case 'CANCELADA':
    case 'ERRO':
      return 'red';
    case 'EM_ANDAMENTO':
    case 'PARCIAL':
    case 'PENDENTE':
    case 'PLANEJADA':
    case 'AGUARDANDO_QR':
    case 'CONECTANDO':
      return 'amber';
    case 'ABERTA':
      return 'blue';
    default:
      return 'slate';
  }
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="text-[15px] font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8">
      <div className={`card w-full ${widths} my-4`}>
        <div className="card-header">
          <h3 className="card-title flex-1">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>
        {total} registro{total === 1 ? '' : 's'} · página {page} de {Math.max(1, totalPages)}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-bold text-slate-800">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
