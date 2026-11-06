import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Save, Search, CheckCircle2 } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, PageHeader, Select } from '../../components/ui';

export default function AdminModules() {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['admin-client-options'],
    queryFn: async () => (await api.get('/admin/companies', { params: { pageSize: 200 } })).data,
  });

  const { data: catalog } = useQuery({
    queryKey: ['admin-module-catalog'],
    queryFn: async () => (await api.get('/admin/modules')).data as any[],
  });

  const { data: current, isLoading } = useQuery({
    queryKey: ['admin-modules', companyId],
    queryFn: async () => (await api.get(`/admin/companies/${companyId}/modules`)).data,
    enabled: !!companyId,
  });

  const enabled = selection ?? (current?.modules ?? []).filter((m: any) => m.enabled).map((m: any) => m.key);

  const toggle = (key: string) =>
    setSelection((prev) => {
      const base = prev ?? (current?.modules ?? []).filter((m: any) => m.enabled).map((m: any) => m.key);
      return base.includes(key) ? base.filter((k) => k !== key) : [...base, key];
    });

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put(`/admin/companies/${companyId}/modules`, { modules: enabled });
      setSelection(null);
      qc.invalidateQueries({ queryKey: ['admin-modules', companyId] } as any);
      qc.invalidateQueries({ queryKey: ['admin-clients'] } as any);
      setMessage('Permissões salvas com sucesso.');
    } catch (err) {
      setMessage(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const filtered = (catalog ?? []).filter(
    (m: any) => !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.group.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="Módulos e Permissões" description="Controle quais funcionalidades cada cliente pode utilizar" />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-[260px]">
            <label className="label">Cliente / Empresa</label>
            <Select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setSelection(null); setMessage(''); }}>
              <option value="">Selecione um cliente...</option>
              {(clients?.data ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.clientName} — {c.companyName}</option>
              ))}
            </Select>
          </div>
          <div className="relative min-w-[200px] flex-1">
            <label className="label">Filtrar módulo</label>
            <Search size={15} className="absolute left-3 top-[34px] text-slate-400" />
            <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {!companyId ? (
          <EmptyState icon={<LayoutGrid size={40} />} title="Selecione um cliente" description="Escolha a empresa para definir quais módulos ela pode utilizar." />
        ) : isLoading ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Button variant="secondary" onClick={() => setSelection((catalog ?? []).map((m: any) => m.key))}>Selecionar todos</Button>
              <Button variant="secondary" onClick={() => setSelection([])}>Desmarcar todos</Button>
              <Button loading={saving} onClick={save} disabled={!companyId}><Save size={15} /> Salvar permissões</Button>
              {message && <span className="text-sm text-slate-600">{message}</span>}
            </div>

            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m: any) => {
                const on = enabled.includes(m.key);
                return (
                  <label key={m.key} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${on ? 'border-green-200 bg-green-50/60' : 'border-slate-200'}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(m.key)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-700">{m.label}</span>
                      <span className="block text-xs text-slate-500">{m.description}</span>
                      <span className="mt-1 inline-block"><Badge tone="slate">{m.group}</Badge></span>
                    </span>
                  </label>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <EmptyState icon={<CheckCircle2 size={40} />} title="Nenhum módulo encontrado" description="Ajuste o filtro de busca." />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
