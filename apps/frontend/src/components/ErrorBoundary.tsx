import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Evita que uma falha isolada de tela deixe a aplicação em branco:
 * mostra o erro e permite recarregar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error(`[Erro em ${this.props.label ?? 'tela'}]`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={22} />
        </div>
        <h2 className="text-base font-semibold text-slate-800">
          Erro ao carregar {this.props.label ?? 'esta tela'}
        </h2>
        <p className="max-w-md text-sm text-slate-500">{this.state.error.message}</p>
        <button
          className="btn-secondary"
          onClick={() => {
            this.setState({ error: null });
            window.location.reload();
          }}
        >
          <RefreshCw size={15} /> Recarregar
        </button>
      </div>
    );
  }
}
