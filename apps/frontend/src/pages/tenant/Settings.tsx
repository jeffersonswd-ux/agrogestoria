import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, KeyRound } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { Button, Card, CardHeader, Input, LoadingBlock, PageHeader, Textarea } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { ROLE_LABEL } from '../../lib/format';

export default function TenantSettings() {
  const qc = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  const company = data?.company;

  const saveCompany = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await api.patch('/settings', {
        companyName: form.companyName,
        legalName: form.legalName,
        email: form.email,
        whatsapp: form.whatsapp,
        phone: form.phone,
        city: form.city,
        state: form.state,
        address: form.address,
      });
      setMessage('Dados da empresa atualizados.');
      qc.invalidateQueries({ queryKey: ['tenant-settings'] } as any);
      await refreshUser();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setError('');
    setMessage('');
    if (pw.newPassword.length < 8) { setError('A nova senha deve ter ao menos 8 caracteres'); return; }
    if (pw.newPassword !== pw.confirm) { setError('A confirmação não confere com a nova senha'); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setMessage('Senha alterada com sucesso.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingBlock />;

  const editable = form ?? {
    companyName: company?.companyName ?? '',
    legalName: company?.legalName ?? '',
    email: company?.email ?? '',
    whatsapp: company?.whatsapp ?? '',
    phone: company?.phone ?? '',
    city: company?.city ?? '',
    state: company?.state ?? '',
    address: company?.address ?? '',
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Dados da empresa, módulos liberados e sua conta" />

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dados da empresa" icon={<Settings size={17} className="text-green-700" />} />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Input label="Nome da empresa" value={editable.companyName} onChange={(e) => setForm({ ...editable, companyName: e.target.value })} />
            <Input label="Razão social" value={editable.legalName} onChange={(e) => setForm({ ...editable, legalName: e.target.value })} />
            <Input label="E-mail" type="email" value={editable.email} onChange={(e) => setForm({ ...editable, email: e.target.value })} />
            <Input label="WhatsApp" value={editable.whatsapp} onChange={(e) => setForm({ ...editable, whatsapp: e.target.value })} />
            <Input label="Telefone" value={editable.phone} onChange={(e) => setForm({ ...editable, phone: e.target.value })} />
            <Input label="Cidade" value={editable.city} onChange={(e) => setForm({ ...editable, city: e.target.value })} />
            <Input label="Estado" maxLength={2} value={editable.state} onChange={(e) => setForm({ ...editable, state: e.target.value })} />
            <Input label="Endereço" value={editable.address} onChange={(e) => setForm({ ...editable, address: e.target.value })} />
          </div>
          <div className="flex justify-end border-t border-slate-100 px-4 py-3">
            <Button loading={saving} onClick={saveCompany}><Save size={15} /> Salvar</Button>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Meu acesso" icon={<KeyRound size={17} className="text-green-700" />} />
            <div className="space-y-2 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Nome</span><span className="font-medium text-slate-700">{user?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">E-mail</span><span className="font-medium text-slate-700">{user?.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Perfil</span><span className="font-medium text-slate-700">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Empresa</span><span className="font-medium text-slate-700">{user?.company?.companyName}</span></div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Alterar minha senha" icon={<KeyRound size={17} className="text-green-700" />} />
            <div className="space-y-3 p-4">
              <Input label="Senha atual" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
              <Input label="Nova senha" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
              <Input label="Confirmar nova senha" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              <Button loading={saving} onClick={changePassword}><Save size={15} /> Alterar senha</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Módulos liberados" icon={<Settings size={17} className="text-green-700" />} />
            <div className="flex flex-wrap gap-1.5 p-4">
              {(data?.modules ?? []).map((m: string) => (
                <span key={m} className="badge bg-green-100 text-green-700">{m}</span>
              ))}
              {(data?.modules ?? []).length === 0 && <p className="text-sm text-slate-400">Nenhum módulo liberado.</p>}
            </div>
            <p className="px-4 pb-4 text-xs text-slate-500">A liberação de módulos é controlada pelo administrador da plataforma.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
