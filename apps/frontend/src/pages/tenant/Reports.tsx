import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, CardHeader, EmptyState, LoadingBlock, PageHeader, Select } from '../../components/ui';
import { date } from '../../lib/format';

const REPORTS = [
  { key: 'financial', label: 'Financeiro', group: 'Financeiro' },
  { key: 'payables', label: 'Contas a pagar', group: 'Financeiro' },
  { key: 'receivables', label: 'Contas a receber', group: 'Financeiro' },
  { key: 'cashflow', label: 'Fluxo de caixa', group: 'Financeiro' },
  { key: 'cost-per-ha', label: 'Custos por hectare', group: 'Custos e produção' },
  { key: 'cost-per-culture', label: 'Custos por cultura', group: 'Custos e produção' },
  { key: 'cost-per-season', label: 'Custos por safra', group: 'Custos e produção' },
  { key: 'production', label: 'Produção', group: 'Custos e produção' },
  { key: 'harvests', label: 'Colheitas', group: 'Custos e produção' },
  { key: 'inventory', label: 'Estoque', group: 'Operação' },
  { key: 'purchases', label: 'Compras', group: 'Operação' },
  { key: 'sales', label: 'Vendas', group: 'Operação' },
  { key: 'machines', label: 'Máquinas', group: 'Operação' },
  { key: 'fuel', label: 'Combustíveis', group: 'Operação' },
  { key: 'maintenance', label: 'Manutenções', group: 'Operação' },
  { key: 'operations', label: 'Operações', group: 'Operação' },
  { key: 'applications', label: 'Aplicações', group: 'Operação' },
  { key: 'employees', label: 'Funcionários', group: 'Operação' },
  { key: 'season-comparison', label: 'Comparativo entre safras', group: 'Custos e produção' },
];

export default function Reports() {
  const [selected, setSelected] = useState('financial');
  const [format, setFormat] = useState('xlsx');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report-preview', selected, from, to],
    queryFn: async () =>
      (await api.get(`/reports/${selected}`, {
        params: { format: 'json', from: from || undefined, to: to || undefined },
        timeout: 30000,
      })).data,
  });

  const download = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${selected}`, {
        params: { format, from: from || undefined, to: to || undefined },
        responseType: 'blob',
      });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selected}.${format === 'xlsx' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert('Não foi possível gerar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  const groups = Array.from(new Set(REPORTS.map((r) => r.group)));
  const columns: any[] = data?.columns ?? [];
  const rows: any[] = data?.rows ?? [];

  return (
    <div>
      <PageHeader title="Relatórios" description="Dados reais da operação, exportáveis em PDF, Excel e CSV" />

      <div className="grid gap-3 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <div className="card-header"><FileBarChart size={17} className="text-green-700" /><h3 className="card-title flex-1">Relatórios</h3></div>
          <div className="p-3">
            {groups.map((g) => (
              <div key={g} className="mb-3">
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g}</p>
                <div className="space-y-0.5">
                  {REPORTS.filter((r) => r.group === g).map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setSelected(r.key)}
                      className={`w-full rounded-lg px-3 py-1.5 text-left text-[13px] transition ${
                        selected === r.key ? 'bg-green-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <label className="label">De</label>
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Até</label>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <label className="label">Formato</label>
              <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </Select>
            </div>
            <Button loading={loading} onClick={download}><Download size={15} /> Exportar</Button>
          </div>

          {isLoading ? (
            <LoadingBlock />
          ) : isError ? (
            <EmptyState
              icon={<FileBarChart size={40} />}
              title="Não foi possível carregar o relatório"
              description={(error as any)?.response?.data?.message ?? (error as Error)?.message ?? 'Tente novamente em instantes.'}
            />
          ) : rows.length === 0 ? (
            <EmptyState icon={<FileBarChart size={40} />} title="Sem dados no período" description="Este relatório utiliza os dados reais registrados no sistema. Cadastre registros para visualizá-lo." />
          ) : (
            <div className="table-wrap max-h-[560px] overflow-y-auto">
              <table className="table">
                <thead className="sticky top-0">
                  <tr>{columns.map((c: any) => (<th key={c.key}>{c.label}</th>))}</tr>
                </thead>
                <tbody>
                  {rows.map((r: any, i: number) => (
                    <tr key={i}>
                      {columns.map((c: any) => (
                        <td key={c.key}>{r[c.key] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
