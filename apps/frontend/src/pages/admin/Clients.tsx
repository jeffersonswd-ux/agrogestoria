import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Search, Pencil, Ban, CheckCircle2, KeyRound, Trash2, LayoutGrid, Copy } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { date, STATUS_LABEL } from '../../lib/format';

const EMPTY_FORM = {
  clientName: '', companyName: '', legalName: '', document: '', email: '', whatsapp: '', phone: '',
  city: '', state: '', address: '', notes: '', adminName: '', adminEmail: '', adminPassword: '',
  requirePasswordChange: true, simpleMode: false, userLimit: '', aiMonthlyLimit: '', evolutionServerId: '',
  modules: [] as string[],
};

export default function AdminClients() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [moduleModal, setModuleModal] = useState<any>(null);
  const [moduleSelection, setModuleSelection] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients', page, search, status],
    queryFn: async () => (await api.get('/admin/companies', { params: { page, pageSize: 20, search: search || undefined, status: status || undefined } })).data,
  });

  const { data: servers } = useQuery({
    queryKey: ['admin-servers'],
    queryFn: async () => (await api.get('/admin/integrations')).data as any[],
  });

  const { data: moduleCatalog } = useQuery({
    queryKey: ['admin-module-catalog'],
    queryFn: async () => (await api.get('/admin/modules')).data ?? [],
    retry: false,
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setError('');
    setModalOpen(true);
  };

  const openEdit = async (row: any) => {
    try {
      const { data: full } = await api.get(`/admin/companies/${row.id}`);
      setEditing(row);
      setForm({
        clientName: full.clientName ?? '', companyName: full.companyName ?? '', legalName: full.legalName ?? '',
        document: full.document ?? '', email: full.email ?? '', whatsapp: full.whatsapp ?? '', phone: full.phone ?? '',
        city: full.city ?? '', state: full.state ?? '', address: full.address ?? '', notes: full.notes ?? '',
        adminName: full.users?.find((u: any) => u.role === 'ADMIN_CLIENTE')?.name ?? '',
        adminEmail: full.users?.find((u: any) => u.role === 'ADMIN_CLIENTE')?.email ?? '',
        adminPassword: '', requirePasswordChange: true, simpleMode: full.simpleMode ?? false,
        userLimit: full.userLimit ?? '', aiMonthlyLimit: full.aiMonthlyLimit ?? '',
        evolutionServerId: full.evolutionServerId ?? '', modules: [],
      });
      setError('');
      setModalOpen(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const save = async () => {
    setError('');
    if (!form.clientName.trim() || !form.companyName.trim()) {
      setError('Informe o nome do cliente e o nome da empresa');
      return;
    }
    if (!editing && (!form.adminName.trim() || !form.adminEmail.trim())) {
      setError('Informe o nome e o e-mail do administrador de acesso');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.userLimit) payload.userLimit = null;
      if (!payload.aiMonthlyLimit) payload.aiMonthlyLimit = null;
      if (!payload.evolutionServerId) payload.evolutionServerId = null;
      if (!payload.adminPassword) delete payload.adminPassword;
      if (editing) {
        await api.patch(`/admin/companies/${editing.id}`, payload);
        setModalOpen(false);
        qc.invalidateQueries({ queryKey: ['admin-clients'] } as any);
      } else {
        const { data } = await api.post('/admin/companies', payload);
        setCredentials(data.credentials);
        setModalOpen(false);
        qc.invalidateQueries({ queryKey: ['admin-clients'] } as any);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row: any) => {
    const action = row.status === 'ATIVO' ? 'block' : 'unblock';
    const reason = action === 'block' ? window.prompt('Motivo do bloqueio (opcional):') ?? undefined : undefined;
    try {
      await api.post(`/admin/companies/${row.id}/${action}`, { reason });
      qc.invalidateQueries({ queryKey: ['admin-clients'] } as any);
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  const resetPassword = async (row: any) => {
    try {
      const { data } = await api.post(`/admin/companies/${row.id}/reset-password`, {});
      setCredentials({ ...data, email: data.email ?? row.adminUser?.email });
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  const openModules = async (row: any) => {
    try {
      const { data } = await api.get(`/admin/companies/${row.id}/modules`);
      setModuleSelection(data.modules.filter((m: any) => m.enabled).map((m: any) => m.key));
      setModuleModal(row);
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  const saveModules = async () => {
    try {
      await api.put(`/admin/companies/${moduleModal.id}/modules`, { modules: moduleSelection });
      setModuleModal(null);
      qc.invalidateQueries({ queryKey: ['admin-clients'] } as any);
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  const removeClient = async () => {
    try {
      await api.delete(`/admin/companies/${deleteModal.id}`, { data: { confirmation: deleteConfirm } });
      setDeleteModal(null);
      setDeleteConfirm('');
      qc.invalidateQueries({ queryKey: ['admin-clients'] } as any);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Clientes / Empresas"
        description="Cadastre e gerencie os clientes da plataforma"
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo Cliente
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar por nome, empresa, documento..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Building2 size={40} />}
            title="Nenhum cliente cadastrado"
            description="Clique em “Novo Cliente” para cadastrar o primeiro cliente da plataforma."
            action={<Button onClick={openCreate}><Plus size={16} /> Novo Cliente</Button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Empresa</th>
                  <th>WhatsApp</th>
                  <th>Fazendas</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium text-slate-700">{c.clientName}</td>
                    <td>{c.companyName}</td>
                    <td>{c.whatsapp || '—'}</td>
                    <td>{c.farmsCount}</td>
                    <td>
                      <Badge tone={c.status === 'ATIVO' ? 'green' : 'red'}>{STATUS_LABEL[c.status]}</Badge>
                    </td>
                    <td>{date(c.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Editar" onClick={() => openEdit(c)}><Pencil size={15} /></button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Módulos" onClick={() => openModules(c)}><LayoutGrid size={15} /></button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Redefinir senha" onClick={() => resetPassword(c)}><KeyRound size={15} /></button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600" title={c.status === 'ATIVO' ? 'Bloquear' : 'Desbloquear'} onClick={() => toggleStatus(c)}>
                          {c.status === 'ATIVO' ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Excluir" onClick={() => setDeleteModal(c)}><Trash2 size={15} /></button>
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

      {/* Formulário */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={editing ? `Editar ${editing.clientName}` : 'Novo Cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={saving} onClick={save}>Salvar</Button>
          </>
        }
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="space-y-5">
          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Dados do cliente</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nome do cliente / produtor *" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              <Input label="Nome da empresa *" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              <Input label="Razão social" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
              <Input label="CPF / CNPJ" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
              <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
              <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <Input label="Estado" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} />
              <Input label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="mt-4">
              <label className="label">Observações</label>
              <textarea className="input min-h-[70px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </section>

          <section className="border-t border-slate-100 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Dados de acesso</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nome do administrador *" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
              <Input label="E-mail de login *" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
              <Input label={editing ? 'Nova senha (deixe vazio para manter)' : 'Senha inicial'} type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder={editing ? '' : 'Mín. 8 caracteres'} />
              <Select label="Servidor Evolution API" value={form.evolutionServerId} onChange={(e) => setForm({ ...form, evolutionServerId: e.target.value })}>
                <option value="">Não vinculado</option>
                {(servers ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Input label="Limite de usuários" type="number" value={form.userLimit} onChange={(e) => setForm({ ...form, userLimit: e.target.value })} />
              <Input label="Limite mensal de consultas IA" type="number" value={form.aiMonthlyLimit} onChange={(e) => setForm({ ...form, aiMonthlyLimit: e.target.value })} />
            </div>
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.requirePasswordChange} onChange={(e) => setForm({ ...form, requirePasswordChange: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-500" />
                Exigir alteração de senha no primeiro acesso
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.simpleMode} onChange={(e) => setForm({ ...form, simpleMode: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-500" />
                Modo simplificado (pequenos produtores)
              </label>
            </div>
          </section>
        </div>
      </Modal>

      {/* Módulos */}
      <Modal
        open={!!moduleModal}
        onClose={() => setModuleModal(null)}
        size="lg"
        title={`Módulos liberados — ${moduleModal?.clientName ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModuleModal(null)}>Cancelar</Button>
            <Button onClick={saveModules}>Salvar permissões</Button>
          </>
        }
      >
        <div className="mb-4 flex gap-2">
          <Button variant="secondary" onClick={() => setModuleSelection((moduleCatalog ?? []).map((m: any) => m.key))}>Selecionar todos</Button>
          <Button variant="secondary" onClick={() => setModuleSelection([])}>Desmarcar todos</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(moduleCatalog ?? []).map((m: any) => (
            <label key={m.key} className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={moduleSelection.includes(m.key)}
                onChange={(e) =>
                  setModuleSelection((prev) => (e.target.checked ? [...prev, m.key] : prev.filter((k) => k !== m.key)))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-500"
              />
              <span>
                <span className="block font-medium text-slate-700">{m.label}</span>
                <span className="block text-xs text-slate-500">{m.description}</span>
              </span>
            </label>
          ))}
        </div>
      </Modal>

      {/* Credenciais geradas */}
      <Modal open={!!credentials} onClose={() => setCredentials(null)} title="Credenciais de acesso">
        <p className="mb-4 text-sm text-slate-600">
          Anote estas credenciais agora — a senha não será exibida novamente.
        </p>
        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">E-mail</p>
              <p className="font-medium text-slate-800">{credentials?.email}</p>
            </div>
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(credentials?.email ?? '')}><Copy size={14} /></Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Senha</p>
              <p className="font-mono text-sm font-semibold text-slate-800">{credentials?.password}</p>
            </div>
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(credentials?.password ?? '')}><Copy size={14} /></Button>
          </div>
        </div>
      </Modal>

      {/* Exclusão */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Excluir cliente"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={removeClient}>Excluir definitivamente</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Todos os dados de <strong>{deleteModal?.clientName}</strong> (fazendas, safras, financeiro, usuários) serão removidos.
          A auditoria é preservada. Para manter o histórico, prefira bloquear o cliente.
        </p>
        <Input label='Digite "EXCLUIR" para confirmar' value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
      </Modal>
    </div>
  );
}
