import { ReactNode, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';
import { Button, Card, EmptyState, Input, LoadingBlock, Modal, PageHeader, Pagination } from './ui';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'password' | 'checkbox' | 'hidden';
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
  placeholder?: string;
  colSpan?: number;
  defaultValue?: any;
}

export interface CrudPageProps {
  title: string;
  description?: string;
  endpoint: string;
  fields: FieldDef[];
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[];
  createLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  filters?: ReactNode;
  queryKey?: string;
  transformPayload?: (values: Record<string, any>) => Record<string, any>;
  onSubmitSuccess?: () => void;
  headerActions?: ReactNode;
  defaultFilters?: Record<string, any>;
}

export default function CrudPage({
  title,
  description,
  endpoint,
  fields,
  columns,
  createLabel = 'Novo registro',
  emptyTitle = 'Sem registros',
  emptyDescription,
  filters,
  queryKey,
  transformPayload,
  onSubmitSuccess,
  headerActions,
  defaultFilters = {},
}: CrudPageProps) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [extra, setExtra] = useState<Record<string, any>>(defaultFilters);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const params = useMemo(
    () => ({ page, pageSize: 20, search: search || undefined, ...extra }),
    [page, search, extra],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['crud', queryKey || endpoint, params],
    queryFn: async () => (await api.get(endpoint, { params })).data,
  });

  const openCreate = () => {
    const init: Record<string, any> = {};
    fields.forEach((f) => {
      init[f.name] = f.defaultValue ?? (f.type === 'checkbox' ? false : '');
    });
    setValues(init);
    setEditing(null);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    const init: Record<string, any> = {};
    fields.forEach((f) => {
      init[f.name] = row[f.name] ?? (f.type === 'checkbox' ? false : '');
    });
    setValues(init);
    setEditing(row);
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    setError('');
    for (const f of fields) {
      if (f.required && !String(values[f.name] ?? '').trim()) {
        setError(`Preencha o campo "${f.label}"`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = transformPayload ? transformPayload(values) : values;
      if (editing) {
        await api.patch(`${endpoint}/${editing.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['crud', queryKey || endpoint] } as any);
      qc.invalidateQueries({ queryKey: ['list', endpoint] } as any);
      onSubmitSuccess?.();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm('Confirmar a exclusão deste registro?')) return;
    try {
      await api.delete(`${endpoint}/${row.id}`);
      qc.invalidateQueries({ queryKey: ['crud', queryKey || endpoint] } as any);
      qc.invalidateQueries({ queryKey: ['list', endpoint] } as any);
    } catch (err) {
      window.alert(apiErrorMessage(err));
    }
  };

  const rows: any[] = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {headerActions}
            <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: ['crud', queryKey || endpoint] } as any)}>
              <RefreshCw size={15} /> Atualizar
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} /> {createLabel}
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {filters}
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th className="w-24 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>
                    ))}
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Editar" onClick={() => openEdit(row)}>
                          <Pencil size={15} />
                        </button>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Excluir" onClick={() => remove(row)}>
                          <Trash2 size={15} />
                        </button>
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
        title={editing ? `Editar ${title.toLowerCase()}` : createLabel}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={save}>
              Salvar
            </Button>
          </>
        }
      >
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          {fields
            .filter((f) => f.type !== 'hidden')
            .map((f) => (
              <div key={f.name} className={f.colSpan === 2 ? 'sm:col-span-2' : ''}>
                {f.type === 'select' ? (
                  <div>
                    <label className="label">{f.label}</label>
                    <select
                      className="input"
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : f.type === 'textarea' ? (
                  <div>
                    <label className="label">{f.label}</label>
                    <textarea
                      className="input min-h-[80px]"
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  </div>
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!values[f.name]}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-500"
                    />
                    {f.label}
                  </label>
                ) : (
                  <div>
                    <label className="label">{f.label}</label>
                    <input
                      className="input"
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'password' ? 'password' : f.type === 'email' ? 'email' : 'text'}
                      step={f.step}
                      placeholder={f.placeholder}
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
}
