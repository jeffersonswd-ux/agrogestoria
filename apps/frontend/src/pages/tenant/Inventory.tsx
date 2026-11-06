import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Plus, Search, ArrowDownUp, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination, Select } from '../../components/ui';
import { currency, number, date } from '../../lib/format';
import { useOptions, PRODUCT_CATEGORIES } from '../../lib/options';

const EMPTY_PRODUCT = { name: '', category: 'Sementes', unit: 'kg', sku: '', quantity: '', minStock: '', unitCost: '', storageLocation: '', notes: '' };
const EMPTY_MOVE = { type: 'ENTRADA', quantity: '', unitCost: '', lot: '', expiresAt: '', notes: '' };

export default function Inventory() {
  const { farms, products } = useOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState('');
  const [modal, setModal] = useState<null | 'product' | 'move'>(null);
  const [form, setForm] = useState<any>(EMPTY_PRODUCT);
  const [moveForm, setMoveForm] = useState<any>(EMPTY_MOVE);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [movements, setMovements] = useState<any[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-products', page, search, category, lowStock],
    queryFn: async () =>
      (await api.get('/products', {
        params: { page, pageSize: 20, search: search || undefined, category: category || undefined, lowStock: lowStock || undefined },
      })).data,
  });

  const openProduct = (row?: any) => {
    setForm(row ? { ...EMPTY_PRODUCT, ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ''])) } : EMPTY_PRODUCT);
    setEditing(row ?? null);
    setError('');
    setModal('product');
  };

  const openMove = (product: any) => {
    setSelectedProduct(product);
    setMoveForm(EMPTY_MOVE);
    setError('');
    setModal('move');
  };

  const saveProduct = async () => {
    setError('');
    if (!form.name.trim()) { setError('Informe o nome do produto'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['quantity', 'minStock', 'unitCost'].forEach((k) => { if (payload[k] === '') payload[k] = null; });
      if (editing) await api.patch(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
      setModal(null);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const saveMove = async () => {
    setError('');
    if (!moveForm.quantity) { setError('Informe a quantidade'); return; }
    setSaving(true);
    try {
      const payload: any = { ...moveForm };
      ['unitCost'].forEach((k) => { if (payload[k] === '') payload[k] = null; });
      await api.post(`/inventory/${selectedProduct.id}/move`, payload);
      setModal(null);
    } catch (err) {
      setError((err as any)?.response?.data?.message?.join?.(' · ') || 'Falha ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  };

  const showMovements = async (product: any) => {
    try {
      const { data: res } = await api.get('/inventory/movements', { params: { productId: product.id, pageSize: 50 } });
      setMovements(res.data ?? []);
    } catch {
      setMovements([]);
    }
  };

  const rows = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Estoque e Insumos"
        description="Produtos, saldos, lotes, entradas, saídas e transferências"
        actions={<Button onClick={() => openProduct()}><Plus size={16} /> Novo Produto</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Pesquisar produto..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-48" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">Todas as categorias</option>
            {PRODUCT_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </Select>
          <Select className="w-44" value={lowStock} onChange={(e) => { setLowStock(e.target.value); setPage(1); }}>
            <option value="">Todo o estoque</option>
            <option value="true">Estoque baixo</option>
          </Select>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Package size={40} />} title="Nenhum produto cadastrado" description="Cadastre sementes, fertilizantes, defensivos e demais insumos." action={<Button onClick={() => openProduct()}><Plus size={16} /> Novo Produto</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Saldo</th>
                  <th>Estoque mín.</th>
                  <th>Custo unit.</th>
                  <th>Valor total</th>
                  <th>Local</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p: any) => {
                  const low = p.quantity <= p.minStock;
                  return (
                    <tr key={p.id}>
                      <td className="font-medium text-slate-700">{p.name}</td>
                      <td>{p.category}</td>
                      <td>
                        <span className={low ? 'font-semibold text-red-600' : ''}>{number(p.quantity)} {p.unit}</span>
                        {low && <AlertTriangle size={13} className="ml-1 inline text-amber-500" />}
                      </td>
                      <td>{number(p.minStock)}</td>
                      <td>{currency(p.unitCost)}</td>
                      <td>{currency(p.quantity * p.unitCost)}</td>
                      <td>{p.storageLocation || '—'}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="px-2 py-1" onClick={() => openMove(p)}>Movimentar</Button>
                          <Button variant="ghost" className="px-2 py-1" onClick={() => { openProduct(p); showMovements(p); }}>Histórico</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onChange={setPage} />
      </Card>

      <Modal
        open={modal === 'product'}
        onClose={() => setModal(null)}
        size="lg"
        title={editing ? 'Editar Produto' : 'Novo Produto'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button loading={saving} onClick={saveProduct}>Salvar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Categoria *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {PRODUCT_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </Select>
          <Input label="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, L, sc, un" />
          <Input label="Código / SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          {!editing && (
            <Input label="Saldo inicial" type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          )}
          <Input label="Estoque mínimo" type="number" step="0.01" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          <Input label="Custo unitário (R$)" type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          <Select label="Local de armazenamento" value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}>
            <option value="">Não informado</option>
            <option value="Armazém central">Armazém central</option>
            <option value="Talhão">Talhão</option>
            <option value="Fazenda">Fazenda</option>
          </Select>
          <Select label="Fazenda" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">Todas</option>
            {farms.map((f: any) => (<option key={f.id} value={f.id}>{f.name}</option>))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={modal === 'move'}
        onClose={() => setModal(null)}
        title={`Movimentar estoque — ${selectedProduct?.name ?? ''}`}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button loading={saving} onClick={saveMove}>Registrar</Button></>}
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Saldo atual: <strong>{number(selectedProduct?.quantity)} {selectedProduct?.unit}</strong>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo de movimentação *" value={moveForm.type} onChange={(e) => setMoveForm({ ...moveForm, type: e.target.value })}>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="TRANSFERENCIA">Transferência</option>
            <option value="AJUSTE">Ajuste</option>
          </Select>
          <Input label="Quantidade *" type="number" step="0.01" value={moveForm.quantity} onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })} />
          <Input label="Custo unitário (R$)" type="number" step="0.01" value={moveForm.unitCost} onChange={(e) => setMoveForm({ ...moveForm, unitCost: e.target.value })} />
          <Input label="Lote" value={moveForm.lot} onChange={(e) => setMoveForm({ ...moveForm, lot: e.target.value })} />
          <Input label="Validade" type="date" value={moveForm.expiresAt} onChange={(e) => setMoveForm({ ...moveForm, expiresAt: e.target.value })} />
          <Input label="Observações" value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal open={!!movements} onClose={() => setMovements(null)} size="lg" title="Histórico de movimentações">
        {(movements ?? []).length === 0 ? (
          <EmptyState icon={<ArrowDownUp size={36} />} title="Sem movimentações" description="Este produto ainda não possui movimentações de estoque." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Data</th><th>Tipo</th><th>Quantidade</th><th>Custo unit.</th><th>Lote</th><th>Observações</th></tr>
              </thead>
              <tbody>
                {(movements ?? []).map((m: any) => (
                  <tr key={m.id}>
                    <td>{date(m.createdAt)}</td>
                    <td><Badge tone={m.type === 'ENTRADA' ? 'green' : m.type === 'SAIDA' ? 'red' : 'slate'}>{m.type}</Badge></td>
                    <td>{number(m.quantity)} {m.product?.unit}</td>
                    <td>{currency(m.unitCost)}</td>
                    <td>{m.lot || '—'}</td>
                    <td>{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
