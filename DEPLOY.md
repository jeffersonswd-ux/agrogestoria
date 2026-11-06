# Deploy do AgroGestor IA em nuvem

Guia para instalar o sistema em um servidor Linux com Docker, PostgreSQL e Redis.

---

## 1. Preparar o servidor

```bash
# Ubuntu 22.04/24.04
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git curl postgresql-client

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # reconecte o shell após isso
```

Recursos mínimos recomendados: 2 vCPU, 4 GB de RAM e 30 GB de disco SSD.

## 2. Obter o código

```bash
sudo mkdir -p /opt/agrogestor && sudo chown "$USER" /opt/agrogestor
cd /opt/agrogestor
git clone <URL-DO-REPOSITORIO> .
```

## 3. Configurar o ambiente

```bash
cp .env.example .env
nano .env
```

Valores obrigatórios:

| Variável | Como gerar |
|---|---|
| `POSTGRES_PASSWORD` | senha forte do banco |
| `JWT_SECRET` | `openssl rand -hex 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 48` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `SUPERADMIN_EMAIL` | e-mail do administrador da plataforma |
| `SUPERADMIN_PASSWORD` | senha inicial do Super Admin |

Ajuste também `DOMAIN_NAME`, `FRONTEND_URL` e `CORS_ORIGINS` para o seu domínio.

## 4. Instalar

```bash
chmod +x scripts/*.sh
./scripts/install.sh
```

O script constrói as imagens, sobe os containers, aplica as migrations e verifica a saúde.
Para criar o Super Admin:

```bash
./scripts/create-superadmin.sh
```

Anote o e-mail e a senha exibidos. A senha nunca mais será exibida.

## 5. Proxy reverso e HTTPS

O container `frontend` já serve a SPA e encaminha `/api` e `/uploads` ao backend.
Falta apenas expor o domínio com HTTPS. Duas opções:

### Opção A — Caddy (recomendado, certificado automático)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/debian any main" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
seudominio.com.br {
    reverse_proxy 127.0.0.1:8080
    encode gzip
}
```

```bash
sudo systemctl reload caddy
```

### Opção B — Nginx + Certbot

`/etc/nginx/sites-available/agrogestor`:

```nginx
server {
    listen 80;
    server_name seudominio.com.br;
    root /var/www/html;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/agrogestor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d seudominio.com.br
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**PostgreSQL e Redis não devem ser expostos publicamente.** O `docker-compose.yml` já os mantém
internos à rede do Docker. Para administration local, use túnel SSH:

```bash
ssh -L 5432:localhost:5432 -L 6379:localhost:6379 usuario@servidor
```

## 6. Evolution API (WhatsApp)

O WhatsApp roda **no backend**, sem depender de navegador aberto.

1. Instale a Evolution API em um servidor (ou contêiner) acessível.
2. Em **Super Admin → Integrações**, cadastre: nome, URL base e API Key.
3. Ao cadastrar um cliente, selecione o servidor Evolution em **Novo Cliente**.
4. O cliente conecta o WhatsApp em **WhatsApp → Conectar** e escaneia o QR Code.
5. A Evolution API deve entregar webhooks em `EVOLUTION_WEBHOOK_BASE_URL`, que aponta para
   `https://seudominio.com.br/api/webhooks/evolution`. Se usar `EVOLUTION_WEBHOOK_TOKEN`,
   configure o mesmo token no painel da Evolution.

Exemplo de `docker-compose` para a Evolution API (servidor próprio):

```yaml
services:
  evolution:
    image: atendai/evolution-api:v2
    restart: always
    environment:
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgresql://evolution:senha@postgres_evolution:5432/evolution
    ports:
      - '127.0.0.1:8080:8080'
    volumes:
      - evolution_instances:/evolution/instances
```

## 7. OpenAI

Defina `OPENAI_API_KEY` no `.env` e reinicie:

```bash
docker compose up -d --force-recreate backend worker
```

Sem a chave, o sistema funciona normalmente, mas o Assistente IA responde que não está configurado.

## 8. Backup

```bash
./scripts/backup.sh
```

Agende no cron do servidor (diariamente às 02:00):

```bash
crontab -e
# 0 2 * * * /opt/agrogestor/scripts/backup.sh >> /var/log/agrogestor-backup.log 2>&1
```

Copie os arquivos de `./backups` para um armazenamento externo (S3, outra máquina).
Manter apenas o backup na mesma máquina não protege contra perda do disco.

**Restaurar:**

```bash
./scripts/restore.sh ./backups/agrogestor-YYYYMMDD-HHMMSS.sql.gz
```

## 9. Atualizar o sistema

```bash
cd /opt/agrogestor
git pull
docker compose build
docker compose up -d
docker compose exec backend npx prisma migrate deploy
```

## 10. Verificação

```bash
docker compose ps                                    # todos os serviços ativos
curl -s https://seudominio.com.br/api/health         # {"status":"ok",...}
docker compose logs -f backend                       # logs do backend
docker compose logs -f worker                        # logs dos workers
```

## Checklist de produção

- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET` e `ENCRYPTION_KEY` gerados aleatoriamente
- [ ] Senha do Super Admin trocada após o primeiro acesso
- [ ] `POSTGRES_PASSWORD` forte e único
- [ ] HTTPS ativo com certificado válido
- [ ] PostgreSQL e Redis inacessíveis pela internet
- [ ] Backup diário automatizado e cópia externa verificada
- [ ] `EVOLUTION_API_KEY` e `OPENAI_API_KEY` definidos (se forem usados)
- [ ] `CORS_ORIGINS` restrito ao domínio real
