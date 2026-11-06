import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HandCoins, Plus, Search, Wallet, TrendingUp, TrendingDown, Undo2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { currency, date } from '../../lib/format';
import { useOptions } from '../../lib/options';

const EMPTY = {
  type: 'PAGAR', farmId: '', category: '', description: '', amount: '', dueDate: '', seasonId: '',
  notes: '', installments: '1', intervalDays: '30',
};

export default function Financial() {
  const { farms, seasons } = useOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState<any>({ amount: '', paidDate: new Date().toISOString().slice(0, 10), notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-financial', page, search, type, status],
    queryFn: async () =>
      (await api.get('/financial/transactions', {
        params: { page, pageSize: 20, search: search || undefined, type: type || undefined, status: status || undefined },
      })).data,
  });

  const { data: cashFlow } = useQuery({
    queryKey: ['tenant-cashflow'],
    queryFn: async () => (await api.get('/financial/cash-flow')).data,
  });

  const save = async () => {
    setError('');
    if (!form.description.trim()) { setError('Informe a descrição'); return; }
    if (!form.amount) { setError('Informe o valor'); return; }
    if (!form.dueDate) { setError('Informe o vencimento'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['farmId', 'seasonId'].forEach((k) => { if (!payload[k]) payload[k] = null; });
      if (payload.installments === '1') delete payload.installments;
      await api.post('/financial/transactions', payload);
      setModalOpen(false);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const pay = async () => {
    setError('');
    setSaving(true);
    try {
      const payload: any = { ...payForm };
      if (!payload.amount) delete payload.amount;
      await api.post(`/financial/transactions/${payTarget.id}/pay`, payload);
      setPayTarget(null);
      setPayForm({ amount: '', paidDate: new Date().toISOString().slice(0, 10), notes: '' });
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao baixar');
    } finally {
      setSaving(false);
    }
  };

  const reverse = async (row: any) => {
    if (!window.confirm('Estornar a baixa deste título?')) return;
    try {
      await api.post(`/financial/transactions/${row.id}/reverse`, {});
    } catch (err) {
      window.alert((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao estornar');
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Financeiro" description="Contas a pagar, contas a receber e fluxo de caixa" actions={<Button onClick={() => { setForm(EMPTY); setError(''); setModalOpen(true); }}><Plus size={16} /> Novo Título</Button>} />

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700"><TrendingDown size={20} /></div>
          <div><p className="text-[12.5px] text-slate-500">Contas a pagar</p><p className="text-lg font-bold text-slate-800">{currency(data?.totals?.payable ?? 0)}</p></div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700"><TrendingUp size={20} /></div>
          <div><p className="text-[12.5px] text-slate-500">Contas a receber</p><p className="text-lg font-bold text-slate-800">{currency(data?.totals?.receivable ?? 0)}</p></div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Wallet size={20} /></div>
          <div><p className="text-[12.5px] text-slate-500">Realizado no período</p><p className="text-lg font-bold text-slate-800">{currency(data?.totals?.paid ?? 0)}</p></div>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-44" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">Pagar e receber</option>
            <option value="PAGAR">Contas a pagar</option>
            <option value="RECEBER">Contas a receber</option>
          </Select>
          <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="PAGO">Pago</option>
            <option value="VENCIDO">Vencido</option>
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<HandCoins size={40} />} title="Nenhum título financeiro" description="Lance contas a pagar e a receber para acompanhar o caixa da operação." action={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Novo Título</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Fazenda</th>
                  <th>Valor</th>
                  <th>Baixado</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t: any) => (
                  <tr key={t.id}>
                    <td>{date(t.dueDate)}</td>
                    <td className="font-medium text-slate-700">{t.description}</td>
                    <td>{t.category}</td>
                    <td>{t.farm?.name ?? '—'}</td>
                    <td>{currency(t.amount)}</td>
                    <td>{currency(t.paidAmount)}</td>
                    <td><Badge tone={t.status === 'PAGO' ? 'green' : t.status === 'VENCIDO' ? 'red' : t.status === 'PARCIAL' ? 'amber' : 'slate'}>{t.status}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {t.status !== 'PAGO' && (
                          <Button variant="ghost" className="px-2 py-1" onClick={() => { setPayTarget(t); setError(''); }}>Baixar</Button>
                        )}
                        {t.paidAmount > 0 && (
                          <Button variant="ghost" className="px-2 py-1" onClick={() => reverse(t)} title="Estornar baixa"><Undo2 size={14} /></Button>
                        )}
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

      {cashFlow?.months && (
        <Card className="mt-3">
          <div className="card-header"><h3 className="card-title">Fluxo de caixa — {cashFlow.year}</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
              <tbody>
                {cashFlow.months.map((m: any, i: number) => (
                  <tr key={i}>
                    <td>{m.month}</td>
                    <td className="text-green-700">{currency(m.income)}</td>
                    <td className="text-red-600">{currency(m.expense)}</td>
                    <td className={m.balance >= 0 ? 'font-medium text-green-700' : 'font-medium text-red-600'}>{currency(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title="Novo Título"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button loading={saving} onClick={save}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="PAGAR">Conta a pagar</option>
            <option value="RECEBER">Conta a receber</option>
          </Select>
          <Input label="Categoria *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Insumos,-combustível, mão de obra..." />
          <Input label="Descrição *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Valor (R$) *" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Vencimento *" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <Select label="Fazenda" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">Todas</option>
            {farms.map((f: any) => (<option key={f.id} value={f.id}>{f.name}</option>))}
          </Select>
          <Select label="Safra" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}>
            <option value="">Nenhuma</option>
            {seasons.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </Select>
          <Input label="Parcelas" type="number" min="1" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} />
          <Input label="Intervalo entre parcelas (dias)" type="number" min="1" value={form.intervalDays} onChange={(e) => setForm({ ...form, intervalDays: e.target.value })} />
          <div className="sm:col-span-2">
            <label className="label">Observações</label>
            <textarea className="input min-h-[70px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={`Baixar título — ${payTarget?.description ?? ''}`}
        footer={<><Button variant="secondary" onClick={() => setPayTarget(null)}>Cancelar</Button><Button loading={saving} onClick={pay}><CheckCircle2 size={15} /> Confirmar baixa</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Valor total: <strong>{currency(payTarget?.amount)}</strong> · Já baixado: <strong>{currency(payTarget?.paidAmount)}</strong>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Valor da baixa (vazio = saldo)" type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
          <Input label="Data do pagamento" type="date" value={payForm.paidDate} onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
