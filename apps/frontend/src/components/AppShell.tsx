import { ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MapPinned, Sprout, CalendarRange, Tractor, SprayCan, Wheat, Truck, Fuel,
  Package, ShoppingCart, HandCoins, Users, Wrench, CloudSun, Map, ClipboardList, MessageCircle,
  Bot, FileBarChart, UserCog, Settings, Bell, HelpCircle, LogOut, ChevronDown, Building2, Menu, X,
  LayoutGrid, FolderTree, ShieldCheck, Plug, Cpu, ScrollText,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';

interface MenuItem {
  to: string;
  label: string;
  icon: ReactNode;
  module: string;
}

const CLIENT_MENU: MenuItem[] = [
  { to: '/app', label: 'Dashboard', icon: <LayoutDashboard size={17} />, module: 'dashboard' },
  { to: '/app/propriedades', label: 'Propriedades e Talhões', icon: <MapPinned size={17} />, module: 'properties' },
  { to: '/app/culturas', label: 'Culturas e Safras', icon: <Sprout size={17} />, module: 'crops' },
  { to: '/app/planejamento', label: 'Planejamento Agrícola', icon: <CalendarRange size={17} />, module: 'planning' },
  { to: '/app/operacoes', label: 'Operações de Campo', icon: <Tractor size={17} />, module: 'operations' },
  { to: '/app/aplicacoes', label: 'Aplicações Agrícolas', icon: <SprayCan size={17} />, module: 'applications' },
  { to: '/app/colheitas', label: 'Colheitas e Produção', icon: <Wheat size={17} />, module: 'harvests' },
  { to: '/app/maquinas', label: 'Máquinas e Implementos', icon: <Truck size={17} />, module: 'machines' },
  { to: '/app/combustiveis', label: 'Combustíveis', icon: <Fuel size={17} />, module: 'fuel' },
  { to: '/app/estoque', label: 'Estoque e Insumos', icon: <Package size={17} />, module: 'inventory' },
  { to: '/app/compras', label: 'Compras', icon: <ShoppingCart size={17} />, module: 'purchases' },
  { to: '/app/vendas', label: 'Vendas e Contratos', icon: <HandCoins size={17} />, module: 'sales' },
  { to: '/app/financeiro', label: 'Financeiro', icon: <HandCoins size={17} />, module: 'financial' },
  { to: '/app/funcionarios', label: 'Funcionários', icon: <Users size={17} />, module: 'employees' },
  { to: '/app/manutencoes', label: 'Manutenções', icon: <Wrench size={17} />, module: 'maintenance' },
  { to: '/app/clima', label: 'Clima e Alertas', icon: <CloudSun size={17} />, module: 'weather' },
  { to: '/app/mapas', label: 'Mapas Agrícolas', icon: <Map size={17} />, module: 'maps' },
  { to: '/app/diario', label: 'Diário de Campo', icon: <ClipboardList size={17} />, module: 'journal' },
  { to: '/app/whatsapp', label: 'WhatsApp', icon: <MessageCircle size={17} />, module: 'whatsapp' },
  { to: '/app/assistente', label: 'Assistente IA', icon: <Bot size={17} />, module: 'ai' },
  { to: '/app/relatorios', label: 'Relatórios', icon: <FileBarChart size={17} />, module: 'reports' },
  { to: '/app/usuarios', label: 'Usuários', icon: <UserCog size={17} />, module: 'users' },
  { to: '/app/configuracoes', label: 'Configurações', icon: <Settings size={17} />, module: 'settings' },
];

const ADMIN_MENU: MenuItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={17} />, module: '*' },
  { to: '/admin/clientes', label: 'Clientes / Empresas', icon: <Building2 size={17} />, module: '*' },
  { to: '/admin/fazendas', label: 'Fazendas', icon: <MapPinned size={17} />, module: '*' },
  { to: '/admin/usuarios', label: 'Usuários', icon: <Users size={17} />, module: '*' },
  { to: '/admin/modulos', label: 'Módulos e Permissões', icon: <LayoutGrid size={17} />, module: '*' },
  { to: '/admin/integracoes', label: 'Integrações', icon: <Plug size={17} />, module: '*' },
  { to: '/admin/ia', label: 'Consumo de IA', icon: <Cpu size={17} />, module: '*' },
  { to: '/admin/logs', label: 'Logs e Auditoria', icon: <ScrollText size={17} />, module: '*' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: <Settings size={17} />, module: '*' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, hasModule, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const menu = (isSuperAdmin ? ADMIN_MENU : CLIENT_MENU).filter((m) => m.module === '*' || hasModule(m.module));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#f4f6f5]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#14331f] transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
            <Sprout size={20} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[17px] font-bold text-white">
              AgroGestor <span className="text-green-400">IA</span>
            </p>
            <p className="text-[10.5px] text-white/50">Gestão Agrícola Inteligente</p>
          </div>
          <button className="ml-auto text-white/60 lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app' || item.to === '/admin'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive || (item.to !== '/app' && location.pathname.startsWith(item.to)) ? 'sidebar-link-active' : ''}`}
            >
              {item.icon}
              <span className="flex-1 truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-2.5 py-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-white/50">
                {isSuperAdmin ? 'Super Admin' : user?.company?.companyName}
              </p>
            </div>
            <button onClick={handleLogout} title="Sair" className="text-white/50 hover:text-white">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
          <button className="text-slate-600 lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="relative">
            <select
              className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-slate-700 outline-none"
              value={location.pathname}
              onChange={(e) => navigate(e.target.value)}
            >
              <option value={isSuperAdmin ? '/admin' : '/app'}>Selecione a Propriedade</option>
              {menu.map((m) => (
                <option key={m.to} value={m.to}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Notificações">
              <Bell size={18} />
            </button>
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Ajuda">
              <HelpCircle size={18} />
            </button>
            <div className="ml-1 hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-700 text-[11px] font-bold text-white">
                {initials(user?.name)}
              </div>
              <div className="leading-tight">
                <p className="text-[12.5px] font-semibold text-slate-700">{user?.name}</p>
                <p className="text-[10.5px] text-slate-500">{isSuperAdmin ? 'Administrador' : user?.company?.clientName}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-5">{children}</main>
      </div>
    </div>
  );
}
