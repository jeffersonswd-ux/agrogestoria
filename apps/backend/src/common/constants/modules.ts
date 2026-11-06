export interface ModuleDef {
  key: string;
  label: string;
  description: string;
  group: string;
  apiPrefixes: string[];
}

/**
 * Catálogo central de módulos do sistema.
 * O Super Admin liga/desliga cada módulo por empresa. A permissão é aplicada
 * no backend (ModuleGuard) e também usada pelo frontend para montar o menu.
 */
export const APP_MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Visão geral da operação', group: 'Geral', apiPrefixes: ['/dashboard'] },
  { key: 'properties', label: 'Propriedades e Talhões', description: 'Fazendas, talhões e georreferenciamento', group: 'Agricultura', apiPrefixes: ['/farms', '/plots'] },
  { key: 'crops', label: 'Culturas e Safras', description: 'Culturas, variedades e safras', group: 'Agricultura', apiPrefixes: ['/crops', '/seasons'] },
  { key: 'planning', label: 'Planejamento Agrícola', description: 'Planejamento de plantio e cronograma', group: 'Agricultura', apiPrefixes: ['/planning'] },
  { key: 'operations', label: 'Operações de Campo', description: 'Preparo, plantio, adubação, irrigação', group: 'Agricultura', apiPrefixes: ['/operations'] },
  { key: 'applications', label: 'Aplicações Agrícolas', description: 'Pulverizações e aplicações', group: 'Agricultura', apiPrefixes: ['/applications'] },
  { key: 'harvests', label: 'Colheitas e Produção', description: 'Registro de colheitas e produtividade', group: 'Agricultura', apiPrefixes: ['/harvests'] },
  { key: 'machines', label: 'Máquinas e Implementos', description: 'Frota agrícola', group: 'Operacional', apiPrefixes: ['/machines'] },
  { key: 'fuel', label: 'Combustíveis', description: 'Abastecimentos e consumo', group: 'Operacional', apiPrefixes: ['/fuel'] },
  { key: 'inventory', label: 'Estoque e Insumos', description: 'Produtos, entradas, saídas e lotes', group: 'Operacional', apiPrefixes: ['/inventory', '/products'] },
  { key: 'purchases', label: 'Compras', description: 'Fornecedores e pedidos de compra', group: 'Operacional', apiPrefixes: ['/purchases', '/suppliers'] },
  { key: 'sales', label: 'Vendas e Contratos', description: 'Vendas e clientes', group: 'Operacional', apiPrefixes: ['/sales', '/customers'] },
  { key: 'financial', label: 'Financeiro', description: 'Contas a pagar/receber e fluxo de caixa', group: 'Gestão', apiPrefixes: ['/financial'] },
  { key: 'employees', label: 'Funcionários', description: 'Equipe e apontamento de horas', group: 'Operacional', apiPrefixes: ['/employees', '/time-entries'] },
  { key: 'maintenance', label: 'Manutenções', description: 'Manutenção preventiva e corretiva', group: 'Operacional', apiPrefixes: ['/maintenance'] },
  { key: 'weather', label: 'Clima e Alertas', description: 'Dados meteorológicos reais', group: 'Recursos', apiPrefixes: ['/weather'] },
  { key: 'maps', label: 'Mapas Agrícolas', description: 'Mapas e delimitação de área', group: 'Recursos', apiPrefixes: ['/maps'] },
  { key: 'journal', label: 'Diário de Campo', description: 'Registros diários no campo', group: 'Recursos', apiPrefixes: ['/journal'] },
  { key: 'whatsapp', label: 'WhatsApp', description: 'Conexão WhatsApp via Evolution API', group: 'Integrações', apiPrefixes: ['/whatsapp'] },
  { key: 'ai', label: 'Assistente IA', description: 'Assistente inteligente agrícola', group: 'Integrações', apiPrefixes: ['/ai'] },
  { key: 'reports', label: 'Relatórios', description: 'Relatórios e exportações', group: 'Gestão', apiPrefixes: ['/reports'] },
  { key: 'users', label: 'Usuários', description: 'Gestão de usuários da empresa', group: 'Administração', apiPrefixes: ['/users'] },
  { key: 'settings', label: 'Configurações', description: 'Configurações da empresa', group: 'Administração', apiPrefixes: ['/settings'] },
];

export const MODULE_KEYS = APP_MODULES.map((m) => m.key);
export const DEFAULT_MODULES = MODULE_KEYS;

/** Módulos ocultos no modo simplificado (pequenos produtores). */
export const SIMPLE_MODE_MODULES = [
  'dashboard',
  'properties',
  'crops',
  'operations',
  'financial',
  'inventory',
  'weather',
  'journal',
  'ai',
  'settings',
];
