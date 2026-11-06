import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Plus, Search, PackageCheck, Building } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { currency, number, date } from '../../lib/format';
import { useOptions } from '../../lib/options';

const EMPTY_SUPPLIER = { name: '', document: '', phone: '', email: '', address: '', category: '' };
const EMPTY_PURCHASE = { supplierId: '', number: '', date: '', status: 'ABERTA', discount: '', freight: '', notes: '', itemsText: '' };

export default function Purchases() {
  const { suppliers, products } = useOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'compras' | 'fornecedores'>('compras');
  const [modal, setModal] = useState<null | 'purchase' | 'supplier'>(null);
  const [form, setForm] = useState<any>(EMPTY_PURCHASE);
  const [supplierForm, setSupplierForm] = useState<any>(EMPTY_SUPPLIER);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-purchases', page, search, status, tab],
    queryFn: async () =>
      (await api.get(tab === 'compras' ? '/purchases' : '/suppliers', {
        params: { page, pageSize: 20, search: search || undefined, status: status || undefined },
      })).data,
  });

  const openPurchase = () => {
    setForm({ ...EMPTY_PURCHASE, date: new Date().toISOString().slice(0, 10), supplierId: suppliers[0]?.id ?? '' });
    setError('');
    setModal('purchase');
  };

  const openSupplier = () => {
    setSupplierForm(EMPTY_SUPPLIER);
    setError('');
    setModal('supplier');
  };

  const savePurchase = async () => {
    setError('');
    if (!form.supplierId) { setError('Selecione o fornecedor'); return; }
    const items = (form.itemsText || '')
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean)
      .map((line: string) => {
        const [description, qty, unit, price] = line.split('|').map((s) => s.trim());
        return { description, quantity: Number(qty) || 0, unit: unit || 'un', unitPrice: Number(price) || 0 };
      });
    if (!items.length) { setError('Informe ao menos um item (um por linha)'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form, items };
      ['discount', 'freight'].forEach((k) => { if (payload[k] === '') payload[k] = 0; });
      delete payload.itemsText;
      await api.post('/purchases', payload);
      setModal(null);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const saveSupplier = async () => {
    setError('');
    if (!supplierForm.name.trim()) { setError('Informe o nome do fornecedor'); return; }
    setSaving(true);
    try {
      await api.post('/suppliers', supplierForm);
      setModal(null);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const receive = async (row: any) => {
    if (!window.confirm('Confirmar o recebimento? O estoque será movimentado e a conta a pagar será criada.')) return;
    try {
      await api.post(`/purchases/${row.id}/receive`, {});
    } catch (err) {
      window.alert((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao receber');
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Pedidos de compra, fornecedores e recebimento"
        actions={
          <>
            {tab === 'fornecedores' ? (
              <Button onClick={openSupplier}><Plus size={16} /> Novo Fornecedor</Button>
            ) : (
              <Button onClick={openPurchase}><Plus size={16} /> Novo Pedido</Button>
            )}
          </>
        }
      />

      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
        {([['compras', 'Compras'], ['fornecedores', 'Fornecedores']] as const).map(([k, l]) => (
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
          {tab === 'compras' && (
            <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Todos os status</option>
              <option value="ABERTA">Aberta</option>
              <option value="RECEBIDA">Recebida</option>
              <option value="CANCELADA">Cancelada</option>
            </Select>
          )}
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={tab === 'compras' ? <ShoppingCart size={40} /> : <Building size={40} />}
            title={tab === 'compras' ? 'Nenhum pedido de compra' : 'Nenhum fornecedor cadastrado'}
            description={tab === 'compras' ? 'Registre pedidos de compra para controlar entradas, custos e contas a pagar.' : 'Cadastre os fornecedores da sua operação.'}
          />
        ) : tab === 'compras' ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Número</th>
                  <th>Fornecedor</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p: any) => (
                  <tr key={p.id}>
                    <td>{date(p.date)}</td>
                    <td>{p.number || '—'}</td>
                    <td className="font-medium text-slate-700">{p.supplier?.name}</td>
                    <td>{p.items?.length ?? 0}</td>
                    <td>{currency(p.total)}</td>
                    <td><Badge tone={p.status === 'RECEBIDA' ? 'green' : p.status === 'CANCELADA' ? 'red' : 'amber'}>{p.status}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {p.status !== 'RECEBIDA' && (
                          <Button variant="ghost" className="px-2 py-1" onClick={() => receive(p)}>Receber</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Fornecedor</th><th>Documento</th><th>Telefone</th><th>E-mail</th><th>Compras</th></tr>
              </thead>
              <tbody>
                {rows.map((s: any) => (
                  <tr key={s.id}>
                    <td className="font-medium text-slate-700">{s.name}</td>
                    <td>{s.document || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td>{s.email || '—'}</td>
                    <td>{s._count?.purchases ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onChange={setPage} />
      </Card>

      <Modal
        open={modal === 'purchase'}
        onClose={() => setModal(null)}
        size="lg"
        title="Novo Pedido de Compra"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button loading={saving} onClick={savePurchase}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Fornecedor *" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            <option value="">Selecione...</option>
            {suppliers.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </Select>
          <Input label="Número do pedido" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          <Input label="Data *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ABERTA">Aberta</option>
            <option value="ORCAMENTO">Orçamento</option>
            <option value="CANCELADA">Cancelada</option>
          </Select>
          <Input label="Desconto (R$)" type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          <Input label="Frete (R$)" type="number" step="0.01" value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} />
          <div className="sm:col-span-2">
            <label className="label">Itens do pedido *</label>
            <textarea
              className="input min-h-[100px] font-mono text-xs"
              placeholder={'Descrição | quantidade | unidade | preço unitário\nEx.: Ureia 45% | 500 | kg | 3.20'}
              value={form.itemsText}
              onChange={(e) => setForm({ ...form, itemsText: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">Um item por linha. Produtos em estoque: {products.map((p: any) => p.name).slice(0, 8).join(', ') || 'nenhum'}</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === 'supplier'}
        onClose={() => setModal(null)}
        title="Novo Fornecedor"
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button loading={saving} onClick={saveSupplier}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome *" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
          <Input label="CNPJ / CPF" value={supplierForm.document} onChange={(e) => setSupplierForm({ ...supplierForm, document: e.target.value })} />
          <Input label="Telefone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
          <Input label="E-mail" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
          <Input label="Endereço" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
          <Input label="Categoria" value={supplierForm.category} onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
