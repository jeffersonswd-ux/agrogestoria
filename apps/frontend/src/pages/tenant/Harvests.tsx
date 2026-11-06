import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wheat, Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { number, date } from '../../lib/format';
import { useOptions } from '../../lib/options';

const EMPTY = { seasonId: '', harvestDate: '', areaHarvested: '', quantity: '', unit: 'sc', moisture: '', quality: '', losses: '', notes: '' };

export default function Harvests() {
  const { seasons, farms } = useOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-harvests', page, search, farmFilter],
    queryFn: async () =>
      (await api.get('/harvests', { params: { page, pageSize: 20, search: search || undefined, farmId: farmFilter || undefined } })).data,
  });

  const save = async () => {
    setError('');
    if (!form.seasonId) { setError('Selecione a safra'); return; }
    if (!form.quantity) { setError('Informe a quantidade colhida'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['areaHarvested', 'quantity', 'moisture', 'losses'].forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post('/harvests', payload);
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
      <PageHeader title="Colheitas e Produção" description="Registro de colheitas, produtividade e perdas" actions={<Button onClick={() => { setForm(EMPTY); setError(''); setModalOpen(true); }}><Plus size={16} /> Nova Colheita</Button>} />

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
          <EmptyState icon={<Wheat size={40} />} title="Nenhuma colheita registrada" description="Registre as colheitas para calcular a produtividade de cada safra." action={<Button onClick={() => { setForm(EMPTY); setModalOpen(true); }}><Plus size={16} /> Nova Colheita</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Safra</th>
                  <th>Cultura</th>
                  <th>Área (ha)</th>
                  <th>Quantidade</th>
                  <th>Produtividade</th>
                  <th>Perdas</th>
                  <th>Qualidade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h: any) => (
                  <tr key={h.id}>
                    <td>{date(h.harvestDate)}</td>
                    <td className="font-medium text-slate-700">{h.season?.name}</td>
                    <td>{h.season?.crop?.culture}</td>
                    <td>{number(h.areaHarvested)}</td>
                    <td>{number(h.quantity)} {h.unit}</td>
                    <td>{h.areaHarvested > 0 ? number(h.quantity / h.areaHarvested) : '—'}</td>
                    <td>{h.losses != null ? number(h.losses) : '—'}</td>
                    <td>{h.quality || '—'}</td>
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
        title="Nova Colheita"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Safra *" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}>
            <option value="">Selecione...</option>
            {seasons.map((s: any) => (<option key={s.id} value={s.id}>{s.name} — {s.crop?.culture} ({s.farm?.name})</option>))}
          </Select>
          <Input label="Data da colheita *" type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} />
          <Input label="Área colhida (ha)" type="number" step="0.01" value={form.areaHarvested} onChange={(e) => setForm({ ...form, areaHarvested: e.target.value })} />
          <Input label="Quantidade *" type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input label="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <Input label="Umidade (%)" type="number" step="0.1" value={form.moisture} onChange={(e) => setForm({ ...form, moisture: e.target.value })} />
          <Input label="Perdas" type="number" step="0.01" value={form.losses} onChange={(e) => setForm({ ...form, losses: e.target.value })} />
          <Input label="Qualidade" value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })} placeholder="Boa / Regular / Ruim" />
        </div>
      </Modal>
    </div>
  );
}
