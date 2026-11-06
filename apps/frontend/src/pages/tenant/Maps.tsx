import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map as MapIcon, Layers } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, EmptyState, LoadingBlock, PageHeader, Select } from '../../components/ui';
import { number } from '../../lib/format';
import { useOptions } from '../../lib/options';

export default function Maps() {
  const { farms } = useOptions();
  const [farmId, setFarmId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-maps', farmId],
    queryFn: async () => (await api.get('/maps', { params: { farmId: farmId || undefined } })).data,
  });

  const withCoords = (data?.farms ?? []).filter((f: any) => f.latitude != null && f.longitude != null);
  const plots = data?.plots ?? [];

  return (
    <div>
      <PageHeader title="Mapas Agrícolas" description="Localização das propriedades, talhões e cálculo de área" />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-[240px]">
            <label className="label">Propriedade</label>
            <Select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
              <option value="">Todas as propriedades</option>
              {farms.map((f: any) => (<option key={f.id} value={f.id}>{f.name}</option>))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : (data?.farms ?? []).length === 0 ? (
          <EmptyState icon={<MapIcon size={40} />} title="Nenhuma propriedade cadastrada" description="Cadastre fazendas com coordenadas para visualizá-las no mapa." />
        ) : (
          <div className="grid gap-3 p-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-slate-200 bg-[#eef3ee] p-6">
                <div className="relative mx-auto aspect-[16/10] max-w-2xl overflow-hidden rounded-lg border border-slate-300 bg-white">
                  {withCoords.length === 0 ? (
                    <EmptyState icon={<MapIcon size={36} />} title="Sem coordenadas" description="Informe latitude e longitude nas propriedades para plotá-las no mapa." />
                  ) : (
                    <div className="relative h-full w-full bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50">
                      <svg viewBox="0 0 100 100" className="h-full w-full">
                        {withCoords.map((f: any, i: number) => {
                          const x = 50 + (Math.sin(Number(f.longitude)) * 40);
                          const y = 50 - (Math.cos(Number(f.latitude)) * 40);
                          return (
                            <g key={f.id}>
                              <circle cx={x} cy={y} r="4.5" fill="#15803d" opacity="0.85" />
                              <circle cx={x} cy={y} r="2" fill="#ffffff" />
                              <text x={x + 6} y={y + 1.5} fontSize="3.4" fill="#14532d" fontWeight="600">
                                {f.name}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10.5px] text-slate-500">
                        {withCoords.length} propriedade(s) com coordenadas · projeção ilustrativa
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  O mapa exibe a posição relativa das propriedades. O georreferenciamento dos talhões aceita polígonos GeoJSON,
                  cuja área é calculada pelo servidor em hectares.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Layers size={16} /> Propriedades</h3>
              {(data?.farms ?? []).map((f: any) => (
                <div key={f.id} className="rounded-lg border border-slate-100 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{f.name}</span>
                    <span className="text-xs text-slate-500">{number(f.totalAreaHa)} ha</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {[f.municipality, f.state].filter(Boolean).join(' / ') || 'Sem município'} · {f.plotCount} talhão(ões)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {f.latitude != null ? `Lat ${f.latitude} · Lon ${f.longitude}` : 'Sem coordenadas'}
                  </p>
                </div>
              ))}

              {plots.length > 0 && (
                <>
                  <h3 className="pt-2 text-sm font-semibold text-slate-700">Talhões</h3>
                  {plots.map((p: any) => (
                    <div key={p.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">{p.name}</span>
                        <span className="text-xs text-slate-500">{number(p.areaHa)} ha</span>
                      </div>
                      {p.boundaryAreaHa != null && (
                        <p className="text-[11px] text-green-700">Área do polígono: {number(p.boundaryAreaHa)} ha</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
