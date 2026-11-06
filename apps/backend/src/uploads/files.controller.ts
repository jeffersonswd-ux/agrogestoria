import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { Public } from '../common/decorators/public.decorator';

/**
 * Serve os arquivos enviados em /uploads.
 * Implementado à parte do Fastify para devolver o tipo MIME correto.
 */
@ApiTags('Arquivos')
@Controller('uploads')
export class FilesController {
  private dir() {
    return resolve(process.env.UPLOAD_DIR || './uploads');
  }

  @Public()
  @Get(':filename')
  serve(@Req() req: any, @Res() reply: any) {
    const filename = String(req.params?.filename ?? '');
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const file = join(this.dir(), safe);
    if (!file.startsWith(this.dir()) || !existsSync(file)) {
      reply.code(404);
      return reply.send({ message: 'Arquivo não encontrado' });
    }
    const ext = safe.slice(safe.lastIndexOf('.')).toLowerCase();
    const types: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    reply.header('Content-Type', types[ext] ?? 'application/octet-stream');
    reply.header('Content-Length', statSync(file).size);
    return reply.sendFile(file);
  }
}
