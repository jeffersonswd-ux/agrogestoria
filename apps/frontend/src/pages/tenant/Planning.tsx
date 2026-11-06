import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Sprout } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, EmptyState, LoadingBlock, PageHeader } from '../../components/ui';
import { number, date } from '../../lib/format';
import { useOptions } from '../../lib/options';

export default function Planning() {
  const { farms } = useOptions();
  const [farmId, setFarmId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-planning', farmId],
    queryFn: async () => (await api.get('/planning/seasons', { params: { farmId: farmId || undefined } })).data,
  });

  const seasons: any[] = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div>
      <PageHeader title="Planejamento Agrícola" description="Calendário de plantio, safras planejadas e produtividade esperada" />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-[240px]">
            <label className="label">Fazenda</label>
            <select className="input" value={farmId} onChange={(e) => setFarmId(e.target.value)}>
              <option value="">Todas as fazendas</option>
              {farms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : seasons.length === 0 ? (
          <EmptyState
            icon={<CalendarRange size={40} />}
            title="Nenhuma safra planejada"
            description="Cadastre culturas em Culturas e Safras para montar o calendário de plantio da operação."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {seasons.map((s) => (
              <div key={s.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sprout size={16} className="text-green-700" />
                      <span className="font-semibold text-slate-800">{s.name}</span>
                      <Badge tone={s.status === 'COLHIDA' ? 'green' : s.status === 'PLANEJADA' ? 'slate' : 'amber'}>{s.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {s.crop?.culture} · {s.crop?.variety || 'variedade não informada'} · {s.farm?.name}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                    <div><p className="text-xs text-slate-500">Área</p><p className="font-medium text-slate-700">{number(s.crop?.areaHa)} ha</p></div>
                    <div><p className="text-xs text-slate-500">Plantio</p><p className="font-medium text-slate-700">{date(s.plantingDateDone || s.plantingDatePlan)}</p></div>
                    <div><p className="text-xs text-slate-500">Colheita</p><p className="font-medium text-slate-700">{date(s.harvestDateDone || s.harvestDatePlan)}</p></div>
                    <div><p className="text-xs text-slate-500">Prod. estimada</p><p className="font-medium text-slate-700">{number(s.estimatedProduction)} {s.unit}</p></div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-green-600"
                    style={{
                      width: `${Math.min(100, Math.max(2, ((s.crop?.areaHa ?? 0) > 0 ? ((s.harvestedProduction ?? 0) / (s.estimatedProduction || 1)) * 100 : 0)))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
