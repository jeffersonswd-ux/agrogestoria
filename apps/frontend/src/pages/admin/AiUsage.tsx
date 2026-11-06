import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, EmptyState, Input, LoadingBlock, PageHeader, Select, Badge } from '../../components/ui';
import { number } from '../../lib/format';

export default function AdminAiUsage() {
  const [companyId, setCompanyId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['admin-client-options'],
    queryFn: async () => (await api.get('/admin/companies', { params: { pageSize: 200 } })).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-usage', companyId, from, to],
    queryFn: async () =>
      (await api.get('/admin/ai-usage', { params: { companyId: companyId || undefined, from: from || undefined, to: to || undefined, pageSize: 50 } })).data,
  });

  return (
    <div>
      <PageHeader title="Consumo de IA" description="Requisições, tokens e custo estimado por empresa" />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-[240px]">
            <label className="label">Empresa</label>
            <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Todas as empresas</option>
              {(clients?.data ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.clientName}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">De</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Até</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 px-4 py-4 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Requisições no período</p>
            <p className="text-xl font-bold text-slate-800">{number(data?.summary?.totalRequests, 0)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Tokens consumidos</p>
            <p className="text-xl font-bold text-slate-800">{number(data?.summary?.totalTokens, 0)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Custo estimado (US$)</p>
            <p className="text-xl font-bold text-slate-800">{number(data?.summary?.totalCostUsd, 4)}</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState icon={<Cpu size={40} />} title="Sem consumo registrado" description="As consultas ao assistente IA dos clientes aparecerão aqui." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Requisições</th>
                  <th>Tokens de entrada</th>
                  <th>Tokens de saída</th>
                  <th>Total</th>
                  <th>Custo (US$)</th>
                  <th>Limite mensal</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((r: any) => (
                  <tr key={r.companyId}>
                    <td>
                      <p className="font-medium text-slate-700">{r.companyName}</p>
                      <p className="text-xs text-slate-500">{r.clientName}</p>
                    </td>
                    <td>{r.requests}</td>
                    <td>{number(r.promptTokens, 0)}</td>
                    <td>{number(r.completionTokens, 0)}</td>
                    <td>{number(r.totalTokens, 0)}</td>
                    <td>{number(r.costUsd, 4)}</td>
                    <td>{r.monthlyLimit ?? <Badge tone="slate">Sem limite</Badge>}</td>
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
