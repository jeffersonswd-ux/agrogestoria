/* eslint-disable */
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 26 * 1024 * 1024, trustProxy: true }),
    { logger: ['error', 'warn', 'log'] },
  );

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: false });
  const origins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  await app.register(cors, {
    origin: origins.includes('*') ? true : origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(multipart, { limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024 } });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AgroGestor IA API')
    .setDescription('SaaS agrícola multiempresas — API REST')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Painel web: se o build do frontend estiver presente, o próprio backend o serve.
  // Permite hospedar API e painel em um único processo (Hostinger, Render, VPS simples).
  const candidatosWeb = [
    process.env.WEB_DIR,
    resolve(__dirname, '..', 'public'),
    resolve(__dirname, '..', '..', 'frontend', 'dist'),
    resolve(__dirname, '..', '..', '..', 'apps', 'frontend', 'dist'),
  ].filter(Boolean) as string[];
  const webDir = candidatosWeb.find((dir) => existsSync(join(dir, 'index.html')));
  const indexHtmlPath = webDir ? join(webDir, 'index.html') : '';
  const temPainel = Boolean(webDir);

  if (temPainel && webDir) {
    await app.register(fastifyStatic, { root: webDir, prefix: '/', wildcard: false });
    const indexHtml = readFileSync(indexHtmlPath, 'utf8');
    const instance = app.getHttpAdapter().getInstance() as any;
    // O hook roda antes do roteamento: devolve o index.html para as rotas internas do painel
    // (ex.: /admin/clientes), que de outro modo cairiam no 404 da API.
    instance.addHook('onRequest', async (request: any, reply: any) => {
      const metodo = (request.method || 'GET').toUpperCase();
      const caminho = String(request.raw?.url ?? request.url ?? '/').split('?')[0];
      const ehRotaDoPainel =
        (metodo === 'GET' || metodo === 'HEAD') &&
        !caminho.startsWith('/api') &&
        !caminho.startsWith('/uploads') &&
        !caminho.includes('.');
      if (ehRotaDoPainel) {
        return reply.header('Content-Type', 'text/html; charset=utf-8').send(indexHtml);
      }
    });
    logger.log(`Painel web servido de ${webDir}`);
  } else {
    logger.warn('Painel web não encontrado — apenas a API está disponível (defina WEB_DIR)');
  }

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  logger.log(`AgroGestor IA backend rodando em http://${host}:${port}/api  (docs: /api/docs)`);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar o backend', err);
  process.exit(1);
});
