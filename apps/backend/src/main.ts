/* eslint-disable */
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
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

  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  logger.log(`AgroGestor IA backend rodando em http://${host}:${port}/api  (docs: /api/docs)`);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar o backend', err);
  process.exit(1);
});
