import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plug, Plus, Pencil, Trash2, Zap, PlugZap } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Select } from '../../components/ui';

export default function AdminIntegrations() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', baseUrl: '', apiKey: '', status: 'ATIVO', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-integrations'],
    queryFn: async () => (await api.get('/admin/integrations')).data as any[],
  });

  const openCreate = () => {
    setForm({ name: '', baseUrl: '', apiKey: '', status: 'ATIVO', notes: '' });
    setEditing(null);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setForm({ name: row.name, baseUrl: row.baseUrl, apiKey: '', status: row.status, notes: row.notes ?? '' });
    setEditing(row);
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!form.name.trim() || !form.baseUrl.trim()) { setError('Informe nome e URL'); return; }
    if (!editing && !form.apiKey.trim()) { setError('Informe a API Key'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.apiKey) delete payload.apiKey;
      if (editing) await api.patch(`/admin/integrations/${editing.id}`, payload);
      else await api.post('/admin/integrations', payload);
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-integrations'] } as any);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const test = async (row: any) => {
    setTesting(row.id);
    setTestResult(null);
    try {
      const { data } = await api.post(`/admin/integrations/${row.id}/test`, {});
      setTestResult({ id: row.id, ...data });
    } catch (err) {
      setTestResult({ id: row.id, ok: false, message: apiErrorMessage(err) });
    } finally {
      setTesting(null);
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Excluir o servidor "${row.name}"?`)) return;
    try {
      await api.delete(`/admin/integrations/${row.id}`);
      qc.invalidateQueries({ queryKey: ['admin-integrations'] } as any);
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Integrações"
        description="Servidores Evolution API disponíveis para conexão do WhatsApp"
        actions={<Button onClick={openCreate}><Plus size={16} /> Novo Servidor</Button>}
      />

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<Plug size={40} />} title="Nenhum servidor cadastrado" description="Cadastre um servidor Evolution API para habilitar o WhatsApp dos clientes." action={<Button onClick={openCreate}><Plus size={16} /> Novo Servidor</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>URL</th>
                  <th>API Key</th>
                  <th>Clientes</th>
                  <th>Instâncias</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((s: any) => (
                  <tr key={s.id}>
                    <td className="font-medium text-slate-700">{s.name}</td>
                    <td className="text-xs text-slate-500">{s.baseUrl}</td>
                    <td className="font-mono text-xs text-slate-500">{s.apiKeyMasked || '—'}</td>
                    <td>{s.companiesCount}</td>
                    <td>{s.instancesCount} ({s.connectedInstances} conectadas)</td>
                    <td><Badge tone={s.status === 'ATIVO' ? 'green' : 'slate'}>{s.status}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Testar conexão" onClick={() => test(s)}>
                          {testing === s.id ? <PlugZap size={15} className="animate-pulse" /> : <Zap size={15} />}
                        </button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(s)}><Pencil size={15} /></button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(s)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {testResult && (
        <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${testResult.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {testResult.ok ? '✓ ' : '✕ '}{testResult.message}
          {testResult.instances != null && ` · ${testResult.instances} instância(s) no servidor`}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${editing.name}` : 'Novo Servidor Evolution API'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome do servidor *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="URL *" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://evolution.exemplo.com" />
          <Input label={editing ? 'Nova API Key (vazio = manter)' : 'API Key *'} type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </Select>
        </div>
        <div className="mt-4">
          <label className="label">Observações</label>
          <textarea className="input min-h-[70px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          A API Key é criptografada com AES-256-GCM antes de ser gravada e nunca é exibida novamente.
        </p>
      </Modal>
    </div>
  );
}
