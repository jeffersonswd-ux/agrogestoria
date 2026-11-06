import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuthUser } from '../common/decorators';

/** Área aproximada (ha) de um polígono GeoJSON usando a fórmula esférica. */
function polygonAreaHa(coords: number[][]): number {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[(i + 1) % coords.length];
    area += ((lon2 - lon1) * Math.PI / 180) * (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  return Math.abs((area * R * R) / 2) / 10000;
}

@Injectable()
export class MapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  async overview(user: AuthUser, farmId?: string) {
    const scope = this.tenant.scope(user);
    const farms = await this.prisma.farm.findMany({
      where: { ...scope, ...(farmId ? { id: farmId } : {}) },
      select: {
        id: true, name: true, latitude: true, longitude: true, totalAreaHa: true,
        municipality: true, state: true,
      },
    });
    const plots = await this.prisma.plot.findMany({
      where: { ...scope, ...(farmId ? { farmId } : {}) },
      select: {
        id: true, name: true, farmId: true, areaHa: true, boundary: true,
        latitude: true, longitude: true, soilType: true, irrigationType: true,
        farm: { select: { name: true } },
      },
    });
    return {
      farms: farms.map((f) => ({ ...f, plotCount: plots.filter((p) => p.farmId === f.id).length })),
      plots: plots.map((p) => ({
        ...p,
        boundaryAreaHa: (() => {
          const b: any = p.boundary;
          const ring = b?.geometry?.coordinates?.[0] ?? (Array.isArray(b) ? b : null);
          return ring ? Math.round(polygonAreaHa(ring) * 100) / 100 : null;
        })(),
      })),
    };
  }

  async calculateArea(boundary: any) {
    const ring = boundary?.geometry?.coordinates?.[0] ?? (Array.isArray(boundary) ? boundary : null);
    return { areaHa: ring ? Math.round(polygonAreaHa(ring) * 100) / 100 : 0 };
  }
}
