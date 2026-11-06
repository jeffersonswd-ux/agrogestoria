import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudSun, CloudRain, Wind, Droplets, AlertTriangle, Thermometer } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, CardHeader, EmptyState, LoadingBlock, PageHeader, Select } from '../../components/ui';
import { number } from '../../lib/format';
import { useOptions } from '../../lib/options';

export default function Weather() {
  const { farms } = useOptions();
  const [farmId, setFarmId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-weather', farmId],
    queryFn: async () => (await api.get('/weather', { params: { farmId: farmId || undefined } })).data,
  });

  return (
    <div>
      <PageHeader title="Clima e Alertas" description="Dados meteorológicos reais da sua propriedade" />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-[240px]">
            <label className="label">Propriedade</label>
            <Select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
              <option value="">Primeira fazenda com coordenadas</option>
              {farms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
          </div>
          {data?.farm && <p className="pb-2 text-sm text-slate-500">Exibindo dados de <strong>{data.farm.name}</strong></p>}
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : !data?.available ? (
          <EmptyState icon={<CloudSun size={40} />} title="Clima indisponível" description={data?.reason ?? 'Cadastre uma fazenda com latitude e longitude para consultar o clima.'} />
        ) : (
          <>
            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <Thermometer size={20} className="text-red-500" />
                <div><p className="text-xs text-slate-500">Temperatura</p><p className="text-lg font-bold text-slate-800">{number(data.current?.temperature, 1)}°C</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <Droplets size={20} className="text-blue-500" />
                <div><p className="text-xs text-slate-500">Umidade</p><p className="text-lg font-bold text-slate-800">{number(data.current?.humidity, 0)}%</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <CloudRain size={20} className="text-sky-500" />
                <div><p className="text-xs text-slate-500">Chuva (24h)</p><p className="text-lg font-bold text-slate-800">{number(data.current?.rain, 1)} mm</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <Wind size={20} className="text-teal-500" />
                <div><p className="text-xs text-slate-500">Vento</p><p className="text-lg font-bold text-slate-800">{number(data.current?.wind, 1)} km/h</p></div>
              </div>
            </div>

            {(data.alerts ?? []).length > 0 && (
              <div className="border-b border-slate-100 p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Alertas meteorológicos</h3>
                <div className="space-y-2">
                  {data.alerts.map((a: any, i: number) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
                        a.level === 'danger' ? 'bg-red-50 text-red-700' : a.level === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      {a.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Previsão dos próximos 7 dias</h3>
              <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {(data.daily ?? []).map((d: any, i: number) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3 text-center">
                    <p className="text-xs font-medium text-slate-500">{i === 0 ? 'Hoje' : d.weekday}</p>
                    <CloudSun size={26} className="mx-auto my-2 text-amber-500" />
                    <p className="text-xs text-slate-500">{d.description}</p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-700">{number(d.tempMax, 0)}° / {number(d.tempMin, 0)}°</p>
                    <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-blue-600">
                      <CloudRain size={11} /> {number(d.rainChance, 0)}%
                    </p>
                    <p className="text-[11px] text-slate-400">{number(d.rain, 1)} mm</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400">Fonte: {data.source}{data.cached ? ' (dados em cache)' : ''}{data.stale ? ' — última consulta disponível' : ''}</p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
