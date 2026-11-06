# AgroGestor IA

Sistema SaaS agrícola multiempresas, com administração centralizada pelo Super Admin.
Frontend React + TypeScript + Vite + Tailwind, backend NestJS + Prisma + PostgreSQL,
workers BullMQ + Redis, integração WhatsApp via Evolution API e assistente com OpenAI.

**Não há planos, assinaturas ou cobrança automática.** O acesso comercial é liberado manualmente
pelo Super Admin no painel administrativo.

---

## Estrutura

```
apps/
  backend/    API REST NestJS (Fastify) + Prisma
  frontend/   SPA React + Vite + Tailwind
  worker/     Consumidores BullMQ (alertas, vencimentos, WhatsApp, IA, relatórios)
scripts/      Instalação, migrations, backup e restauração
```

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Recharts, Leaflet |
| Backend | Node.js 20, TypeScript, NestJS (Fastify), Prisma, PostgreSQL 16, Swagger, Throttler |
| Workers | BullMQ, Redis 7, ioredis |
| Integrações | Evolution API (WhatsApp), OpenAI (assistente e transcrição), Open-Meteo (clima) |

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 14 ou superior
- Redis 6 ou superior
- Docker e Docker Compose v2 (para o deploy em nuvem)

## Desenvolvimento local

Cada aplicativo tem suas próprias dependências (o projeto não usa npm workspaces,
para não depender de links simbólicos no Windows).

```bash
# 1. Dependências (backend, worker e frontend)
npm run install:all

# 2. Variáveis de ambiente
cp apps/backend/.env.example apps/backend/.env
cp apps/worker/.env.example apps/worker/.env
# ajuste DATABASE_URL, REDIS_URL e as chaves de segurança
```

## Como iniciar (estado validado)

```bash
# Terminal 1 — Redis (no Windows, usa a versão portable em .tools/redis)
bash scripts/start-redis.sh

# Terminal 2 — banco de dados e primeiro Super Admin (só na primeira vez)
npm run db:migrate
npm run seed

# Terminal 3 — API
npm run dev:backend        # http://localhost:3001/api  ·  docs em /api/docs

# Terminal 4 — workers (filas BullMQ)
npm run dev:worker

# Terminal 5 — painel web
npm run dev:frontend       # http://localhost:5173
```

Para compilar tudo de uma vez: `npm run build`.
Para rodar os testes: `npm test` (unitários) e `node scripts/smoke-test.js` dentro de
`apps/backend`.

### Scripts de verificação incluídos

| Script (dentro de `apps/backend`) | O que verifica |
|---|---|
| `node scripts/smoke-test.js` | Health check, login e rotas do painel |
| `node scripts/check-reports.js` | As 19 chaves de relatório em JSON e as exportações csv/xlsx/pdf |
| `node scripts/e2e-client-flow.js` | Cadastro de cliente, fazenda, login do cliente e bloqueio |
| `node scripts/e2e-isolation.js` | Isolamento entre duas empresas |
| `node scripts/create-demo-client.js` | Cria (ou remove com `--remove`) um cliente de demonstração |
| `node scripts/set-superadmin.js <email> <senha> [nome]` | Cria ou troca a conta do Super Admin |

## Primeiro acesso

O seed cria apenas o Super Admin, com a empresa técnica da plataforma.
Nenhum cliente ou fazenda fictício é criado: o sistema inicia vazio.

```
E-mail: jefferson_dpd@hotmail.com
Senha:  Jeff@2020
```

Altere a senha no primeiro acesso. Para mudar as credenciais iniciais, edite
`SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` e `SUPERADMIN_NAME` no `.env` **antes** de rodar o seed.

## Fluxo de trabalho do Super Admin

1. **Clientes / Empresas → Novo Cliente** — dados do cliente, empresa e usuário administrador.
   A senha inicial é gerada e exibida uma única vez.
2. **Fazendas → Nova Fazenda** — vincula a propriedade ao cliente, com área e coordenadas.
3. **Módulos e Permissões** — escolhe quais módulos a empresa pode usar.
   Módulos desligados somem do menu e as APIs negam o acesso.
4. **Bloquear/Desbloquear** — revoga todas as sessões ativas do cliente.

## Multiempresa

Todo dado de cliente carrega `companyId`. O backend aplica o escopo da empresa do usuário em
todas as consultas; perfis sem acesso global são restritos às fazendas vinculadas em `UserFarm`.
O Super Admin ignora o filtro de empresa para dar suporte, e toda ação dele é auditada.

## Documentação

- [DEPLOY.md](DEPLOY.md) — instalação em nuvem, **deploy na Hostinger**, proxy reverso, HTTPS e backup
- [PROGRESSO.md](PROGRESSO.md) — módulos concluídos, testes executados e pendências
- Documentação interativa da API: `http://localhost:3001/api/docs`

## Deploy em um processo só (Hostinger, Render, VPS)

O backend também entrega o painel web. Isso permite rodar API e painel em um
único processo Node, que é o formato esperado pela Hostinger.

```bash
npm run build   # compila backend, worker e painel
npm start       # sobe a API e o painel na mesma porta
```

O painel é procurado em `WEB_DIR` e, se não definido, em `apps/frontend/dist`.
No deploy da Hostinger, veja a seção 5 do [DEPLOY.md](DEPLOY.md).

## Comandos

```bash
npm run build           # compila backend, worker e frontend
npm run db:migrate      # aplica as migrations
npm run seed            # cria o primeiro Super Admin
npm test -w @agrogestor/backend   # testes unitários do backend
```
