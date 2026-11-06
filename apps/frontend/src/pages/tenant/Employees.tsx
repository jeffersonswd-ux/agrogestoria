import CrudPage from '../../components/CrudPage';
import { useOptions } from '../../lib/options';
import { date, currency } from '../../lib/format';

export default function Employees() {
  const { farms } = useOptions();

  return (
    <CrudPage
      title="Funcionários"
      description="Equipe, funções e vínculo com as fazendas"
      endpoint="/employees"
      createLabel="Novo Funcionário"
      emptyTitle="Nenhum funcionário cadastrado"
      emptyDescription="Cadastre a equipe para vincular operações, apontamentos de horas e custos de mão de obra."
      queryKey="tenant-employees"
      fields={[
        { name: 'name', label: 'Nome *', required: true },
        { name: 'role', label: 'Função *', required: true, placeholder: 'Operador de máquinas, Agrônomo...' },
        { name: 'document', label: 'CPF' },
        { name: 'phone', label: 'Telefone' },
        { name: 'email', label: 'E-mail', type: 'email' },
        { name: 'farmId', label: 'Fazenda', type: 'select', options: farms.map((f: any) => ({ value: f.id, label: f.name })) },
        { name: 'salary', label: 'Salário (R$)', type: 'number', step: '0.01' },
        { name: 'dailyRate', label: 'Diária (R$)', type: 'number', step: '0.01' },
        { name: 'hireDate', label: 'Data de admissão', type: 'date' },
        { name: 'active', label: 'Ativo', type: 'checkbox' },
        { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
      ]}
      columns={[
        { key: 'name', label: 'Nome', render: (r: any) => <span className="font-medium text-slate-700">{r.name}</span> },
        { key: 'role', label: 'Função' },
        { key: 'phone', label: 'Telefone', render: (r: any) => r.phone || '—' },
        { key: 'salary', label: 'Salário', render: (r: any) => (r.salary ? currency(r.salary) : '—') },
        { key: 'hireDate', label: 'Admissão', render: (r: any) => date(r.hireDate) },
        { key: 'active', label: 'Status', render: (r: any) => (r.active ? 'Ativo' : 'Inativo') },
      ]}
    />
  );
}
