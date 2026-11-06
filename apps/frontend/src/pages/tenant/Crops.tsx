import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sprout, Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { number, date } from '../../lib/format';
import { useOptions, CULTURES } from '../../lib/options';

const CROP_EMPTY = { farmId: '', plotId: '', culture: 'Soja', variety: '', areaHa: '', cycle: '', notes: '' };
const SEASON_EMPTY = {
  cropId: '', name: '', plantingDatePlan: '', plantingDateDone: '', harvestDatePlan: '', harvestDateDone: '',
  estimatedProduction: '', unit: 'sc', plannedCost: '', estimatedRevenue: '', status: 'PLANEJADA', notes: '',
};

export default function Crops() {
  const { farms, plots, crops, seasons } = useOptions();
  const [tab, setTab] = useState<'culturas' | 'safras'>('culturas');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [modal, setModal] = useState<null | 'crop' | 'season'>(null);
  const [form, setForm] = useState<any>(CROP_EMPTY);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const endpoint = tab === 'culturas' ? '/crops' : '/seasons';
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-crops', tab, page, search, farmFilter],
    queryFn: async () =>
      (await api.get(endpoint, {
        params: { page, pageSize: 20, search: search || undefined, farmId: farmFilter || undefined },
      })).data,
  });

  const openCrop = (row?: any) => {
    setForm(row ? { ...CROP_EMPTY, ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ''])) } : { ...CROP_EMPTY, farmId: farmFilter || farms[0]?.id || '' });
    setEditing(row ?? null);
    setError('');
    setModal('crop');
  };

  const openSeason = (row?: any) => {
    setForm(row ? { ...SEASON_EMPTY, ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ''])) } : { ...SEASON_EMPTY, cropId: crops[0]?.id || '' });
    setEditing(row ?? null);
    setError('');
    setModal('season');
  };

  const save = async () => {
    setError('');
    if (!form.name?.trim() && modal === 'season') { setError('Informe o nome da safra'); return; }
    if (!form.culture && modal === 'crop') { setError('Informe a cultura'); return; }
    if (modal === 'crop' && !form.farmId) { setError('Selecione a fazenda'); return; }
    if (modal === 'season' && !form.cropId) { setError('Selecione a cultura'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['areaHa', 'estimatedProduction', 'plannedCost', 'estimatedRevenue'].forEach((k) => {
        if (payload[k] === '' || payload[k] === undefined) payload[k] = null;
      });
      const url = modal === 'crop' ? '/crops' : '/seasons';
      if (editing) await api.patch(`${url}/${editing.id}`, payload);
      else await api.post(url, payload);
      setModal(null);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Culturas e Safras"
        description="Planejamento de plantio, variedades, produção e produtividade"
        actions={
          <Button onClick={() => (tab === 'culturas' ? openCrop() : openSeason())}>
            <Plus size={16} /> {tab === 'culturas' ? 'Nova Cultura' : 'Nova Safra'}
          </Button>
        }
      />

      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
        {([['culturas', 'Culturas'], ['safras', 'Safras']] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setPage(1); }} className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-white text-green-700 shadow-sm' : 'text-slate-600'}`}>
            {l}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-56" value={farmFilter} onChange={(e) => { setFarmFilter(e.target.value); setPage(1); }}>
            <option value="">Todas as fazendas</option>
            {farms.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Sprout size={40} />} title={tab === 'culturas' ? 'Nenhuma cultura cadastrada' : 'Nenhuma safra cadastrada'} description="Cadastre as culturas das suas propriedades e planeje as safras." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              {tab === 'culturas' ? (
                <>
                  <thead>
                    <tr>
                      <th>Cultura</th>
                      <th>Variedade</th>
                      <th>Fazenda</th>
                      <th>Talhão</th>
                      <th>Área (ha)</th>
                      <th>Safras</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c: any) => (
                      <tr key={c.id}>
                        <td className="font-medium text-slate-700">{c.culture}</td>
                        <td>{c.variety || '—'}</td>
                        <td>{c.farm?.name ?? '—'}</td>
                        <td>{c.plot?.name ?? '—'}</td>
                        <td>{number(c.areaHa)}</td>
                        <td>{c._count?.seasons ?? 0}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" className="px-2 py-1" onClick={() => openCrop(c)}>Editar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr>
                      <th>Safra</th>
                      <th>Cultura</th>
                      <th>Fazenda</th>
                      <th>Plantio</th>
                      <th>Colheita</th>
                      <th>Produção</th>
                      <th>Produtividade</th>
                      <th>Status</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s: any) => (
                      <tr key={s.id}>
                        <td className="font-medium text-slate-700">{s.name}</td>
                        <td>{s.crop?.culture ?? '—'}</td>
                        <td>{s.farm?.name ?? '—'}</td>
                        <td>{date(s.plantingDateDone || s.plantingDatePlan)}</td>
                        <td>{date(s.harvestDateDone || s.harvestDatePlan)}</td>
                        <td>{number(s.harvestedProduction ?? s.estimatedProduction)} {s.unit}</td>
                        <td>{number(s.actualYield ?? s.estimatedYield)}</td>
                        <td><Badge tone={s.status === 'COLHIDA' ? 'green' : s.status === 'PLANEJADA' ? 'slate' : 'amber'}>{s.status}</Badge></td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" className="px-2 py-1" onClick={() => openSeason(s)}>Editar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onChange={setPage} />
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        size="lg"
        title={modal === 'crop' ? (editing ? 'Editar Cultura' : 'Nova Cultura') : editing ? 'Editar Safra' : 'Nova Safra'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        {modal === 'crop' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Fazenda *" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value, plotId: '' })}>
              <option value="">Selecione...</option>
              {farms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
            <Select label="Talhão" value={form.plotId} onChange={(e) => setForm({ ...form, plotId: e.target.value })}>
              <option value="">Todos os talhões</option>
              {plots.filter((p: any) => !form.farmId || p.farmId === form.farmId).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Select label="Cultura *" value={form.culture} onChange={(e) => setForm({ ...form, culture: e.target.value })}>
              {CULTURES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Input label="Variedade" value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })} />
            <Input label="Área (ha)" type="number" step="0.01" value={form.areaHa} onChange={(e) => setForm({ ...form, areaHa: e.target.value })} />
            <Input label="Ciclo" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} placeholder="Ex.: 120 dias" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Cultura *" value={form.cropId} onChange={(e) => setForm({ ...form, cropId: e.target.value })}>
              <option value="">Selecione...</option>
              {crops.map((c: any) => (
                <option key={c.id} value={c.id}>{c.culture} — {c.farm?.name}</option>
              ))}
            </Select>
            <Input label="Nome da safra *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Safra 2025/2026" />
            <Input label="Plantio previsto" type="date" value={form.plantingDatePlan?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, plantingDatePlan: e.target.value })} />
            <Input label="Plantio realizado" type="date" value={form.plantingDateDone?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, plantingDateDone: e.target.value })} />
            <Input label="Colheita prevista" type="date" value={form.harvestDatePlan?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, harvestDatePlan: e.target.value })} />
            <Input label="Colheita realizada" type="date" value={form.harvestDateDone?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, harvestDateDone: e.target.value })} />
            <Input label="Produção estimada" type="number" step="0.01" value={form.estimatedProduction} onChange={(e) => setForm({ ...form, estimatedProduction: e.target.value })} />
            <Input label="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="sc, t, kg" />
            <Input label="Custo planejado (R$)" type="number" step="0.01" value={form.plannedCost} onChange={(e) => setForm({ ...form, plannedCost: e.target.value })} />
            <Input label="Receita estimada (R$)" type="number" step="0.01" value={form.estimatedRevenue} onChange={(e) => setForm({ ...form, estimatedRevenue: e.target.value })} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['PLANEJADA', 'EM_ANDAMENTO', 'COLHIDA', 'CANCELADA'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        )}
      </Modal>
    </div>
  );
}
