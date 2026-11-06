import { useQuery } from '@tanstack/react-query';
import { Building2, Users, MapPinned, Sprout, Ban, MessageCircle, Cpu, Plug, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { currency, number, date } from '../../lib/format';
import { Card, CardHeader, Badge, LoadingBlock, EmptyState } from '../../components/ui';

function Stat({ label, value, icon, tone }: { label: string; value: any; icon: React.ReactNode; tone: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-[19px] font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await api.get('/admin/dashboard')).data,
  });

  if (isLoading) return <LoadingBlock label="Carregando painel..." />;
  const t = data?.totals ?? {};

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold text-slate-800">Painel do Super Admin</h1>
        <p className="text-sm text-slate-500">Visão geral da plataforma e dos clientes</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total de clientes" value={t.clients ?? 0} icon={<Building2 size={20} />} tone="bg-green-100 text-green-700" />
        <Stat label="Clientes ativos" value={t.activeClients ?? 0} icon={<Sprout size={20} />} tone="bg-emerald-100 text-emerald-700" />
        <Stat label="Clientes bloqueados" value={t.blockedClients ?? 0} icon={<Ban size={20} />} tone="bg-red-100 text-red-700" />
        <Stat label="Fazendas" value={t.farms ?? 0} icon={<MapPinned size={20} />} tone="bg-lime-100 text-lime-700" />
        <Stat label="Hectares cadastrados" value={number(t.hectares, 0)} icon={<Sprout size={20} />} tone="bg-amber-100 text-amber-700" />
        <Stat label="Usuários" value={t.users ?? 0} icon={<Users size={20} />} tone="bg-blue-100 text-blue-700" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Clientes cadastrados recentemente"
            actions={
              <Link to="/admin/clientes" className="flex items-center gap-1 text-sm font-medium text-green-700 hover:underline">
                Ver todos <ArrowRight size={14} />
              </Link>
            }
          />
          {(data?.recentClients ?? []).length === 0 ? (
            <EmptyState
              icon={<Building2 size={40} />}
              title="Nenhum cliente cadastrado"
              description="Cadastre o primeiro cliente em Clientes / Empresas para liberar o acesso ao sistema."
              action={
                <Link to="/admin/clientes" className="btn-primary">
                  Cadastrar cliente
                </Link>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Empresa</th>
                    <th>Fazendas</th>
                    <th>Usuários</th>
                    <th>Status</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentClients.map((c: any) => (
                    <tr key={c.id}>
                      <td className="font-medium text-slate-700">{c.clientName}</td>
                      <td>{c.companyName}</td>
                      <td>{c.farmsCount}</td>
                      <td>{c.usersCount}</td>
                      <td>
                        <Badge tone={c.status === 'ATIVO' ? 'green' : 'red'}>{c.status === 'ATIVO' ? 'Ativo' : 'Bloqueado'}</Badge>
                      </td>
                      <td>{date(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Conexões WhatsApp" icon={<MessageCircle size={17} className="text-green-700" />} />
            <div className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Conectadas</span>
                <span className="font-semibold text-green-700">{data?.whatsapp?.connected ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Desconectadas</span>
                <span className="font-semibold text-slate-600">{data?.whatsapp?.disconnected ?? 0}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500">Total de instâncias</span>
                <span className="font-semibold text-slate-700">{data?.whatsapp?.total ?? 0}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Consumo de IA (mês)" icon={<Cpu size={17} className="text-green-700" />} />
            <div className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Requisições</span>
                <span className="font-semibold text-slate-700">{number(data?.aiConsumption?.monthRequests, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tokens</span>
                <span className="font-semibold text-slate-700">{number(data?.aiConsumption?.monthTokens, 0)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500">Custo estimado</span>
                <span className="font-semibold text-slate-700">US$ {number(data?.aiConsumption?.monthCostUsd, 4)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Status das integrações" icon={<Plug size={17} className="text-green-700" />} />
            {(data?.integrations ?? []).length === 0 ? (
              <EmptyState title="Nenhuma integração" description="Cadastre servidores Evolution API em Integrações." />
            ) : (
              <div className="space-y-2 p-4">
                {data.integrations.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-700">{s.name}</p>
                      <p className="truncate text-xs text-slate-500">{s.baseUrl}</p>
                    </div>
                    <Badge tone={s.status === 'ATIVO' ? 'green' : 'slate'}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Consumo de IA por empresa" icon={<Cpu size={17} className="text-green-700" />} />
        {(data?.aiConsumption?.byCompany ?? []).length === 0 ? (
          <EmptyState title="Sem consumo registrado" description="As consultas ao assistente IA aparecerão aqui." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Requisições</th>
                  <th>Tokens</th>
                  <th>Custo (US$)</th>
                </tr>
              </thead>
              <tbody>
                {data.aiConsumption.byCompany.map((c: any) => (
                  <tr key={c.companyId}>
                    <td className="font-medium text-slate-700">{c.companyName}</td>
                    <td>{c.requests}</td>
                    <td>{number(c.tokens, 0)}</td>
                    <td>{number(c.costUsd, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
