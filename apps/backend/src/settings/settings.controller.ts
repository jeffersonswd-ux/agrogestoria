import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';
import { hashPassword, verifyPassword } from '../common/utils/crypto';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Configurações')
@ApiBearerAuth()
@RequireModule('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    const company = user.companyId
      ? await this.prisma.company.findUnique({
          where: { id: user.companyId },
          select: {
            id: true, clientName: true, companyName: true, legalName: true, document: true,
            email: true, whatsapp: true, phone: true, city: true, state: true, address: true,
            notes: true, simpleMode: true,
          },
        })
      : null;
    const modules = user.companyId
      ? await this.prisma.modulePermission.findMany({ where: { companyId: user.companyId, enabled: true }, select: { module: true } })
      : [];
    return { company, modules: modules.map((m) => m.module), user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() dto: any) {
    if (!user.companyId) throw new BadRequestException('Usuário sem empresa vinculada');
    const company = await this.prisma.company.update({
      where: { id: user.companyId },
      data: {
        companyName: dto.companyName,
        legalName: dto.legalName,
        email: dto.email,
        whatsapp: dto.whatsapp,
        phone: dto.phone,
        city: dto.city,
        state: dto.state,
        address: dto.address,
      },
    });
    await this.audit.log({ action: 'CONFIGURACAO_ALTERADA', entity: 'Company', entityId: company.id, actor: user, after: company });
    return company;
  }
}
