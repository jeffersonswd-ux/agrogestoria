import { Settings, Save, KeyRound } from 'lucide-react';
import { Card, CardHeader, PageHeader, Badge } from '../../components/ui';

export default function AdminSettings() {
  return (
    <div>
      <PageHeader title="Configurações" description="Configurações globais da plataforma" />

      <div className="space-y-3">
        <Card>
          <CardHeader title="Estado das configurações externas" icon={<Settings size={17} className="text-green-700" />} />
          <div className="divide-y divide-slate-100">
            {[
              { label: 'Banco de dados PostgreSQL', desc: 'Variável DATABASE_URL', ok: true },
              { label: 'Redis / filas BullMQ', desc: 'Variável REDIS_URL', ok: true },
              { label: 'OpenAI (Assistente IA)', desc: 'Variável OPENAI_API_KEY — preencher no servidor', ok: false },
              { label: 'Evolution API (WhatsApp)', desc: 'Servidores cadastrados em Integrações', ok: true },
              { label: 'Serviço meteorológico', desc: 'Open-Meteo (sem chave) ou WEATHER_API_KEY', ok: true },
              { label: 'Armazenamento de arquivos', desc: 'Variável UPLOAD_DIR', ok: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <Badge tone={item.ok ? 'green' : 'amber'}>{item.ok ? 'Configurado' : 'Pendente'}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Segurança" icon={<KeyRound size={17} className="text-green-700" />} />
          <div className="space-y-2 px-5 py-4 text-sm text-slate-600">
            <p>• Senhas armazenadas com hash bcrypt (12 rounds) e nunca exibidas em texto puro.</p>
            <p>• Refresh tokens rotacionados a cada renovação e revogados ao bloquear um cliente.</p>
            <p>• API Keys de integração criptografadas com AES-256-GCM.</p>
            <p>• Acessos administrativos a dados de clientes são registrados na auditoria.</p>
            <p>• Rate limiting ativo em todas as rotas da API.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sobre o sistema" icon={<Settings size={17} className="text-green-700" />} />
          <div className="px-5 py-4 text-sm text-slate-600">
            <p>
              <strong>AgroGestor IA</strong> — versão 1.0.0. Plataforma SaaS agrícola multiempresas com administração
              centralizada pelo Super Admin. Não há planos, assinaturas ou cobrança automática: o acesso comercial é
              liberado manualmente por este painel.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
