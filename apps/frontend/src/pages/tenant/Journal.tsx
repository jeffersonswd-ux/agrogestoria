import CrudPage from '../../components/CrudPage';
import { useOptions } from '../../lib/options';
import { date, currency } from '../../lib/format';

export default function Journal() {
  const { farms, plots, employees, machines } = useOptions();

  return (
    <CrudPage
      title="Diário de Campo"
      description="Registro diário das atividades realizadas no campo"
      endpoint="/journal"
      createLabel="Novo Registro"
      emptyTitle="Diário de campo vazio"
      emptyDescription="Registre as atividades do dia para manter o histórico da operação."
      queryKey="tenant-journal"
      fields={[
        { name: 'farmId', label: 'Fazenda *', type: 'select', required: true, options: farms.map((f: any) => ({ value: f.id, label: f.name })) },
        { name: 'plotId', label: 'Talhão', type: 'select', options: plots.map((p: any) => ({ value: p.id, label: p.name })) },
        { name: 'date', label: 'Data *', type: 'date', required: true },
        { name: 'activity', label: 'Atividade *', required: true },
        { name: 'employeeId', label: 'Funcionário', type: 'select', options: employees.map((e: any) => ({ value: e.id, label: e.name })) },
        { name: 'machineId', label: 'Máquina', type: 'select', options: machines.map((m: any) => ({ value: m.id, label: m.name })) },
        { name: 'inputs', label: 'Insumos utilizados' },
        { name: 'cost', label: 'Custo (R$)', type: 'number', step: '0.01' },
        { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
      ]}
      columns={[
        { key: 'date', label: 'Data', render: (r: any) => date(r.date) },
        { key: 'activity', label: 'Atividade', render: (r: any) => <span className="font-medium text-slate-700">{r.activity}</span> },
        { key: 'farmId', label: 'Fazenda', render: (r: any) => farms.find((f: any) => f.id === r.farmId)?.name ?? '—' },
        { key: 'inputs', label: 'Insumos', render: (r: any) => r.inputs || '—' },
        { key: 'cost', label: 'Custo', render: (r: any) => currency(r.cost) },
        { key: 'notes', label: 'Observações', render: (r: any) => r.notes || '—' },
      ]}
    />
  );
}
