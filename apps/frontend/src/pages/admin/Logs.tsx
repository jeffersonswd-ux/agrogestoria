import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, EmptyState, Input, LoadingBlock, PageHeader, Pagination, Select } from '../../components/ui';
import { dateTime } from '../../lib/format';

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [companyId, setCompanyId] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['admin-client-options'],
    queryFn: async () => (await api.get('/admin/companies', { params: { pageSize: 200 } })).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page, search, action, companyId],
    queryFn: async () =>
      (await api.get('/admin/audit', {
        params: { page, pageSize: 30, search: search || undefined, action: action || undefined, companyId: companyId || undefined },
      })).data,
  });

  return (
    <div>
      <PageHeader title="Logs e Auditoria" description="Registro de todas as ações realizadas na plataforma" />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar por ação, entidade..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-60" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">Todas as ações</option>
            {(data?.actions ?? []).map((a: string) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <Select className="w-56" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(1); }}>
            <option value="">Todas as empresas</option>
            {(clients?.data ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.clientName}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState icon={<ScrollText size={40} />} title="Nenhum registro" description="As ações realizadas no sistema serão registradas aqui." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>Usuário</th>
                  <th>Empresa</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap">{dateTime(l.createdAt)}</td>
                    <td><span className="font-mono text-xs text-slate-700">{l.action}</span></td>
                    <td>
                      <span className="text-slate-700">{l.entity}</span>
                      {l.entityId && <span className="ml-1 font-mono text-[11px] text-slate-400">{String(l.entityId).slice(0, 8)}</span>}
                    </td>
                    <td>{l.user?.name ?? l.actorRole ?? '—'}</td>
                    <td>{l.company?.clientName ?? '—'}</td>
                    <td className="font-mono text-xs text-slate-500">{l.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onChange={setPage} />
      </Card>
    </div>
  );
}
