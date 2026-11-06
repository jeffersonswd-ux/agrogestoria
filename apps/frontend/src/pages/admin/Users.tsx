import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Pencil, Trash2, KeyRound, Copy } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { date, number, ROLE_LABEL } from '../../lib/format';

const ROLES = [
  { value: 'ADMIN_CLIENTE', label: 'Administrador do Cliente' },
  { value: 'GERENTE_FAZENDA', label: 'Gerente de Fazenda' },
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'AGRONOMO', label: 'Agrônomo' },
];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ companyId: '', name: '', email: '', role: 'OPERADOR', phone: '', password: '', active: true, farmIds: [] as string[] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  const { data: clients } = useQuery({
    queryKey: ['admin-client-options'],
    queryFn: async () => (await api.get('/admin/companies', { params: { pageSize: 200 } })).data,
  });

  const { data: farms } = useQuery({
    queryKey: ['admin-farm-options', companyId],
    queryFn: async () => (await api.get('/admin/farms', { params: { pageSize: 200, companyId: companyId || undefined } })).data,
    enabled: !!companyId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, companyId],
    queryFn: async () =>
      (await api.get('/admin/users', { params: { page, pageSize: 20, search: search || undefined, companyId: companyId || undefined } })).data,
  });

  const openCreate = () => {
    setForm({ companyId: companyId || clients?.data?.[0]?.id || '', name: '', email: '', role: 'OPERADOR', phone: '', password: '', active: true, farmIds: [] });
    setEditing(null);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setForm({
      companyId: row.company?.id ?? '', name: row.name, email: row.email, role: row.role, phone: row.phone ?? '',
      password: '', active: row.active, farmIds: (row.farms ?? []).map((f: any) => f.id),
    });
    setEditing(row);
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!form.companyId) { setError('Selecione a empresa'); return; }
    if (!form.name.trim() || !form.email.trim()) { setError('Informe nome e e-mail'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      if (editing) {
        await api.patch(`/admin/users/${editing.id}`, payload);
        setModalOpen(false);
      } else {
        const { data } = await api.post('/admin/users', payload);
        setCredentials(data.credentials);
        setModalOpen(false);
      }
      qc.invalidateQueries({ queryKey: ['admin-users'] } as any);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (row: any) => {
    try {
      const { data } = await api.post(`/admin/users/${row.id}/reset-password`, {});
      setCredentials({ email: data.email, password: data.password });
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Desativar o usuário "${row.name}"?`)) return;
    try {
      await api.delete(`/admin/users/${row.id}`);
      qc.invalidateQueries({ queryKey: ['admin-users'] } as any);
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Usuários" description="Gerencie os usuários de todos os clientes" actions={<Button onClick={openCreate}><Plus size={16} /> Novo Usuário</Button>} />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar por nome ou e-mail..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-56" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(1); setForm((f: any) => ({ ...f, companyId: e.target.value, farmIds: [] })); }}>
            <option value="">Todas as empresas</option>
            {(clients?.data ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.clientName}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title="Nenhum usuário encontrado" description="Cadastre o administrador de acesso de um cliente." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Empresa</th>
                  <th>Fazendas</th>
                  <th>Status</th>
                  <th>Último acesso</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u: any) => (
                  <tr key={u.id}>
                    <td className="font-medium text-slate-700">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td>{u.company?.clientName ?? '—'}</td>
                    <td>{(u.farms ?? []).length}</td>
                    <td><Badge tone={u.active ? 'green' : 'slate'}>{u.active ? 'Ativo' : 'Inativo'}</Badge></td>
                    <td>{u.lastLoginAt ? date(u.lastLoginAt) : 'Nunca'}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(u)}><Pencil size={15} /></button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Redefinir senha" onClick={() => resetPassword(u)}><KeyRound size={15} /></button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(u)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onChange={setPage} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={editing ? `Editar ${editing.name}` : 'Novo Usuário'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Empresa *" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value, farmIds: [] })}>
            <option value="">Selecione...</option>
            {(clients?.data ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.clientName}</option>
            ))}
          </Select>
          <Input label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="E-mail *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Perfil *" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={editing ? 'Nova senha (vazio = manter)' : 'Senha inicial'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="mt-4">
          <label className="label">Fazendas autorizadas</label>
          <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {(farms?.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma fazenda cadastrada para esta empresa.</p>
            ) : (
              (farms?.data ?? []).map((f: any) => (
                <label key={f.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.farmIds.includes(f.id)}
                    onChange={(e) =>
                      setForm((prev: any) => ({
                        ...prev,
                        farmIds: e.target.checked ? [...prev.farmIds, f.id] : prev.farmIds.filter((x: string) => x !== f.id),
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-500"
                  />
                  {f.name} — {number(f.totalAreaHa)} ha
                </label>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal open={!!credentials} onClose={() => setCredentials(null)} title="Credenciais geradas">
        <p className="mb-4 text-sm text-slate-600">Anote estas credenciais — a senha não será exibida novamente.</p>
        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-slate-500">E-mail</p><p className="font-medium text-slate-800">{credentials?.email}</p></div>
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(credentials?.email ?? '')}><Copy size={14} /></Button>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-slate-500">Senha</p><p className="font-mono text-sm font-semibold text-slate-800">{credentials?.password}</p></div>
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(credentials?.password ?? '')}><Copy size={14} /></Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
