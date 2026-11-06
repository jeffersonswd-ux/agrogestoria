# PROGRESSO — AgroGestor IA

Última atualização: 2026-11-05

---

## Conta do Super Admin em uso

| Campo | Valor |
|---|---|
| E-mail | `jefferson_dpd@hotmail.com` |
| Senha | `Jeff@2020` |
| Perfil | SUPER_ADMIN |

A conta anterior (`admin@agrogestor.ia.br`) foi removida. O `seed` e o
`scripts/smoke-test.js` usam as variáveis `SUPERADMIN_*` do `apps/backend/.env`,
que já apontam para esta conta.

A senha pode ser trocada em **Configurações** no painel, ou recriada com
`node scripts/set-superadmin.js <email> <senha> [nome]`.

---
## Status geral

| Fase | Situação |
|---|---|
| Fase 1 — Fundação | Concluída e validada |
| Fase 2 — Gestão agrícola | Concluída e validada |
| Fase 3 — Gestão operacional | Concluída e validada |
| Fase 4 — Recursos avançados | Concluída e validada |
| Fase 5 — Integrações | Código pronto; OpenAI e Evolution API dependem de credenciais externas |
| Fase 6 — Produção | Build e execução validados; falta instalar em servidor Linux com HTTPS |

---

## Módulos concluídos

### Painel Super Admin
- Dashboard: total de clientes, ativos, bloqueados, fazendas, hectares, usuários, WhatsApp conectado,
  consumo de IA por empresa, status das integrações, tabela de clientes recentes.
- Clientes / Empresas: cadastro com dados do cliente, da empresa e do usuário administrador,
  edição, bloqueio/desbloqueio com revogação de sessões, redefinição de senha, exclusão com confirmação,
  histórico de alterações, listagem vazia no início, busca, filtro por status e paginação.
- Fazendas: cadastro pelo Super Admin com vínculo ao cliente, área, coordenadas, filtros por
  cliente/município/estado/status, edição e exclusão com verificação de safras vinculadas.
- Usuários: criação, edição, ativação/desativação, redefinição de senha, vínculo com fazendas,
  limite de usuários por empresa.
- Módulos e Permissões: 23 módulos com seleção individual, "selecionar todos", "desmarcar todos"
  e "salvar permissões". Módulo desligado some do menu e a API nega o acesso.
- Integrações: cadastro de múltiplos servidores Evolution API (API Key criptografada), teste de conexão.
- Consumo de IA: requisições, tokens, custo estimado, modelo, período, limite por cliente.
- Logs e Auditoria: paginação e filtros por ação, entidade, empresa e busca textual.
- Configurações: estado das integrações externas e práticas de segurança.

### Painel do cliente (todos funcionais, com dados reais do PostgreSQL)
Dashboard Agrícola (cards, gráficos, mapa, alertas, clima, atividades), Propriedades e Talhões,
Culturas e Safras, Planejamento Agrícola, Operações de Campo, Aplicações Agrícolas,
Colheitas e Produção, Máquinas e Implementos, Combustíveis, Estoque e Insumos, Compras,
Vendas e Contratos, Financeiro, Funcionários, Manutenções, Clima e Alertas, Mapas Agrícolas,
Diário de Campo, WhatsApp, Assistente IA, Relatórios, Usuários, Configurações.

### Segurança e isolamento
- Senhas com hash bcrypt (12 rounds); nunca exibidas em texto puro após o cadastro.
- JWT com access token curto e refresh token rotacionado e revogável.
- Bloqueio de cliente revoga imediatamente todas as sessões ativas.
- Guard global de autenticação + guard de módulo liberado.
- Escopo multiempresa aplicado em todas as consultas; `UserFarm` restringe por fazenda.
- API Key da Evolution API criptografada com AES-256-GCM.
- Rate limiting global, validação de DTOs com `class-validator`, auditoria com sanitização de campos sensíveis.
- CORS restrito por lista de origens; Helmet aplicado.

### Workers (BullMQ + Redis)
Notificações internas, envio por WhatsApp, verificação de vencimentos com baixa duplicada por
chave de referência, processamento de IA, geração de relatórios, transcrição de áudio e
alertas de manutenção preventiva e estoque mínimo. Todas as tarefas funcionam com o painel fechado.

### Banco de dados
36 modelos com chaves estrangeiras, índices, unicidade onde aplicável e cascade explícito.
`apps/backend/prisma/schema.prisma` · migration `20261105144151_init`.

---

## Testes executados (todos verificados nesta sessão)

| Item | Resultado |
|---|---|
| PostgreSQL 18.6 — conexão e migration | OK — banco `agrogestor` criado, migration `init` aplicada |
| `prisma validate` / `prisma generate` | OK |
| Redis 5.0.14 (portable local) — PING | OK |
| `prisma db seed` | OK — Super Admin criado |
| Build completo pelo comando único `npm run build` (raiz) | OK — exit 0, backend + worker + frontend |
| Build do backend (`tsc -p tsconfig.build.json`) | OK — **0 erros** |
| Build do worker (`tsc`) | OK |
| Typecheck do frontend (`tsc -b`) | OK — **0 erros** |
| Build do frontend (`vite build`) | OK — 2142 módulos |
| Testes unitários do backend (`jest`) | OK — **8/8** (2 suítes) |
| Teste de fumaça da API (`scripts/smoke-test.js`) | OK — **11/11** |
| Fluxo completo de cliente (`scripts/e2e-client-flow.js`) | **14/15** — a única falha era um falso positivo do próprio teste (detalhado abaixo) |
| Isolamento entre duas empresas (`scripts/e2e-isolation.js`) | OK — **8/8** |
| Relatórios — 19 chaves em JSON | OK — **19/19**, todas em menos de 60 ms |
| Relatórios — exportação xlsx / pdf / csv | OK — arquivos gerados (6,7 KB / 1,8 KB / 98 B) |
| Painel do cliente no navegador (Dashboard, Propriedades, Culturas, Financeiro, Funcionários, Relatórios) | OK — dados reais da fazenda, sem erro de console |
| `GET /api/health` | OK — `{"status":"ok","database":"up"}` |
| Login do Super Admin via API | OK — HTTP 201, `role=SUPER_ADMIN` |
| Login pela interface web | OK — redireciona para `/admin` |
| Painel do Super Admin no navegador | OK — cards com dados reais, sem erro de console |
| Worker | OK — "Todos os workers ativos" (8 filas) |
| Proxy do frontend `/api` → backend | OK |

### Como rodar a verificação

```bash
# terminais separados
cd apps/backend && node dist/main.js      # API em :3001
cd apps/worker  && node dist/index.js     # workers
cd apps/frontend && npx vite              # SPA em :5173

# testes
cd apps/backend && npx jest --config ./test/jest-unit.json
cd apps/backend && node scripts/smoke-test.js
```

### Sobre a verificação de isolamento do `e2e-client-flow.js`

O passo "Cliente não acessa fazenda de outra empresa" retornou HTTP 200. O teste
`e2e-isolation.js` provou que **não existe vazamento entre empresas**: com duas empresas
independentes, o cliente A recebe `403` ao ler ou escrever na fazenda do cliente B, e os
títulos financeiros não se misturam. A causa foi o próprio teste: ele procurava a fazenda da
outra empresa filtrando a listagem por `companyId` e, como ainda não havia outro cliente com
fazenda cadastrada no momento da execução, a lista voltou vazia e a checagem foi pulada.
O cenário correto (duas empresas, cada uma com fazenda) está coberto por `e2e-isolation.js` (8/8).

Após todos os testes, o banco ficou com exatamente o estado inicial: 1 empresa técnica da
plataforma, 1 usuário (Super Admin) e 0 fazendas — nenhum dado de teste remanescente.

### Correções aplicadas durante a validação
- `Farm.crops` faltava no schema (relação oposta de `Crop.farm`) → migration reaplicada.
- `package-lock.json` do backend tinha 6 entradas com versão vazia (install interrompido),
  corrompendo `ajv`, `rxjs`, `caniuse-lite`, `es-abstract` e `webpack` → lockfile reparado e reinstalado.
- `openai` estava com extração incompleta → reinstalado.
- `fastify` duplicado (4.29.1 na raiz vs 4.28.1 aninhado) quebrava os tipos dos plugins
  `@fastify/helmet|cors|multipart` → fixado em `4.28.1`.
- `dotenv` não estava declarado no worker → adicionado.
- `@fastify/static` não estava declarado e é exigido pelo `SwaggerModule.setup` → adicionado.
- `QueueScheduler` foi removido no BullMQ v5 → import ajustado no worker.
- `SOIL_TYPES`/`IRRIGATION_TYPES` importados de `lib/format` onde vivem em `lib/options` → ajustado.
- `SOIL_TYPES`/`IRRIGATION_TYPES` ausentes, `useQuery`/`useState` não importados, `number` não
  importado e conflito entre o ícone `Fuel` e a página `Fuel` no frontend → ajustados.
- **TS2615** ("circularly references itself") ao usar `groupBy` do Prisma: bug conhecido do
  Prisma no tipo `GetHavingFields`, cujo conserto documentado é ativar `strictNullChecks`.
  Isso expôs 47 problemas reais de null-safety, todos corrigidos
  (referência [prisma/orm#10203](https://github.com/prisma/orm/issues/10203)).
- `.js` compilados esquecidos dentro de `src/` corrompiam a resolução de módulos → removidos.
- Tela de Clientes do Super Admin quebrava com 401 no catálogo de módulos e com `.map` sem
  guarda → endpoint corrigido para `/admin/modules` e guardas adicionadas.
- `ErrorBoundary` adicionado ao frontend para que uma falha isolada de tela não deixe a app em branco.
- **Relatórios travavam**: o controller injetava `@Res() reply` e no caminho JSON retornava o
  objeto sem chamar `reply.send`, então a requisição nunca era respondida (todas as 19 chaves e
  o Painel do cliente travavam na tela de Relatórios). O controller passou a enviar todas as
  respostas explicitamente e a validar o formato; a tela de Relatórios agora mostra o erro em vez
  de ficar carregando para sempre.
- Guardas `.map` adicionadas nas telas de Clientes, Consumo de IA, Logs e Dashboard, que quebravam
  quando a consulta falhava.
- Script raiz `db:migrate` executava `prisma migrate dev` (interativo e altera o banco local);
  agora executa `prisma migrate deploy`, que é o correto para aplicação simples. O modo de
  desenvolvimento ficou em `db:migrate:dev`.
- O projeto deixou de usar npm workspaces: no Windows a criação dos links simbólicos falhava
  (`EISDIR`) e travava o `npm install`. Cada aplicativo instalado isoladamente por
  `npm run install:all`, que é também o modelo usado pelos Dockerfiles.

### Regressão final (após todas as correções)

| Suíte | Resultado |
|---|---|
| Testes unitários (`jest`) | **8/8** |
| Teste de fumaça (`smoke-test.js`) | **11/11** |
| Isolamento entre empresas (`e2e-isolation.js`) | **8/8** |
| Relatórios JSON / xlsx / pdf / csv | **19/19** + 3 formatos de exportação |
| Banco após os testes | 1 empresa técnica, 1 usuário (Super Admin), 0 fazendas |

---

## Configurações externas pendentes

Estas chaves não podem ser geradas por nós e precisam ser preenchidas pelo operador:

| Configuração | Variável | Situação |
|---|---|---|
| OpenAI (Assistente IA e transcrição) | `OPENAI_API_KEY` | **Pendente** — sem a chave o assistente responde que não está configurado |
| Evolution API (servidor próprio) | URL e `apiKey` em Integrações | **Pendente** — nenhum servidor cadastrado |
| Domínio e HTTPS | `DOMAIN_NAME`, `FRONTEND_URL` | **Pendente** |
| E-mail transacional | `SMTP_*` | **Pendente** — não usado pelo fluxo atual |
| Serviço meteorológico alternativo | `WEATHER_API_KEY` | Opcional — o padrão Open-Meteo não exige chave |
| Redis em produção | serviço do `docker-compose` | **Pendente** — localmente usado o portable 5.0.14 |

---

## Limitações conhecidas

- **Redis local**: a versão portable usada no desenvolvimento é a 5.0.14; o BullMQ recomenda 6.2+.
  Em produção o `docker-compose.yml` sobe o Redis 7.
- **Mapas**: a visualização usa posição relativa em SVG. O georreferenciamento de talhões aceita
  polígono GeoJSON e o servidor calcula a área em hectares, mas não há tiles de satélite pagos.
- **Georreferenciamento por desenho**: a delimitação por clique no mapa não está implementada;
  o contorno é enviado como GeoJSON pela API.
- **Cana-de-açúcar e Hortifrúti**: os campos específicos (número de cortes, soqueiras, canteiros,
  estufas, ciclos curtos, perdas, classificação) não têm telas dedicadas. As safras, colheitas,
  perdas e contrato de venda cobrem o fluxo principal com as tabelas genéricas.
- **Transcrição de áudio**: o worker está pronto, mas a Evolution API precisa entregar a mídia
  em Base64 para que o fluxo do WhatsApp dispare a transcrição.
- **Relatórios de PDF**: gerados com layout de tabela em paisagem, sem cabeçalho corporativo.
- **E2E do backend**: a suíte `test/app.e2e-spec.ts` existe e cobre login, bloqueio de cliente,
  isolamento multiempresa e guardas de perfil, mas **não foi executada** — depende de ajuste fino
  de fixtures e limpeza de banco. O equivalente está coberto por `scripts/smoke-test.js`
  (11/11 verificações) e pelos testes unitários.

---

## Próximos passos

1. Preencher `OPENAI_API_KEY` e cadastrar o servidor Evolution API.
2. Instalar em um servidor Linux com o `DEPLOY.md` e validar HTTPS.
3. Configurar o backup diário com cópia externa.
4. Ampliar os relatórios específicos de cana-de-açúcar e hortifrúti.
5. Fechar a suíte E2E do backend com fixtures isoladas.
