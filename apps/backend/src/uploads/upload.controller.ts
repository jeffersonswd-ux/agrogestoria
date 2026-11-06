import { Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

@ApiTags('Arquivos')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  @Post()
  async upload(@Req() req: any) {
    const data = await req.file();
    if (!data) throw new BadRequestException('Nenhum arquivo enviado');
    if (!ALLOWED.includes(data.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido (use JPG, PNG, WEBP ou PDF)');
    }
    const dir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(data.filename || '').toLowerCase() || `.${data.mimetype.split('/')[1]}`;
    const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    const dest = path.join(dir, name);
    const buffer: Buffer = await (data as any).toBuffer();
    fs.writeFileSync(dest, buffer);
    return { url: `/uploads/${name}`, filename: name, size: buffer.length };
  }
}
