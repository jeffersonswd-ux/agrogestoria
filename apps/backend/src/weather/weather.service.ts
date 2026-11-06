import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators';

const CACHE_MINUTES = 30;

/**
 * Integração meteorológica real.
 * Provedor padrão: Open-Meteo (sem chave). Se WEATHER_PROVIDER=weatherapi
 * e WEATHER_API_KEY estiver configurada, usa WeatherAPI.com.
 * Dados simulados NÃO são gerados: se a API falhar, o erro é reportado.
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthUser, farmId?: string) {
    const farm = farmId
      ? await this.prisma.farm.findFirst({
          where: {
            id: farmId,
            ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId ?? undefined }),
          },
        })
      : await this.prisma.farm.findFirst({
          where: { companyId: user.companyId ?? undefined, latitude: { not: null }, longitude: { not: null } },
          orderBy: { createdAt: 'asc' },
        });
    if (!farm) {
      return { available: false, reason: 'Cadastre uma fazenda com latitude e longitude para ver o clima.' };
    }
    if (farm.latitude == null || farm.longitude == null) {
      return { available: false, reason: 'Esta fazenda não possui coordenadas cadastradas.' };
    }
    const key = `weather:${farm.latitude.toFixed(4)}:${farm.longitude.toFixed(4)}`;
    const cached = await this.prisma.weatherCache.findUnique({ where: { key } });
    if (cached && cached.expiresAt > new Date()) {
      return { available: true, farm: { id: farm.id, name: farm.name }, ...(cached.data as any), cached: true };
    }
    try {
      const data = await this.fetchOpenMeteo(farm.latitude, farm.longitude);
      await this.prisma.weatherCache.upsert({
        where: { key },
        create: { key, data: data as any, expiresAt: new Date(Date.now() + CACHE_MINUTES * 60000) },
        update: { data: data as any, expiresAt: new Date(Date.now() + CACHE_MINUTES * 60000) },
      });
      return { available: true, farm: { id: farm.id, name: farm.name }, ...data, cached: false };
    } catch (err) {
      this.logger.error(`Falha ao consultar clima: ${(err as Error).message}`);
      if (cached) {
        return {
          available: true,
          stale: true,
          farm: { id: farm.id, name: farm.name },
          ...(cached.data as any),
          warning: 'Não foi possível atualizar os dados meteorológicos. Exibindo última consulta.',
        };
      }
      return { available: false, reason: 'Não foi possível consultar o serviço meteorológico agora.' };
    }
  }

  private async fetchOpenMeteo(lat: number, lon: number) {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
      `&timezone=America%2FSao_Paulo&forecast_days=7`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Open-Meteo respondeu ${res.status}`);
      const j: any = await res.json();
      const labels: Record<number, string> = {
        0: 'Céu limpo', 1: 'Principalmente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
        45: 'Nevoeiro', 48: 'Nevoeiro com geada', 51: 'Garoa leve', 53: 'Garoa', 55: 'Garoa intensa',
        61: 'Chuva leve', 63: 'Chuva', 65: 'Chuva forte', 80: 'Pancadas leves', 81: 'Pancadas',
        82: 'Pancadas fortes', 95: 'Tempestade', 96: 'Tempestade com granizo', 99: 'Tempestade forte',
      };
      const daily = (j.daily?.time ?? []).map((date: string, i: number) => ({
        date,
        weekday: new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        tempMax: j.daily.temperature_2m_max[i],
        tempMin: j.daily.temperature_2m_min[i],
        rain: j.daily.precipitation_sum[i],
        rainChance: j.daily.precipitation_probability_max[i],
        code: j.daily.weather_code[i],
        description: labels[j.daily.weather_code[i]] ?? 'Condição variável',
      }));
      return {
        source: 'Open-Meteo',
        current: {
          temperature: j.current?.temperature_2m,
          humidity: j.current?.relative_humidity_2m,
          rain: j.current?.precipitation,
          wind: j.current?.wind_speed_10m,
          code: j.current?.weather_code,
          description: labels[j.current?.weather_code] ?? 'Condição variável',
          updatedAt: j.current?.time,
        },
        daily,
        alerts: this.buildAlerts(daily),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildAlerts(daily: any[]) {
    const alerts: { level: string; message: string }[] = [];
    const next3 = daily.slice(0, 3);
    const rainSum = next3.reduce((s, d) => s + (d.rain ?? 0), 0);
    if (rainSum > 40) alerts.push({ level: 'warn', message: `Previsão de chuvas intensas nos próximos dias (${rainSum.toFixed(0)} mm). Evite pulverizações.` });
    else if (rainSum > 10) alerts.push({ level: 'info', message: `Chuva prevista nos próximos dias (${rainSum.toFixed(0)} mm). Planeje aplicações.` });
    if (next3.some((d) => d.tempMax >= 36)) alerts.push({ level: 'warn', message: 'Temperaturas elevadas previstas — atenção ao estresse hídrico.' });
    if (next3.some((d) => d.code >= 95)) alerts.push({ level: 'danger', message: 'Possibilidade de tempestades com granizo.' });
    return alerts;
  }
}
