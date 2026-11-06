import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SprayCan, Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { number, date, STATUS_LABEL } from '../../lib/format';
import { useOptions } from '../../lib/options';

const EMPTY = {
  farmId: '', seasonId: '', plotId: '', description: '', plannedDate: '', doneDate: '', status: 'PLANEJADA',
  employeeId: '', machineId: '', areaHa: '', hours: '', fuelLiters: '', cost: '',
  inputsText: '',
};

export default function Applications() {
  const { farms, seasons, plots, machines, employees, products } = useOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-applications', page, search, farmFilter],
    queryFn: async () =>
      (await api.get('/applications', { params: { page, pageSize: 20, search: search || undefined, farmId: farmFilter || undefined } })).data,
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
      const payload: any = { ...form, type: 'PULVERIZACAO' };
      ['areaHa', 'hours', 'fuelLiters', 'cost'].forEach((k) => { if (payload[k] === '') payload[k] = null; });
      // Insumos informados como "produto | quantidade | unidade | custo unitário" por linha
      const inputs = (form.inputsText || '')
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((line: string) => {
          const [description, qty, unit, cost] = line.split('|').map((s) => s.trim());
          return { description, quantity: Number(qty) || 0, unit: unit || 'kg', unitCost: Number(cost) || 0 };
        });
      if (inputs.length) payload.inputs = inputs;
      delete payload.inputsText;
      if (editing) await api.patch(`/applications/${editing.id}`, payload);
      else await api.post('/applications', payload);
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
      <PageHeader title="Aplicações Agrícolas" description="Pulverizações, produtos, doses e custos aplicados" actions={<Button onClick={() => open()}><Plus size={16} /> Nova Aplicação</Button>} />

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
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<SprayCan size={40} />} title="Nenhuma aplicação registrada" description="Registre as pulverizações realizadas para controlar produtos, doses e custos." action={<Button onClick={() => open()}><Plus size={16} /> Nova Aplicação</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Cultura</th>
                  <th>Área (ha)</th>
                  <th>Produtos</th>
                  <th>Custo</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o: any) => (
                  <tr key={o.id}>
                    <td>{date(o.doneDate || o.plannedDate)}</td>
                    <td className="font-medium text-slate-700">{o.description || '—'}</td>
                    <td>{o.season?.crop?.culture ?? '—'}</td>
                    <td>{number(o.areaHa)}</td>
                    <td className="text-xs">{o.inputs?.length ? o.inputs.map((i: any) => i.description).join(', ') : '—'}</td>
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
        title={editing ? 'Editar Aplicação' : 'Nova Aplicação'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Fazenda *" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
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
          <Input label="Descrição / produto comercial" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Data prevista" type="date" value={form.plannedDate?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
          <Input label="Data realizada" type="date" value={form.doneDate?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, doneDate: e.target.value })} />
          <Select label="Máquina" value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })}>
            <option value="">Nenhuma</option>
            {machines.map((m: any) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </Select>
          <Select label="Funcionário" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">Nenhum</option>
            {employees.map((e: any) => (<option key={e.id} value={e.id}>{e.name}</option>))}
          </Select>
          <Input label="Área aplicada (ha)" type="number" step="0.01" value={form.areaHa} onChange={(e) => setForm({ ...form, areaHa: e.target.value })} />
          <Input label="Custo (R$)" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <div className="sm:col-span-2">
            <label className="label">Insumos aplicados</label>
            <textarea
              className="input min-h-[90px] font-mono text-xs"
              placeholder={'Produto | quantidade | unidade | custo unitário\nEx.: Glifosato | 2 | L | 25.90'}
              value={form.inputsText}
              onChange={(e) => setForm({ ...form, inputsText: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">Um insumo por linha. Produtos em estoque: {products.map((p: any) => p.name).slice(0, 8).join(', ') || 'nenhum'}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
