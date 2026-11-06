import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HandCoins, Plus, Search, Building } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { currency, date } from '../../lib/format';
import { useOptions } from '../../lib/options';

const EMPTY_CUSTOMER = { name: '', document: '', phone: '', email: '', address: '' };
const EMPTY_SALE = { customerId: '', number: '', date: '', culture: '', status: 'CONFIRMADA', discount: '', notes: '', itemsText: '' };

export default function Sales() {
  const { customers, seasons } = useOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'vendas' | 'clientes'>('vendas');
  const [modal, setModal] = useState<null | 'sale' | 'customer'>(null);
  const [form, setForm] = useState<any>(EMPTY_SALE);
  const [customerForm, setCustomerForm] = useState<any>(EMPTY_CUSTOMER);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-sales', page, search, status, tab],
    queryFn: async () =>
      (await api.get(tab === 'vendas' ? '/sales' : '/customers', {
        params: { page, pageSize: 20, search: search || undefined, status: status || undefined },
      })).data,
  });

  const openSale = () => {
    setForm({ ...EMPTY_SALE, date: new Date().toISOString().slice(0, 10), customerId: customers[0]?.id ?? '' });
    setError('');
    setModal('sale');
  };

  const openCustomer = () => {
    setCustomerForm(EMPTY_CUSTOMER);
    setError('');
    setModal('customer');
  };

  const saveSale = async () => {
    setError('');
    const items = (form.itemsText || '')
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean)
      .map((line: string) => {
        const [description, qty, unit, price] = line.split('|').map((s) => s.trim());
        return { description, quantity: Number(qty) || 0, unit: unit || 'sc', unitPrice: Number(price) || 0 };
      });
    if (!items.length) { setError('Informe ao menos um item (um por linha)'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form, items };
      if (payload.discount === '') payload.discount = 0;
      delete payload.itemsText;
      await api.post('/sales', payload);
      setModal(null);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomer = async () => {
    setError('');
    if (!customerForm.name.trim()) { setError('Informe o nome do cliente'); return; }
    setSaving(true);
    try {
      await api.post('/customers', customerForm);
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
        title="Vendas e Contratos"
        description="Produtos agrícolas vendidos, contratos e entregas"
        actions={
          tab === 'vendas' ? (
            <Button onClick={openSale}><Plus size={16} /> Nova Venda</Button>
          ) : (
            <Button onClick={openCustomer}><Plus size={16} /> Novo Cliente</Button>
          )
        }
      />

      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
        {([['vendas', 'Vendas'], ['clientes', 'Clientes']] as const).map(([k, l]) => (
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
          {tab === 'vendas' && (
            <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Todos os status</option>
              <option value="ORCAMENTO">Orçamento</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="CANCELADA">Cancelada</option>
            </Select>
          )}
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={tab === 'vendas' ? <HandCoins size={40} /> : <Building size={40} />}
            title={tab === 'vendas' ? 'Nenhuma venda registrada' : 'Nenhum cliente cadastrado'}
            description={tab === 'vendas' ? 'Registre as vendas da safra para gerar as contas a receber.' : 'Cadastre os compradores da sua produção.'}
          />
        ) : tab === 'vendas' ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Data</th><th>Número</th><th>Cliente</th><th>Cultura</th><th>Itens</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((s: any) => (
                  <tr key={s.id}>
                    <td>{date(s.date)}</td>
                    <td>{s.number || '—'}</td>
                    <td className="font-medium text-slate-700">{s.customer?.name ?? '—'}</td>
                    <td>{s.culture || '—'}</td>
                    <td>{s.items?.length ?? 0}</td>
                    <td>{currency(s.total)}</td>
                    <td><Badge tone={s.status === 'ENTREGUE' ? 'green' : s.status === 'CANCELADA' ? 'red' : 'amber'}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Cliente</th><th>Documento</th><th>Telefone</th><th>E-mail</th></tr></thead>
              <tbody>
                {rows.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium text-slate-700">{c.name}</td>
                    <td>{c.document || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onChange={setPage} />
      </Card>

      <Modal
        open={modal === 'sale'}
        onClose={() => setModal(null)}
        size="lg"
        title="Nova Venda"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button loading={saving} onClick={saveSale}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Cliente" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            <option value="">Selecione...</option>
            {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </Select>
          <Input label="Número da venda" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          <Input label="Data *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Safra" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}>
            <option value="">Nenhuma</option>
            {seasons.map((s: any) => (<option key={s.id} value={s.id}>{s.name} — {s.crop?.culture}</option>))}
          </Select>
          <Input label="Cultura" value={form.culture} onChange={(e) => setForm({ ...form, culture: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ORCAMENTO">Orçamento</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="CANCELADA">Cancelada</option>
          </Select>
          <Input label="Desconto (R$)" type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          <div className="sm:col-span-2">
            <label className="label">Itens da venda *</label>
            <textarea
              className="input min-h-[100px] font-mono text-xs"
              placeholder={'Descrição | quantidade | unidade | preço unitário\nEx.: Soja AD08 | 500 | sc | 135.00'}
              value={form.itemsText}
              onChange={(e) => setForm({ ...form, itemsText: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === 'customer'}
        onClose={() => setModal(null)}
        title="Novo Cliente"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button loading={saving} onClick={saveCustomer}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome *" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
          <Input label="CNPJ / CPF" value={customerForm.document} onChange={(e) => setCustomerForm({ ...customerForm, document: e.target.value })} />
          <Input label="Telefone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
          <Input label="E-mail" type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
          <Input label="Endereço" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
