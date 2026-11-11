# sms-recall

Disparo de SMS **pelos chips da empresa**, em celulares Android com o app **SMS Gateway for Android**
([sms-gate.app](https://sms-gate.app)). Sem API de provedor, sem gateway. Roda no **mini PC** com Docker Compose.
TypeScript (strict) · Fastify 5 · Zod · Prisma 6 · PostgreSQL 16 · Traefik 3.6.

- **Operadores** entram com login, enviam a planilha de contatos, escolhem as abordagens (roleta de até 20 textos)
  e o intervalo, e acompanham a entrega de cada mensagem.
- **Outros sistemas e times** (ex.: o CRM) enviam pela **API `/v1`**, com chave própria, cota e prioridade.
- **A TI** cadastra celulares e chips, acompanha a revisão, os bloqueios e os logs, e recebe **alertas**.

## Arquitetura

```
Navegador (rede interna) ─┐
CRM / times (/v1) ─ túnel ─┼─► traefik :PORTA ──► app ×2 (telas, /api, /v1) ──► PostgreSQL
                           │      health check        não envia: grava na fila      ▲  mensagens = FILA
                           │                                                        │  outboxes: alertas, avisos
                           │                          worker ───────────────────────┘
                           │                            │ SKIP LOCKED · janela · cota e ritmo por chip
                           │                            ├──► celular (sms-gate :8080, Wi-Fi) ─► operadora ─► cliente
                           │                            ├──► Telegram / webhook da TI (alertas)
                           │                            └──► webhook de cada time (avisos de status, assinados)
                           └─ backup diário (pg_dump) ─► ./backups
```

| Peça | O que faz |
|---|---|
| **traefik** | Porta de entrada. Distribui entre as réplicas do app e tira do rodízio a que falha no `/health` |
| **app ×2** | Telas, API interna (`/api`, sessão) e API dos times (`/v1`, chave). Grava na fila e responde. **Não envia** |
| **worker** | O único que fala com os celulares. Envia, acompanha a entrega, vigia os celulares, recupera órfãs, entrega alertas e avisos |
| **postgres** | Tudo. A tabela `mensagens` é a fila; `alertas` e `avisos` são outboxes |
| **migrate** | Aplica as migrações e sai |
| **backup** | `pg_dump` diário em `./backups` (14 dias) |
| **tunel** (opcional) | Cloudflare Tunnel para o CRM (na AWS) chegar à `/v1` sem abrir porta no escritório |

## Regras de envio

- **Janela** (`JANELA_ENVIO`, padrão 08:00–20:00): fora dela nada sai; as mensagens esperam na fila.
- **Cota por chip** (`COTA_DIARIA_CHIP`, padrão 167/dia): chip que atingiu a cota para até amanhã. Cada chip pode
  ter a própria (tela *Aparelhos e chips*).
- **Ritmo por chip**: depois de enviar, cada chip espera um tempo **sorteado** entre o mínimo e o máximo do disparo
  (padrão 45 a 80 s). Mais chips = mais vazão.
- **Prioridade**: mensagens de time com prioridade maior saem antes.
- **Nunca envia em dobro**: a mensagem é gravada como `ENVIANDO` **antes** de chamar o celular. Se algo cair no meio,
  ela vira `INCERTA` e **não é reenviada sozinha** (tela *Revisão*).
- **Falha clara** (o celular respondeu que não enviou): volta para a fila e tenta por qualquer chip livre, com espera
  de 30 s, 2 min e 8 min. Depois de 3 tentativas, `FALHOU` (tela *Revisão*: reenviar ou deixar).
- **Chip com 5 falhas seguidas** sai da roleta e gera alerta. **Celular que não responde** sai da roleta sozinho.
- **Bloqueios**: telefone na lista não recebe mais nada; o que dele estava na fila é cancelado.

| Estado | Significa |
|---|---|
| Na fila | Esperando chip livre, janela aberta e cota |
| Enviando | Gravado que vai sair agora |
| Aceita pelo celular / Enviada | Saiu; esperando o relatório da operadora |
| Entregue | A operadora confirmou |
| Falhou | Não saiu depois de 3 tentativas |
| Incerta | Pode ter saído. Confira no celular antes de reenviar |
| Sem confirmação | Saiu, mas a operadora não mandou relatório em 24 h (ou alguém confirmou à mão) |
| Cancelada | O disparo foi cancelado ou o telefone foi bloqueado antes de sair |

## Instalação no mini PC

Requisitos: Linux (Ubuntu Server 24.04 recomendado) com **Docker Engine** e o plugin **Docker Compose**,
cabo de rede, nobreak e a BIOS configurada para ligar sozinha quando a energia voltar.

```bash
git clone https://github.com/OliveiratheDev/sms-recall.git
cd sms-recall
cp .env.example .env
nano .env        # POSTGRES_PASSWORD, APP_SECRET (openssl rand -hex 32), ADMIN_* e, de preferência, TELEGRAM_*
docker compose up -d --build
docker compose ps    # traefik, postgres, app ×2 healthy · migrate exited (0) · worker e backup running
```

Abra `http://<ip-do-mini-pc>:3000`, entre como administrador, cadastre os celulares e os usuários.

`APP_SECRET` **não pode mudar depois**: ele cifra as senhas dos celulares guardadas no banco.

### Alertas (recomendado)

Sem canal configurado, os alertas só ficam nos Logs. Para receber no Telegram:

1. No Telegram, fale com o **@BotFather** → `/newbot` → copie o token para `TELEGRAM_BOT_TOKEN`.
2. Adicione o bot ao grupo da TI, mande uma mensagem e pegue o id do grupo em
   `https://api.telegram.org/bot<TOKEN>/getUpdates` (campo `chat.id`, começa com `-`) → `TELEGRAM_CHAT_ID`.
3. `docker compose up -d worker`.

Também dá para usar `ALERTA_WEBHOOK_URL` (qualquer webhook que receba `{"text": "..."}`: Slack, Google Chat, Teams).
Geram alerta: celular fora do ar, chip pausado por falhas, mensagem incerta, backup com mais de 26 h e todo erro.

## Ligar um celular

1. Instale o **SMS Gateway for Android** e libere SMS, telefone e notificações.
   (Em Xiaomi, a permissão de SMS pode exigir liberar "configurações restritas" pelo ADB.)
2. No app, ligue o **Local Server**. Anote o usuário e a senha.
3. Celular na Wi-Fi da empresa com **IP fixo** (reserva de DHCP). Tire o app da economia de bateria.
4. **Aparelhos e chips** → *Adicionar celular*: `http://<ip-do-celular>:8080` (`CELULAR_URL_PADRAO` já preenche), usuário e senha.
5. **Testar conexão** (não envia SMS): deve mostrar os chips e a bateria.

## API `/v1` para outros sistemas (ex.: CRM)

Contrato completo em `GET /v1/openapi.json`. Na tela **Times (API)** o administrador cria o time e recebe a chave
(mostrada uma vez), com cota diária, prioridade e, se quiser, a URL de webhook.

```bash
curl -X POST http://<mini-pc>:3000/v1/mensagens \
  -H "X-Api-Key: sms_..." -H "Idempotency-Key: cobranca-123" -H "Content-Type: application/json" \
  -d '{"telefone":"51999991234","texto":"Ola {nome}, aqui e da Recall.","nome":"Ana"}'
# 202 {"id":42,"status":"PENDENTE","rotulo":"Na fila",...}   · repetir com a mesma Idempotency-Key → 200, mesma mensagem

curl http://<mini-pc>:3000/v1/mensagens/42 -H "X-Api-Key: sms_..."
```

- `POST /v1/disparos` envia um lote (até 500 contatos, roleta de 20 textos); `GET /v1/disparos/:id`; `POST /v1/disparos/:id/cancelar`.
- Erros: `{ codigo, mensagem, detalhes }` — 401 chave, 422 dados/telefone inválido/bloqueado, 429 cota do time.
- **Webhook do time**: quando a mensagem chega a um estado final, o worker faz `POST` com
  `{evento:"mensagem.status", id, chaveIdempotencia, disparoId, status, rotulo, entregueEm, avisoId}` e o header
  `X-SMS-Assinatura` = HMAC-SHA256 do corpo com a chave = SHA-256 (hex) da chave de API do time. Resposta 2xx confirma;
  4xx não é repetido; erro de rede ou 5xx tenta de novo (até 5 vezes).
- Para o CRM (AWS) chegar ao mini PC: `TUNNEL_TOKEN` no `.env`, `docker compose --profile tunel up -d`, e no painel da
  Cloudflare aponte o hostname para `http://traefik:80` liberando **só `/v1/*`**. As telas ficam na rede interna.

## Operação

| Comando | Para quê |
|---|---|
| `docker compose ps` | O que está rodando e se está saudável |
| `docker compose logs -f worker` | Envio ao vivo (telefone sempre mascarado) |
| `docker compose restart worker` | Reinicia o envio (o que estava saindo vira Incerta; nada duplica) |
| `docker compose up -d --scale worker=2` | Dois workers (seguro: nunca pegam a mesma mensagem) |
| `git pull && docker compose up -d --build` | Atualiza (as migrações rodam sozinhas) |

Restaurar um backup:

```bash
docker compose stop app worker
docker compose exec -T postgres pg_restore -U sms -d sms --clean --if-exists < backups/<arquivo>.dump
docker compose start app worker
```

**Copie `./backups` para fora do mini PC** (disco externo ou um segundo mini PC). Com um segundo mini PC pronto
(Docker instalado, repositório clonado, mesmo `.env`), a volta depois de uma pane é: `docker compose up -d` nele e restaurar o último backup.

## Cuidados

- Texto **sem acento** quando possível: acento muda a codificação e cada SMS passa a ser cobrado como 2.
- Mantenha o intervalo de 45 a 80 s e a cota por chip: é o que evita bloqueio da operadora.
- As telas são para a **rede interna**. Pelo túnel, exponha só `/v1/*`.
- O socket do Docker é montado só-leitura no Traefik (para ele descobrir as réplicas). Não exponha a porta do Traefik na internet.
- Telefone aparece mascarado na tela e nos logs; o texto das mensagens não vai para o log.

## Desenvolvimento

```bash
npm ci
npm run typecheck        # TypeScript strict
npm run build            # dist/
SMSGATE_SIMULADO=1 DATABASE_URL=... APP_SECRET=... node dist/servidor.js   # ensaio: nenhum SMS sai
```

### Testes (35, contra PostgreSQL de verdade)

```bash
docker run -d --name sms-recall-dev-pg -e POSTGRES_DB=sms -e POSTGRES_USER=sms -e POSTGRES_PASSWORD=dev -p 5433:5432 postgres:16-alpine
docker exec sms-recall-dev-pg psql -U sms -d sms -c "CREATE DATABASE sms_teste"
DATABASE_URL=postgresql://sms:dev@localhost:5433/sms_teste npx prisma migrate deploy
npm test
```

Cobrem: dois workers nunca enviam a mesma mensagem, ritmo e cota por chip, janela, prioridade, órfã vira incerta,
nova tentativa, cancelamento, bloqueio, outboxes de alerta e aviso (com servidor HTTP real e assinatura), login com
limite, papéis, trava de origem, revisão, `/v1` com idempotência, cota do time e isolamento entre times.

## Estrutura

```
src/
  app.ts, servidor.ts     telas + /api (Fastify, Zod, sessão, X-Request-Id)
  rotas/v1.ts, openapi.ts API dos times
  worker/                 fila.ts (reservar, enviar, acompanhar, órfãs) · notificador.ts (outboxes) · index.ts (laços)
  smsgate/adaptador.ts    a única peça que conhece o app sms-gate (e o modo simulado)
  servicos/               disparos, mensagens (estados + revisão), aparelhos e chips, cadastros (bloqueios, times), eventos
  auth/ lib/ web/         senha e sessão · telefone, segmentos, cifra, log, tempo · telas (design system Recall)
prisma/                   schema e migrações
scripts/backup.sh         backup diário
```
