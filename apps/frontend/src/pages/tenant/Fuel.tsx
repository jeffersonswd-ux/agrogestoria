import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Fuel as FuelIcon, Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { currency, number, date } from '../../lib/format';
import { useOptions } from '../../lib/options';

const EMPTY = { machineId: '', date: '', liters: '', unitPrice: '', totalCost: '', hoursMeter: '', mileage: '', station: '', notes: '' };

export default function Fuel() {
  const { machines } = useOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-fuel', page, search, machineFilter],
    queryFn: async () =>
      (await api.get('/fuel', { params: { page, pageSize: 20, search: search || undefined, machineId: machineFilter || undefined } })).data,
  });

  const save = async () => {
    setError('');
    if (!form.liters) { setError('Informe a quantidade de litros'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['unitPrice', 'totalCost', 'hoursMeter', 'mileage'].forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post('/fuel', payload);
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
      <PageHeader title="Combustíveis" description="Abastecimentos, consumo e custos por máquina" actions={<Button onClick={() => { setForm(EMPTY); setError(''); setModalOpen(true); }}><Plus size={16} /> Novo Abastecimento</Button>} />

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><FuelIcon size={20} /></div>
          <div><p className="text-[12.5px] text-slate-500">Litros abastecidos</p><p className="text-lg font-bold text-slate-800">{number(data?.totals?.liters ?? 0)} L</p></div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700"><FuelIcon size={20} /></div>
          <div><p className="text-[12.5px] text-slate-500">Custo total</p><p className="text-lg font-bold text-slate-800">{currency(data?.totals?.cost ?? 0)}</p></div>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-56" value={machineFilter} onChange={(e) => { setMachineFilter(e.target.value); setPage(1); }}>
            <option value="">Todas as máquinas</option>
            {machines.map((m: any) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<FuelIcon size={40} />} title="Nenhum abastecimento registrado" description="Registre os abastecimentos para acompanhar o consumo e o custo de combustível." action={<Button onClick={() => { setForm(EMPTY); setModalOpen(true); }}><Plus size={16} /> Novo Abastecimento</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Máquina</th>
                  <th>Litros</th>
                  <th>Preço/L</th>
                  <th>Total</th>
                  <th>Horímetro</th>
                  <th>Posto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f: any) => (
                  <tr key={f.id}>
                    <td>{date(f.date)}</td>
                    <td className="font-medium text-slate-700">{f.machine?.name ?? '—'}</td>
                    <td>{number(f.liters)}</td>
                    <td>{currency(f.unitPrice)}</td>
                    <td>{currency(f.totalCost)}</td>
                    <td>{f.hoursMeter != null ? number(f.hoursMeter) : '—'}</td>
                    <td>{f.station || '—'}</td>
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
        title="Novo Abastecimento"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Máquina" value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })}>
            <option value="">Nenhuma</option>
            {machines.map((m: any) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </Select>
          <Input label="Data *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Litros *" type="number" step="0.01" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} />
          <Input label="Preço por litro (R$)" type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          <Input label="Horímetro" type="number" step="0.1" value={form.hoursMeter} onChange={(e) => setForm({ ...form, hoursMeter: e.target.value })} />
          <Input label="Quilometragem" type="number" step="0.1" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
          <Input label="Posto" value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
