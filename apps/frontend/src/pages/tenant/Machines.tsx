import CrudPage from '../../components/CrudPage';
import { useOptions } from '../../lib/options';
import { number, date } from '../../lib/format';

export default function Machines() {
  const { farms } = useOptions();

  return (
    <CrudPage
      title="Máquinas e Implementos"
      description="Frota agrícola, horímetros, quilometragem e status"
      endpoint="/machines"
      createLabel="Nova Máquina"
      emptyTitle="Nenhuma máquina cadastrada"
      emptyDescription="Cadastre tratores, colheitadeiras, implementos e demais equipamentos."
      queryKey="tenant-machines"
      fields={[
        { name: 'name', label: 'Nome *', required: true },
        { name: 'type', label: 'Tipo *', required: true, placeholder: 'Trator, Colheitadeira, Pulverizador...' },
        { name: 'code', label: 'Código / patrimônio' },
        { name: 'brand', label: 'Marca' },
        { name: 'model', label: 'Modelo' },
        { name: 'year', label: 'Ano', type: 'number' },
        { name: 'plate', label: 'Placa' },
        { name: 'farmId', label: 'Fazenda', type: 'select', options: farms.map((f: any) => ({ value: f.id, label: f.name })) },
        { name: 'hoursMeter', label: 'Horímetro (h)', type: 'number', step: '0.1' },
        { name: 'mileage', label: 'Quilometragem (km)', type: 'number', step: '0.1' },
        { name: 'fuelType', label: 'Combustível' },
        { name: 'status', label: 'Status', type: 'select', options: [
          { value: 'ATIVO', label: 'Ativo' },
          { value: 'MANUTENCAO', label: 'Em manutenção' },
          { value: 'INATIVO', label: 'Inativo' },
        ] },
        { name: 'acquisitionDate', label: 'Data de aquisição', type: 'date' },
        { name: 'acquisitionValue', label: 'Valor de aquisição (R$)', type: 'number', step: '0.01' },
        { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
      ]}
      columns={[
        { key: 'name', label: 'Máquina', render: (r: any) => <span className="font-medium text-slate-700">{r.name}</span> },
        { key: 'type', label: 'Tipo' },
        { key: 'code', label: 'Código', render: (r: any) => r.code || '—' },
        { key: 'hoursMeter', label: 'Horímetro', render: (r: any) => `${number(r.hoursMeter)} h` },
        { key: 'mileage', label: 'Km', render: (r: any) => number(r.mileage) },
        { key: 'status', label: 'Status' },
        { key: 'acquisitionDate', label: 'Aquisição', render: (r: any) => date(r.acquisitionDate) },
      ]}
    />
  );
}
