import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPinned, Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { number, STATUS_LABEL } from '../../lib/format';
import { useOptions, SOIL_TYPES, IRRIGATION_TYPES } from '../../lib/options';

const FARM_EMPTY = {
  code: '', name: '', ownerName: '', municipality: '', state: '', address: '', latitude: '', longitude: '',
  totalAreaHa: '', agriculturalAreaHa: '', availableAreaHa: '', predominantProduction: '', notes: '',
};
const PLOT_EMPTY = { farmId: '', code: '', name: '', areaHa: '', soilType: 'OUTRO', irrigationType: 'NENHUMA', latitude: '', longitude: '', notes: '' };

export default function Properties() {
  const { farms } = useOptions();
  const [tab, setTab] = useState<'fazendas' | 'talhoes'>('fazendas');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [modal, setModal] = useState<null | 'farm' | 'plot'>(null);
  const [form, setForm] = useState<any>(FARM_EMPTY);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const endpoint = tab === 'fazendas' ? '/farms' : '/plots';
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-properties', tab, page, search, farmFilter],
    queryFn: async () =>
      (await api.get(endpoint, {
        params: { page, pageSize: 20, search: search || undefined, ...(tab === 'talhoes' && farmFilter ? { farmId: farmFilter } : {}) },
      })).data,
  });

  const openFarm = (row?: any) => {
    setForm(row ? { ...FARM_EMPTY, ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ''])) } : FARM_EMPTY);
    setEditing(row ?? null);
    setError('');
    setModal('farm');
  };

  const openPlot = (row?: any) => {
    setForm(row ? { ...PLOT_EMPTY, ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ''])) } : { ...PLOT_EMPTY, farmId: farmFilter || farms[0]?.id || '' });
    setEditing(row ?? null);
    setError('');
    setModal('plot');
  };

  const save = async () => {
    setError('');
    const isFarm = modal === 'farm';
    if (!form.name?.trim()) { setError('Informe o nome'); return; }
    if (!isFarm && !form.farmId) { setError('Selecione a fazenda'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['latitude', 'longitude', 'totalAreaHa', 'agriculturalAreaHa', 'availableAreaHa', 'areaHa'].forEach((k) => {
        if (payload[k] === '' || payload[k] === undefined) payload[k] = null;
      });
      const url = isFarm ? '/farms' : '/plots';
      if (editing) await api.patch(`${url}/${editing.id}`, payload);
      else await api.post(url, payload);
      setModal(null);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm('Confirmar a exclusão?')) return;
    try {
      await api.delete(`${endpoint}/${row.id}`);
      setModal(null);
    } catch (err) {
      window.alert((err as any)?.response?.data?.message || 'Falha ao excluir');
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Propriedades e Talhões"
        description="Cadastro das fazendas, talhões e georreferenciamento"
        actions={
          <Button onClick={() => (tab === 'fazendas' ? openFarm() : openPlot())}>
            <Plus size={16} /> {tab === 'fazendas' ? 'Nova Fazenda' : 'Novo Talhão'}
          </Button>
        }
      />

      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
        {(['fazendas', 'talhoes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${tab === t ? 'bg-white text-green-700 shadow-sm' : 'text-slate-600'}`}
          >
            {t === 'fazendas' ? 'Fazendas' : 'Talhões'}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          {tab === 'talhoes' && (
            <Select className="w-56" value={farmFilter} onChange={(e) => { setFarmFilter(e.target.value); setPage(1); }}>
              <option value="">Todas as fazendas</option>
              {farms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
          )}
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<MapPinned size={40} />}
            title={tab === 'fazendas' ? 'Nenhuma fazenda cadastrada' : 'Nenhum talhão cadastrado'}
            description={tab === 'fazendas' ? 'Cadastre sua primeira propriedade para começar o controle da operação.' : 'Cadastre talhões dentro das suas fazendas.'}
            action={<Button onClick={() => (tab === 'fazendas' ? openFarm() : openPlot())}><Plus size={16} /> Cadastrar</Button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              {tab === 'fazendas' ? (
                <>
                  <thead>
                    <tr>
                      <th>Fazenda</th>
                      <th>Município/UF</th>
                      <th>Área total</th>
                      <th>Área agrícola</th>
                      <th>Área disponível</th>
                      <th>Produção</th>
                      <th>Talhões</th>
                      <th>Status</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((f: any) => (
                      <tr key={f.id}>
                        <td className="font-medium text-slate-700">{f.name}</td>
                        <td>{[f.municipality, f.state].filter(Boolean).join(' / ') || '—'}</td>
                        <td>{number(f.totalAreaHa)} ha</td>
                        <td>{number(f.agriculturalAreaHa)} ha</td>
                        <td>{number(f.availableAreaHa)} ha</td>
                        <td>{f.predominantProduction || '—'}</td>
                        <td>{f._count?.plots ?? 0}</td>
                        <td><Badge tone={f.status === 'ATIVO' ? 'green' : 'red'}>{STATUS_LABEL[f.status]}</Badge></td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" className="px-2 py-1" onClick={() => openFarm(f)}>Editar</Button>
                            <Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => remove(f)}>Excluir</Button>
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
                      <th>Talhão</th>
                      <th>Fazenda</th>
                      <th>Área (ha)</th>
                      <th>Solo</th>
                      <th>Irrigação</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p: any) => (
                      <tr key={p.id}>
                        <td className="font-medium text-slate-700">{p.name}</td>
                        <td>{p.farm?.name ?? '—'}</td>
                        <td>{number(p.areaHa)}</td>
                        <td>{SOIL_TYPES.find((s) => s.value === p.soilType)?.label ?? p.soilType ?? '—'}</td>
                        <td>{IRRIGATION_TYPES.find((s) => s.value === p.irrigationType)?.label ?? p.irrigationType ?? '—'}</td>
                        <td>{p.latitude ?? '—'}</td>
                        <td>{p.longitude ?? '—'}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" className="px-2 py-1" onClick={() => openPlot(p)}>Editar</Button>
                            <Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => remove(p)}>Excluir</Button>
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
        title={modal === 'farm' ? (editing ? 'Editar Fazenda' : 'Nova Fazenda') : editing ? 'Editar Talhão' : 'Novo Talhão'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        {modal === 'farm' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome da fazenda *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Proprietário" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            <Input label="Município" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
            <Input label="Estado" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <Input label="Endereço / localização" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Latitude" type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            <Input label="Longitude" type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            <Input label="Área total (ha)" type="number" step="0.01" value={form.totalAreaHa} onChange={(e) => setForm({ ...form, totalAreaHa: e.target.value })} />
            <Input label="Área agrícola (ha)" type="number" step="0.01" value={form.agriculturalAreaHa} onChange={(e) => setForm({ ...form, agriculturalAreaHa: e.target.value })} />
            <Input label="Área disponível (ha)" type="number" step="0.01" value={form.availableAreaHa} onChange={(e) => setForm({ ...form, availableAreaHa: e.target.value })} />
            <Input label="Tipo de produção predominante" value={form.predominantProduction} onChange={(e) => setForm({ ...form, predominantProduction: e.target.value })} />
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea className="input min-h-[70px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Fazenda *" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
              <option value="">Selecione...</option>
              {farms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
            <Input label="Nome do talhão *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Área (ha) *" type="number" step="0.01" value={form.areaHa} onChange={(e) => setForm({ ...form, areaHa: e.target.value })} />
            <Select label="Tipo de solo" value={form.soilType} onChange={(e) => setForm({ ...form, soilType: e.target.value })}>
              {SOIL_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
            <Select label="Sistema de irrigação" value={form.irrigationType} onChange={(e) => setForm({ ...form, irrigationType: e.target.value })}>
              {IRRIGATION_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
            <Input label="Latitude" type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            <Input label="Longitude" type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
