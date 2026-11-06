import { Controller, Get, Param, Query, Res, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService, ReportKey } from './reports.service';
import { AuthUser, CurrentUser, RequireModule } from '../common/decorators';

const KEY_PATTERN = /^[a-z-]+$/;

@ApiTags('Relatórios')
@ApiBearerAuth()
@RequireModule('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  /**
   * GET /reports/:key?format=json|csv|xlsx|pdf
   * Todas as respostas são enviadas explicitamente pelo `reply`: com `@Res()` injetado,
   * o Nest não serializa o retorno sozinho e a requisição ficaria pendurada.
   */
  @Get(':key')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Query('format') format: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('farmId') farmId: string | undefined,
    @Res() reply: any,
  ) {
    const normalized = (format || 'json').toLowerCase();
    if (!['json', 'csv', 'xlsx', 'pdf'].includes(normalized)) {
      throw new BadRequestException('Formato inválido. Use json, csv, xlsx ou pdf.');
    }
    if (!KEY_PATTERN.test(key)) {
      throw new BadRequestException('Relatório inválido');
    }

    const table = await this.service.build(user, key as ReportKey, { from, to, farmId });

    if (normalized === 'csv') {
      const csv = await this.service.toCsv(table);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${key}.csv"`);
      return reply.send(csv);
    }
    if (normalized === 'xlsx') {
      const buf = await this.service.toExcel(table);
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${key}.xlsx"`);
      return reply.send(buf);
    }
    if (normalized === 'pdf') {
      const buf = await this.service.toPdf(table);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${key}.pdf"`);
      return reply.send(buf);
    }

    reply.header('Content-Type', 'application/json; charset=utf-8');
    return reply.send(table);
  }
}
