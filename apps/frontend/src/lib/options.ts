import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** Listas de apoio para selects: usadas em vários formulários. */
export function useOptions() {
  const farms = useQuery({
    queryKey: ['opt-farms'],
    queryFn: async () => ((await api.get('/farms', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });
  const seasons = useQuery({
    queryKey: ['opt-seasons'],
    queryFn: async () => ((await api.get('/seasons', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });
  const crops = useQuery({
    queryKey: ['opt-crops'],
    queryFn: async () => ((await api.get('/crops', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });
  const plots = useQuery({
    queryKey: ['opt-plots'],
    queryFn: async () => ((await api.get('/plots', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });
  const machines = useQuery({
    queryKey: ['opt-machines'],
    queryFn: async () => ((await api.get('/machines', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });
  const employees = useQuery({
    queryKey: ['opt-employees'],
    queryFn: async () => ((await api.get('/employees', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });
  const products = useQuery({
    queryKey: ['opt-products'],
    queryFn: async () => ((await api.get('/products', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });
  const suppliers = useQuery({
    queryKey: ['opt-suppliers'],
    queryFn: async () => ((await api.get('/suppliers', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });
  const customers = useQuery({
    queryKey: ['opt-customers'],
    queryFn: async () => ((await api.get('/customers', { params: { pageSize: 200 } })).data?.data ?? []) as any[],
  });

  return {
    farms: farms.data ?? [],
    seasons: seasons.data ?? [],
    crops: crops.data ?? [],
    plots: plots.data ?? [],
    machines: machines.data ?? [],
    employees: employees.data ?? [],
    products: products.data ?? [],
    suppliers: suppliers.data ?? [],
    customers: customers.data ?? [],
    isLoading:
      farms.isLoading || seasons.isLoading || crops.isLoading || plots.isLoading || machines.isLoading,
  };
}

export const CULTURES = [
  'Soja',
  'Milho',
  'Sorgo',
  'Cana-de-açúcar',
  'Hortifrúti',
  'Algodão',
  'Feijão',
  'Trigo',
  'Arroz',
  'Pastagem',
  'Outras',
];

export const OPERATION_TYPES = [
  { value: 'PREPARO_SOLO', label: 'Preparo do solo' },
  { value: 'PLANTIO', label: 'Plantio' },
  { value: 'ADUBACAO', label: 'Adubação' },
  { value: 'PULVERIZACAO', label: 'Pulverização' },
  { value: 'IRRIGACAO', label: 'Irrigação' },
  { value: 'ROCAGEM', label: 'Roçagem' },
  { value: 'COLHEITA', label: 'Colheita' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'OUTRO', label: 'Outro' },
];

export const OPERATION_STATUS = [
  { value: 'PLANEJADA', label: 'Planejada' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'CONCLUIDA', label: 'Concluída' },
  { value: 'ATRASADA', label: 'Atrasada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

export const SOIL_TYPES = [
  { value: 'ARGILOSO', label: 'Argiloso' },
  { value: 'ARENOSO', label: 'Arenoso' },
  { value: 'FRANCO', label: 'Franco' },
  { value: 'MISTO', label: 'Misto' },
  { value: 'LATOSSOLO', label: 'Latossolo' },
  { value: 'PODZOLICO', label: 'Podzólico' },
  { value: 'OUTRO', label: 'Outro' },
];

export const IRRIGATION_TYPES = [
  { value: 'NENHUMA', label: 'Nenhuma' },
  { value: 'GOTEJAMENTO', label: 'Gotejamento' },
  { value: 'ASPERSAO', label: 'Aspersão' },
  { value: 'PIVO_CENTRAL', label: 'Pivô central' },
  { value: 'SULCO', label: 'Sulco' },
  { value: 'OUTRO', label: 'Outro' },
];

export const PRODUCT_CATEGORIES = [
  'Sementes',
  'Fertilizantes',
  'Defensivos',
  'Corretivos',
  'Combustíveis',
  'Lubrificantes',
  'Peças',
  'Embalagens',
  'Outros',
];
