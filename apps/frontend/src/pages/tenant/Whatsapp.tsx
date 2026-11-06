import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, QrCode, RefreshCw, PlugZap, Plug, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { Badge, Button, Card, EmptyState, LoadingBlock, Modal, PageHeader } from '../../components/ui';
import { STATUS_LABEL, dateTime } from '../../lib/format';

export default function Whatsapp() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-whatsapp'],
    queryFn: async () => (await api.get('/whatsapp/status')).data,
  });

  const { data: messages } = useQuery({
    queryKey: ['tenant-whatsapp-messages'],
    queryFn: async () => (await api.get('/whatsapp/messages')).data as any[],
  });

  const run = async (fn: () => Promise<any>, after?: (r: any) => void) => {
    setError('');
    setBusy(true);
    try {
      const res = await fn();
      after?.(res);
      qc.invalidateQueries({ queryKey: ['tenant-whatsapp'] } as any);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const instance = data?.instance;

  return (
    <div>
      <PageHeader title="WhatsApp" description="Conexão do WhatsApp via Evolution API" />

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <div className="card-header">
            <MessageCircle size={17} className="text-green-700" />
            <h3 className="card-title flex-1">Conexão</h3>
            {instance && (
              <Badge tone={instance.status === 'CONECTADO' ? 'green' : instance.status === 'ERRO' ? 'red' : 'amber'}>
                {STATUS_LABEL[instance.status] ?? instance.status}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <LoadingBlock />
          ) : !instance ? (
            <EmptyState
              icon={<MessageCircle size={40} />}
              title="WhatsApp não conectado"
              description={
                data?.server
                  ? `Servidor "${data.server.name}" disponível. Conecte para gerar o QR Code.`
                  : 'Nenhum servidor Evolution API está vinculado à sua empresa. Solicite ao administrador da plataforma.'
              }
              action={
                data?.server ? (
                  <Button loading={busy} onClick={() => run(() => api.post('/whatsapp/connect', {}), (r) => { setQr(r); setQrOpen(true); })}>
                    <PlugZap size={16} /> Conectar
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3 p-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div><p className="text-xs text-slate-500">Instância</p><p className="font-medium text-slate-700">{instance.name}</p></div>
                <div><p className="text-xs text-slate-500">Número</p><p className="font-medium text-slate-700">{instance.phone || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Servidor</p><p className="font-medium text-slate-700">{data?.server?.name ?? '—'}</p></div>
                <div><p className="text-xs text-slate-500">Última conexão</p><p className="font-medium text-slate-700">{instance.lastConnectedAt ? dateTime(instance.lastConnectedAt) : '—'}</p></div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <Button loading={busy} onClick={() => run(() => api.post('/whatsapp/qr', {}), (r) => { setQr(r); setQrOpen(true); })}>
                  <QrCode size={15} /> Gerar QR Code
                </Button>
                <Button variant="secondary" loading={busy} onClick={() => run(() => api.get('/whatsapp/refresh'))}>
                  <RefreshCw size={15} /> Verificar conexão
                </Button>
                <Button variant="secondary" loading={busy} onClick={() => run(() => api.delete('/whatsapp/disconnect'))}>
                  <Plug size={15} /> Desconectar
                </Button>
                <Button variant="danger" loading={busy} onClick={() => {
                  if (window.confirm('Excluir a instância do WhatsApp?')) run(() => api.delete('/whatsapp/disconnect?delete=true'));
                }}>
                  <Trash2 size={15} /> Excluir instância
                </Button>
              </div>

              <label className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={instance.notificationsEnabled}
                  onChange={(e) => run(() => api.post('/whatsapp/notifications', { enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-500"
                />
                Enviar notificações de vencimentos e alertas por WhatsApp
              </label>
            </div>
          )}
        </Card>

        <Card>
          <div className="card-header">
            <MessageCircle size={17} className="text-green-700" />
            <h3 className="card-title flex-1">Mensagens recentes</h3>
          </div>
          {(messages ?? []).length === 0 ? (
            <EmptyState icon={<MessageCircle size={36} />} title="Sem mensagens" description="As mensagens trocadas pelo WhatsApp aparecerão aqui." />
          ) : (
            <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {(messages ?? []).map((m: any) => (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${m.direction === 'IN' ? 'text-blue-600' : 'text-green-700'}`}>
                      {m.direction === 'IN' ? 'Recebida' : 'Enviada'}
                    </span>
                    <span className="text-[11px] text-slate-400">{dateTime(m.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{m.body || '(sem texto)'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="Escaneie o QR Code">
        <div className="text-center">
          {qr?.qrCode ? (
            <img src={qr.qrCode.startsWith('data:') ? qr.qrCode : `data:image/png;base64,${qr.qrCode}`} alt="QR Code WhatsApp" className="mx-auto h-64 w-64 rounded-lg border border-slate-200" />
          ) : (
            <EmptyState icon={<QrCode size={40} />} title="QR Code indisponível" description="O servidor ainda não retornou o QR Code. Tente novamente em alguns segundos." />
          )}
          {qr?.pairingCode && (
            <p className="mt-3 text-sm text-slate-600">Código de pareamento: <strong className="font-mono">{qr.pairingCode}</strong></p>
          )}
          <Button variant="secondary" className="mt-4" onClick={() => run(() => api.post('/whatsapp/qr', {}), (r) => setQr(r))}>
            <RefreshCw size={15} /> Atualizar QR Code
          </Button>
        </div>
      </Modal>
    </div>
  );
}
