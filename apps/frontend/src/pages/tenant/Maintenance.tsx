import CrudPage from '../../components/CrudPage';
import { useOptions } from '../../lib/options';
import { currency, date } from '../../lib/format';

export default function Maintenance() {
  const { machines } = useOptions();

  return (
    <CrudPage
      title="Manutenções"
      description="Manutenção preventiva e corretiva, peças e próximas revisões"
      endpoint="/maintenance"
      createLabel="Nova Manutenção"
      emptyTitle="Nenhuma manutenção registrada"
      emptyDescription="Registre as manutenções para acompanhar custos e gerar alertas preventivos."
      queryKey="tenant-maintenance"
      fields={[
        { name: 'machineId', label: 'Máquina *', type: 'select', required: true, options: machines.map((m: any) => ({ value: m.id, label: m.name })) },
        { name: 'type', label: 'Tipo *', required: true, options: [
          { value: 'PREVENTIVA', label: 'Preventiva' },
          { value: 'CORRETIVA', label: 'Corretiva' },
          { value: 'PREDITIVA', label: 'Preditiva' },
        ] },
        { name: 'date', label: 'Data *', type: 'date', required: true },
        { name: 'description', label: 'Descrição' },
        { name: 'hoursMeter', label: 'Horímetro', type: 'number', step: '0.1' },
        { name: 'mileage', label: 'Quilometragem', type: 'number', step: '0.1' },
        { name: 'parts', label: 'Peças trocadas' },
        { name: 'cost', label: 'Custo (R$)', type: 'number', step: '0.01' },
        { name: 'nextServiceDate', label: 'Próxima manutenção (data)', type: 'date' },
        { name: 'nextServiceHours', label: 'Próxima manutenção (horímetro)', type: 'number', step: '0.1' },
        { name: 'status', label: 'Status', type: 'select', options: [
          { value: 'CONCLUIDA', label: 'Concluída' },
          { value: 'AGENDADA', label: 'Agendada' },
        ] },
        { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
      ]}
      columns={[
        { key: 'type', label: 'Tipo' },
        { key: 'machine', label: 'Máquina', render: (r: any) => r.machine?.name ?? '—' },
        { key: 'date', label: 'Data', render: (r: any) => date(r.date) },
        { key: 'description', label: 'Descrição', render: (r: any) => r.description || '—' },
        { key: 'parts', label: 'Peças', render: (r: any) => r.parts || '—' },
        { key: 'cost', label: 'Custo', render: (r: any) => currency(r.cost) },
        { key: 'nextServiceDate', label: 'Próxima', render: (r: any) => (r.nextServiceDate ? date(r.nextServiceDate) : '—') },
      ]}
    />
  );
}
