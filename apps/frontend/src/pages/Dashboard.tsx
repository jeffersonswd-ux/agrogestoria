import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  Wheat, Sprout, ScanLine, Coins, TrendingUp, BarChart3, MapPinned, Bell, CloudSun, RefreshCw,
  Calendar, ChevronDown, Wallet, Package, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { currency, number, date, STATUS_LABEL } from '../lib/format';
import { Card, CardHeader, Badge, EmptyState, LoadingBlock } from '../components/ui';

const CULTURE_COLORS: Record<string, string> = {
  Soja: '#f59e0b',
  Milho: '#16a34a',
  Sorgo: '#9333ea',
  'Cana-de-açúcar': '#2563eb',
  Hortifrúti: '#94a3b8',
  Outras: '#86efac',
};

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: any;
  icon: React.ReactNode;
  tone: 'green' | 'lime' | 'emerald' | 'amber' | 'green2' | 'green3';
}) {
  const tones = {
    green: 'bg-green-100 text-green-700',
    lime: 'bg-lime-100 text-lime-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    green2: 'bg-green-100 text-green-700',
    green3: 'bg-green-100 text-green-700',
  }[tone];
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-[19px] font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });

  const { data: weather } = useQuery({
    queryKey: ['dashboard-weather'],
    queryFn: async () => (await api.get('/weather')).data,
    retry: false,
  });

  if (isLoading) return <LoadingBlock label="Carregando dashboard..." />;

  const c = data?.cards ?? {};
  const monthly = data?.monthly ?? [];
  const costs = data?.costsByCulture ?? [];

  const totalCost = costs.reduce((s: number, x: any) => s + x.value, 0);

  const financeCols = [
    { key: 'date', label: 'Vencimento' },
    { key: 'description', label: 'Descrição' },
    { key: 'type', label: 'Tipo' },
    { key: 'amount', label: 'Valor', render: (r: any) => currency(r.amount) },
    { key: 'status', label: 'Status', render: (r: any) => <Badge tone={r.status === 'VENCIDO' ? 'red' : r.status === 'PAGO' ? 'green' : 'amber'}>{STATUS_LABEL[r.status] ?? r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800">Dashboard Agrícola</h1>
          <p className="text-sm text-slate-500">Visão geral da sua operação agrícola</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select className="input min-w-[190px] appearance-none py-2 pr-8 text-sm" defaultValue="">
              <option value="">Selecione o período</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button onClick={() => refetch()} className="btn-secondary px-2.5" title="Atualizar">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Área Total" value={c.areaTotal ? `${number(c.areaTotal)} ha` : '—'} icon={<Wheat size={20} />} tone="green" />
        <KpiCard label="Área Plantada" value={c.areaPlanted ? `${number(c.areaPlanted)} ha` : '—'} icon={<Sprout size={20} />} tone="lime" />
        <KpiCard label="Área Disponível" value={c.areaAvailable ? `${number(c.areaAvailable)} ha` : '—'} icon={<ScanLine size={20} />} tone="emerald" />
        <KpiCard label="Investimento Total" value={currency(c.investment, { compact: true })} icon={<Coins size={20} />} tone="amber" />
        <KpiCard label="Receita Realizada" value={currency(c.revenueRealized, { compact: true })} icon={<TrendingUp size={20} />} tone="green" />
        <KpiCard label="Lucro Realizado" value={currency(c.profit, { compact: true })} icon={<BarChart3 size={20} />} tone="green" />
      </div>

      {/* Painéis de estado */}
      <div className="grid gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader title="Produção da Safra" icon={<Wheat size={17} className="text-green-700" />} />
          {c.harvestedProduction || c.estimatedProduction ? (
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Produção estimada</span>
                <span className="font-semibold text-slate-700">{number(c.estimatedProduction)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Produção colhida</span>
                <span className="font-semibold text-slate-700">{number(c.harvestedProduction)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Produtividade média</span>
                <span className="font-semibold text-slate-700">{number(c.averageYield)}</span>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Wheat size={40} />} title="Sem dados de produção" description="Cadastre safras e colheitas para visualizar aqui." />
          )}
        </Card>

        <Card>
          <CardHeader title="Custos" icon={<Coins size={17} className="text-green-700" />} />
          {c.totalCost > 0 ? (
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Custo total</span>
                <span className="font-semibold text-slate-700">{currency(c.totalCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Custo por hectare</span>
                <span className="font-semibold text-slate-700">{currency(c.costPerHa)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Custo por saca</span>
                <span className="font-semibold text-slate-700">{currency(c.costPerBag)}</span>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Coins size={40} />} title="Sem lançamentos de custos" description="Registre despesas para acompanhar os custos." />
          )}
        </Card>

        <Card>
          <CardHeader title="Financeiro (Período)" icon={<Wallet size={17} className="text-green-700" />} />
          {c.payable || c.receivable ? (
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Contas a pagar</span>
                <span className="font-semibold text-red-600">{currency(c.payable)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Contas a receber</span>
                <span className="font-semibold text-green-700">{currency(c.receivable)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Fluxo de caixa</span>
                <span className="font-semibold text-slate-700">{currency(c.cashFlow)}</span>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Wallet size={40} />} title="Sem movimentação financeira" description="Lance contas a pagar e a receber." />
          )}
        </Card>

        <Card>
          <CardHeader title="Atividades" icon={<Calendar size={17} className="text-green-700" />} />
          {c.opsPlanned || c.opsInProgress || c.opsDone || c.opsLate ? (
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Planejadas</span>
                <span className="font-semibold text-slate-700">{c.opsPlanned}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Em andamento</span>
                <span className="font-semibold text-amber-600">{c.opsInProgress}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Concluídas</span>
                <span className="font-semibold text-green-700">{c.opsDone}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Atrasadas</span>
                <span className="font-semibold text-red-600">{c.opsLate}</span>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Calendar size={40} />} title="Sem atividades registradas" description="Cadastre o planejamento e as operações de campo." />
          )}
        </Card>
      </div>

      {/* Custos por cultura + Receita x Despesa + Mapa */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader title="Custos por Cultura" icon={<Coins size={17} className="text-green-700" />} />
          {costs.length === 0 ? (
            <EmptyState icon={<Package size={40} />} title="Sem dados" description="Lance custos de operações para visualizar o gráfico." />
          ) : (
            <div className="flex items-center gap-3 p-4">
              <div className="h-[160px] w-[160px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costs} dataKey="value" nameKey="culture" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {costs.map((entry: any, i: number) => (
                        <Cell key={i} fill={CULTURE_COLORS[entry.culture] ?? '#22c55e'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => currency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {costs.map((entry: any) => (
                  <div key={entry.culture} className="flex items-center gap-2 text-[12.5px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CULTURE_COLORS[entry.culture] ?? '#22c55e' }} />
                    <span className="flex-1 truncate text-slate-600">{entry.culture}</span>
                    <span className="shrink-0 font-medium text-slate-700">
                      {totalCost ? `${Math.round((entry.value / totalCost) * 100)}%` : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Receita x Despesa (Mensal)"
            icon={<BarChart3 size={17} className="text-green-700" />}
            actions={
              <div className="flex gap-3 text-[11.5px]">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Receita
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Despesa
                </span>
              </div>
            }
          />
          {monthly.some((m: any) => m.revenue || m.expense) ? (
            <div className="h-[220px] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: any) => currency(v)} />
                  <Bar dataKey="revenue" name="Receita" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={<BarChart3 size={40} />} title="Sem dados para exibir" description="Lance receitas e despesas para visualizar o gráfico." />
          )}
        </Card>

        <Card>
          <CardHeader title="Mapa da Propriedade" icon={<MapPinned size={17} className="text-green-700" />} />
          {(data?.map ?? []).length === 0 ? (
            <EmptyState icon={<MapPinned size={40} />} title="Sem propriedades cadastradas" description="Cadastre uma propriedade para visualizar no mapa." />
          ) : (
            <div className="space-y-2 p-4">
              {(data?.map ?? []).map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-700">{f.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {f.municipality || '—'} {f.state ? `/ ${f.state}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-600">{number(f.areaHa)} ha</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Desempenho + Alertas + Clima */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Desempenho por Cultura" icon={<Sprout size={17} className="text-green-700" />} />
          {(data?.seasonPerformance ?? []).length === 0 ? (
            <EmptyState icon={<Sprout size={40} />} title="Sem registros" description="Cadastre culturas e safras para visualizar o desempenho." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cultura</th>
                    <th>Produtividade</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.seasonPerformance.map((s: any, i: number) => (
                    <tr key={i}>
                      <td>{STATUS_LABEL[s.status] ?? s.status}</td>
                      <td>{number(s.yield)}</td>
                      <td>
                        <Badge tone={s.harvested ? 'green' : 'amber'}>{s.harvested ? 'Colhida' : 'Em andamento'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Alertas e Pendências" icon={<Bell size={17} className="text-green-700" />} />
          <EmptyState
            icon={<CheckCircle2 size={40} />}
            title="Nenhum alerta no momento"
            description="Aqui serão exibidos alertas de contas, manutenções, estoque, atividades e prazos."
          />
        </Card>

        <Card>
          <CardHeader title="Clima da Propriedade" icon={<CloudSun size={17} className="text-green-700" />} />
          {!weather?.available ? (
            <EmptyState icon={<CloudSun size={40} />} title="Clima indisponível" description={weather?.reason ?? 'Selecione uma propriedade com coordenadas para ver o clima.'} />
          ) : (
            <div>
              <div className="flex items-center gap-4 px-4 py-3">
                <CloudSun size={44} className="text-amber-500" />
                <div className="flex-1">
                  <p className="text-2xl font-bold text-slate-800">{number(weather.current?.temperature, 1)}°C</p>
                  <p className="text-xs text-slate-500">{weather.current?.description}</p>
                </div>
                <div className="space-y-1 text-right text-[12px] text-slate-600">
                  <p>Umidade: {weather.current?.humidity}%</p>
                  <p>Vento: {number(weather.current?.wind, 1)} km/h</p>
                  <p>Chuva: {number(weather.current?.rain, 1)} mm</p>
                </div>
              </div>
              <div className="grid grid-cols-5 border-t border-slate-100">
                {(weather.daily ?? []).slice(0, 5).map((d: any, i: number) => (
                  <div key={i} className="border-r border-slate-100 px-2 py-2.5 text-center last:border-r-0">
                    <p className="text-[11px] font-medium text-slate-500">{i === 0 ? 'Hoje' : d.weekday}</p>
                    <CloudSun size={18} className="mx-auto my-1.5 text-amber-500" />
                    <p className="text-[11.5px] text-slate-700">
                      {number(d.tempMax, 0)}° / {number(d.tempMin, 0)}°
                    </p>
                    <p className="text-[10.5px] text-blue-600">{number(d.rainChance, 0)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Últimas atividades */}
      <Card>
        <CardHeader title="Últimas Atividades" icon={<Clock size={17} className="text-green-700" />} />
        {(data?.recentOperations ?? []).length === 0 ? (
          <EmptyState icon={<Clock size={36} />} title="Nenhuma atividade recente" description="As últimas operações de campo aparecerão aqui." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Cultura</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOperations.map((o: any) => (
                  <tr key={o.id}>
                    <td>{date(o.doneDate || o.plannedDate || o.createdAt)}</td>
                    <td>{o.type}</td>
                    <td>{o.description || '—'}</td>
                    <td>{o.season?.culture || '—'}</td>
                    <td>
                      <Badge tone={o.status === 'CONCLUIDA' ? 'green' : o.status === 'ATRASADA' ? 'red' : 'amber'}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!data?.cards?.farmsCount && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <AlertTriangle size={16} className="text-amber-500" />
          Comece cadastrando sua primeira propriedade em <strong className="mx-1">Propriedades e Talhões</strong> — {user?.company?.companyName} ainda não possui áreas cadastradas.
        </div>
      )}
    </div>
  );
}
