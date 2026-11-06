import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tractor, Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { number, date, STATUS_LABEL } from '../../lib/format';
import { useOptions, OPERATION_TYPES, OPERATION_STATUS } from '../../lib/options';

const EMPTY = {
  farmId: '', seasonId: '', plotId: '', type: 'PREPARO_SOLO', description: '', plannedDate: '', doneDate: '',
  status: 'PLANEJADA', employeeId: '', machineId: '', areaHa: '', hours: '', fuelLiters: '', cost: '', notes: '',
};

export default function Operations() {
  const { farms, seasons, plots, machines, employees } = useOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-operations', page, search, farmFilter, statusFilter],
    queryFn: async () =>
      (await api.get('/operations', {
        params: { page, pageSize: 20, search: search || undefined, farmId: farmFilter || undefined, status: statusFilter || undefined },
      })).data,
  });

  const open = (row?: any) => {
    setForm(row ? { ...EMPTY, ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ''])) } : { ...EMPTY, farmId: farmFilter || farms[0]?.id || '' });
    setEditing(row ?? null);
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!form.farmId) { setError('Selecione a fazenda'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['areaHa', 'hours', 'fuelLiters', 'cost'].forEach((k) => { if (payload[k] === '') payload[k] = null; });
      if (editing) await api.patch(`/operations/${editing.id}`, payload);
      else await api.post('/operations', payload);
      setModalOpen(false);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Operações de Campo" description="Preparo, plantio, adubação, irrigação e demais atividades" actions={<Button onClick={() => open()}><Plus size={16} /> Nova Operação</Button>} />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-56" value={farmFilter} onChange={(e) => { setFarmFilter(e.target.value); setPage(1); }}>
            <option value="">Todas as fazendas</option>
            {farms.map((f: any) => (<option key={f.id} value={f.id}>{f.name}</option>))}
          </Select>
          <Select className="w-44" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            {OPERATION_STATUS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Tractor size={40} />} title="Nenhuma operação registrada" description="Registre as atividades realizadas no campo para acompanhar custos e produtividade." action={<Button onClick={() => open()}><Plus size={16} /> Nova Operação</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Fazenda / Safra</th>
                  <th>Data</th>
                  <th>Área (ha)</th>
                  <th>Horas</th>
                  <th>Custo</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o: any) => (
                  <tr key={o.id}>
                    <td className="font-medium text-slate-700">{OPERATION_TYPES.find((t) => t.value === o.type)?.label ?? o.type}</td>
                    <td>{o.description || '—'}</td>
                    <td>{o.season?.crop?.culture ?? '—'}</td>
                    <td>{date(o.doneDate || o.plannedDate)}</td>
                    <td>{number(o.areaHa)}</td>
                    <td>{number(o.hours)}</td>
                    <td>{number(o.cost)}</td>
                    <td><Badge tone={o.status === 'CONCLUIDA' ? 'green' : o.status === 'ATRASADA' ? 'red' : 'amber'}>{STATUS_LABEL[o.status]}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" className="px-2 py-1" onClick={() => open(o)}>Editar</Button>
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
        title={editing ? 'Editar Operação' : 'Nova Operação'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Fazenda *" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value, plotId: '' })}>
            <option value="">Selecione...</option>
            {farms.map((f: any) => (<option key={f.id} value={f.id}>{f.name}</option>))}
          </Select>
          <Select label="Safra" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}>
            <option value="">Nenhuma</option>
            {seasons.map((s: any) => (<option key={s.id} value={s.id}>{s.name} — {s.crop?.culture}</option>))}
          </Select>
          <Select label="Talhão" value={form.plotId} onChange={(e) => setForm({ ...form, plotId: e.target.value })}>
            <option value="">Todos</option>
            {plots.filter((p: any) => !form.farmId || p.farmId === form.farmId).map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </Select>
          <Select label="Tipo de operação *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {OPERATION_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </Select>
          <Input label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {OPERATION_STATUS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </Select>
          <Input label="Data prevista" type="date" value={form.plannedDate?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
          <Input label="Data realizada" type="date" value={form.doneDate?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, doneDate: e.target.value })} />
          <Select label="Funcionário" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">Nenhum</option>
            {employees.map((e: any) => (<option key={e.id} value={e.id}>{e.name}</option>))}
          </Select>
          <Select label="Máquina" value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })}>
            <option value="">Nenhuma</option>
            {machines.map((m: any) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </Select>
          <Input label="Área trabalhada (ha)" type="number" step="0.01" value={form.areaHa} onChange={(e) => setForm({ ...form, areaHa: e.target.value })} />
          <Input label="Horas" type="number" step="0.1" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          <Input label="Combustível (L)" type="number" step="0.1" value={form.fuelLiters} onChange={(e) => setForm({ ...form, fuelLiters: e.target.value })} />
          <Input label="Custo (R$)" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
