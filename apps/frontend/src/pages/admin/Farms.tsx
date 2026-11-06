import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPinned, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { number, STATUS_LABEL } from '../../lib/format';

const EMPTY = {
  companyId: '', code: '', name: '', ownerName: '', municipality: '', state: '', address: '',
  latitude: '', longitude: '', totalAreaHa: '', agriculturalAreaHa: '', availableAreaHa: '',
  predominantProduction: '', notes: '', status: 'ATIVO',
};

export default function AdminFarms() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['admin-client-options'],
    queryFn: async () => (await api.get('/admin/companies', { params: { pageSize: 200 } })).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-farms', page, search, companyId, status],
    queryFn: async () =>
      (await api.get('/admin/farms', {
        params: { page, pageSize: 20, search: search || undefined, companyId: companyId || undefined, status: status || undefined },
      })).data,
  });

  const openCreate = () => {
    setForm({ ...EMPTY, companyId: companyId || clients?.data?.[0]?.id || '' });
    setEditing(null);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setForm({
      companyId: row.companyId, code: row.code ?? '', name: row.name, ownerName: row.ownerName ?? '',
      municipality: row.municipality ?? '', state: row.state ?? '', address: row.address ?? '',
      latitude: row.latitude ?? '', longitude: row.longitude ?? '', totalAreaHa: row.totalAreaHa ?? '',
      agriculturalAreaHa: row.agriculturalAreaHa ?? '', availableAreaHa: row.availableAreaHa ?? '',
      predominantProduction: row.predominantProduction ?? '', notes: row.notes ?? '', status: row.status,
    });
    setEditing(row);
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!form.companyId) { setError('Selecione o cliente responsável'); return; }
    if (!form.name.trim()) { setError('Informe o nome da fazenda'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      ['latitude', 'longitude', 'totalAreaHa', 'agriculturalAreaHa', 'availableAreaHa'].forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });
      if (editing) await api.patch(`/admin/farms/${editing.id}`, payload);
      else await api.post('/admin/farms', payload);
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-farms'] } as any);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Excluir a fazenda "${row.name}"?`)) return;
    try {
      await api.delete(`/admin/farms/${row.id}`);
      qc.invalidateQueries({ queryKey: ['admin-farms'] } as any);
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Fazendas"
        description="Cadastre e gerencie as propriedades dos clientes"
        actions={<Button onClick={openCreate}><Plus size={16} /> Nova Fazenda</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar fazenda..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-56" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(1); }}>
            <option value="">Todos os clientes</option>
            {(clients?.data ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.clientName}</option>
            ))}
          </Select>
          <Select className="w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<MapPinned size={40} />} title="Nenhuma fazenda cadastrada" description="Cadastre a primeira fazenda vinculada a um cliente." action={<Button onClick={openCreate}><Plus size={16} /> Nova Fazenda</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fazenda</th>
                  <th>Cliente responsável</th>
                  <th>Cidade</th>
                  <th>Estado</th>
                  <th>Área total (ha)</th>
                  <th>Tipo de produção</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f: any) => (
                  <tr key={f.id}>
                    <td className="font-medium text-slate-700">{f.name}</td>
                    <td>{f.clientName}</td>
                    <td>{f.municipality || '—'}</td>
                    <td>{f.state || '—'}</td>
                    <td>{number(f.totalAreaHa)}</td>
                    <td>{f.predominantProduction || '—'}</td>
                    <td><Badge tone={f.status === 'ATIVO' ? 'green' : 'red'}>{STATUS_LABEL[f.status]}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(f)}><Pencil size={15} /></button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(f)}><Trash2 size={15} /></button>
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
        title={editing ? `Editar ${editing.name}` : 'Nova Fazenda'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Cliente / Empresa responsável *" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            <option value="">Selecione...</option>
            {(clients?.data ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.clientName} — {c.companyName}</option>
            ))}
          </Select>
          <Input label="Nome da fazenda *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Código da fazenda" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input label="Proprietário" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          <Input label="Município" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
          <Input label="Estado" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input label="Endereço / localização" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="Latitude" type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="-23.550520" />
          <Input label="Longitude" type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-46.633308" />
          <Input label="Área total (ha)" type="number" step="0.01" value={form.totalAreaHa} onChange={(e) => setForm({ ...form, totalAreaHa: e.target.value })} />
          <Input label="Área agrícola (ha)" type="number" step="0.01" value={form.agriculturalAreaHa} onChange={(e) => setForm({ ...form, agriculturalAreaHa: e.target.value })} />
          <Input label="Área disponível (ha)" type="number" step="0.01" value={form.availableAreaHa} onChange={(e) => setForm({ ...form, availableAreaHa: e.target.value })} />
          <Input label="Tipo de produção predominante" value={form.predominantProduction} onChange={(e) => setForm({ ...form, predominantProduction: e.target.value })} placeholder="Grãos" />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ATIVO">Ativo</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </Select>
        </div>
        <div className="mt-4">
          <label className="label">Observações</label>
          <textarea className="input min-h-[70px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
