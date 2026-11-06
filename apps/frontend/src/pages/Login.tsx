import { FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { apiErrorMessage } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      const target = user.role === 'SUPER_ADMIN' ? '/admin' : location.state?.from || '/app';
      navigate(target, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-[#14331f] p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500">
            <Sprout size={24} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">AgroGestor IA</p>
            <p className="text-xs text-white/60">Gestão Agrícola Inteligente</p>
          </div>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-bold leading-snug text-white">
            Gestão agrícola completa, do campo ao financeiro.
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/60">
            Safras, operações, estoque, máquinas, clima e assistente inteligente em um só lugar.
          </p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} AgroGestor IA · Todos os direitos reservados</p>
      </div>

      <div className="flex w-full items-center justify-center bg-white p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
                <Sprout size={21} className="text-white" />
              </div>
              <p className="text-lg font-bold text-slate-800">AgroGestor IA</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Acessar o sistema</h1>
          <p className="mt-1 text-sm text-slate-500">Informe suas credenciais para continuar</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                className="input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            O acesso de novos clientes é liberado exclusivamente pelo administrador da plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}
