import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { Button, Card, CardHeader, EmptyState, LoadingBlock, PageHeader, Textarea } from '../../components/ui';
import { dateTime } from '../../lib/format';

const SUGGESTIONS = [
  'Quanto gastei com diesel este mês?',
  'Qual foi meu custo por hectare?',
  'Quanto produzi de soja?',
  'Qual fazenda teve maior produtividade?',
  'Quais contas vencem amanhã?',
  'Qual máquina precisa de manutenção?',
];

export default function Assistant() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => (await api.get('/ai/status')).data,
  });

  const { data: history } = useQuery({
    queryKey: ['ai-history'],
    queryFn: async () => (await api.get('/ai/history')).data as any[],
  });

  const ask = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text) return;
    setError('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setQuestion('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai/ask', { question: text });
      setMessages((m) => [...m, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Assistente IA" description="Consulte os dados da sua operação em linguagem natural" />

      {!status?.configured && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          O assistente precisa da variável <code className="rounded bg-amber-100 px-1">OPENAI_API_KEY</code> configurada no servidor.
          Enquanto ela não existir, as consultas retornam um aviso em vez de resposta.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="card-header">
              <Bot size={17} className="text-green-700" />
              <h3 className="card-title flex-1">Conversa</h3>
            </div>

            <div className="min-h-[360px] space-y-3 p-4">
              {messages.length === 0 && (
                <EmptyState
                  icon={<Sparkles size={40} />}
                  title="Pergunte sobre a sua operação"
                  description="O assistente consulta custos, produção, contas a vencer, máquinas e safras registrados no sistema."
                />
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user' ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">Consultando os dados...</div>
                </div>
              )}
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
            </div>

            <div className="border-t border-slate-100 p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  className="flex-1"
                  placeholder="Ex.: Quanto gastei com diesel este mês?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
                />
                <Button loading={loading} onClick={() => ask()}><Send size={15} /> Enviar</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <div className="card-header"><h3 className="card-title">Perguntas sugeridas</h3></div>
            <div className="space-y-1.5 p-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="card-header">
              <h3 className="card-title flex-1">Consultas recentes</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => undefined}><RefreshCw size={15} /></button>
            </div>
            {(history ?? []).length === 0 ? (
              <EmptyState title="Sem histórico" description="Suas consultas anteriores aparecerão aqui." />
            ) : (
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {(history ?? []).map((h) => (
                  <div key={h.id} className="px-4 py-2.5">
                    <p className="text-[13px] font-medium text-slate-700">{h.question}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{h.answer}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{dateTime(h.createdAt)} · {h.totalTokens} tokens</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
