import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import AppShell from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingBlock } from './components/ui';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminClients = lazy(() => import('./pages/admin/Clients'));
const AdminFarms = lazy(() => import('./pages/admin/Farms'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminModules = lazy(() => import('./pages/admin/Modules'));
const AdminIntegrations = lazy(() => import('./pages/admin/Integrations'));
const AdminAiUsage = lazy(() => import('./pages/admin/AiUsage'));
const AdminLogs = lazy(() => import('./pages/admin/Logs'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const Properties = lazy(() => import('./pages/tenant/Properties'));
const Crops = lazy(() => import('./pages/tenant/Crops'));
const Planning = lazy(() => import('./pages/tenant/Planning'));
const Operations = lazy(() => import('./pages/tenant/Operations'));
const Applications = lazy(() => import('./pages/tenant/Applications'));
const Harvests = lazy(() => import('./pages/tenant/Harvests'));
const Machines = lazy(() => import('./pages/tenant/Machines'));
const Fuel = lazy(() => import('./pages/tenant/Fuel'));
const Inventory = lazy(() => import('./pages/tenant/Inventory'));
const Purchases = lazy(() => import('./pages/tenant/Purchases'));
const Sales = lazy(() => import('./pages/tenant/Sales'));
const Financial = lazy(() => import('./pages/tenant/Financial'));
const Employees = lazy(() => import('./pages/tenant/Employees'));
const Maintenance = lazy(() => import('./pages/tenant/Maintenance'));
const Weather = lazy(() => import('./pages/tenant/Weather'));
const Maps = lazy(() => import('./pages/tenant/Maps'));
const Journal = lazy(() => import('./pages/tenant/Journal'));
const Whatsapp = lazy(() => import('./pages/tenant/Whatsapp'));
const Assistant = lazy(() => import('./pages/tenant/Assistant'));
const Reports = lazy(() => import('./pages/tenant/Reports'));
const TenantUsers = lazy(() => import('./pages/tenant/Users'));
const Settings = lazy(() => import('./pages/tenant/Settings'));

function Protected({ children, admin }: { children: JSX.Element; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><LoadingBlock /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user.role !== 'SUPER_ADMIN') return <Navigate to="/app" replace />;
  if (!admin && user.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <ErrorBoundary label="a página">
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingBlock /></div>}>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/app" replace />} />

        <Route path="/admin" element={<Protected admin><AdminDashboard /></Protected>} />
        <Route path="/admin/clientes" element={<Protected admin><AdminClients /></Protected>} />
        <Route path="/admin/fazendas" element={<Protected admin><AdminFarms /></Protected>} />
        <Route path="/admin/usuarios" element={<Protected admin><AdminUsers /></Protected>} />
        <Route path="/admin/modulos" element={<Protected admin><AdminModules /></Protected>} />
        <Route path="/admin/integracoes" element={<Protected admin><AdminIntegrations /></Protected>} />
        <Route path="/admin/ia" element={<Protected admin><AdminAiUsage /></Protected>} />
        <Route path="/admin/logs" element={<Protected admin><AdminLogs /></Protected>} />
        <Route path="/admin/configuracoes" element={<Protected admin><AdminSettings /></Protected>} />

        <Route path="/app" element={<Protected><Dashboard /></Protected>} />
        <Route path="/app/propriedades" element={<Protected><Properties /></Protected>} />
        <Route path="/app/culturas" element={<Protected><Crops /></Protected>} />
        <Route path="/app/planejamento" element={<Protected><Planning /></Protected>} />
        <Route path="/app/operacoes" element={<Protected><Operations /></Protected>} />
        <Route path="/app/aplicacoes" element={<Protected><Applications /></Protected>} />
        <Route path="/app/colheitas" element={<Protected><Harvests /></Protected>} />
        <Route path="/app/maquinas" element={<Protected><Machines /></Protected>} />
        <Route path="/app/combustiveis" element={<Protected><Fuel /></Protected>} />
        <Route path="/app/estoque" element={<Protected><Inventory /></Protected>} />
        <Route path="/app/compras" element={<Protected><Purchases /></Protected>} />
        <Route path="/app/vendas" element={<Protected><Sales /></Protected>} />
        <Route path="/app/financeiro" element={<Protected><Financial /></Protected>} />
        <Route path="/app/funcionarios" element={<Protected><Employees /></Protected>} />
        <Route path="/app/manutencoes" element={<Protected><Maintenance /></Protected>} />
        <Route path="/app/clima" element={<Protected><Weather /></Protected>} />
        <Route path="/app/mapas" element={<Protected><Maps /></Protected>} />
        <Route path="/app/diario" element={<Protected><Journal /></Protected>} />
        <Route path="/app/whatsapp" element={<Protected><Whatsapp /></Protected>} />
        <Route path="/app/assistente" element={<Protected><Assistant /></Protected>} />
        <Route path="/app/relatorios" element={<Protected><Reports /></Protected>} />
        <Route path="/app/usuarios" element={<Protected><TenantUsers /></Protected>} />
        <Route path="/app/configuracoes" element={<Protected><Settings /></Protected>} />

        <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
