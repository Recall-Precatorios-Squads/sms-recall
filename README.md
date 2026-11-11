# sms-recall

Disparo de SMS **pelos chips da empresa**, em celulares Android com o app **SMS Gateway for Android**
([sms-gate.app](https://sms-gate.app)). Sem API de provedor, sem gateway. Roda no **mini PC** com Docker Compose.

Os operadores entram com login, enviam a planilha de contatos, escolhem as abordagens (roleta de até 20 textos)
e o intervalo, e acompanham a entrega de cada mensagem. A TI cadastra os celulares e acompanha chips e logs.

## Como funciona

```
Navegador (rede interna) ──► app :3000 (telas + API) ──► PostgreSQL (a tabela mensagens é a fila)
                                                              ▲
                              worker ─────────────────────────┘
                                │  pega a próxima mensagem para cada chip livre (SKIP LOCKED)
                                └──► celular (sms-gate, Wi-Fi :8080) ──► operadora ──► cliente
```

- **app**: telas e API. Grava o disparo e as mensagens como `PENDENTE`. **Não envia.**
- **worker**: o único que fala com os celulares. Para cada chip livre, pega uma mensagem, envia e agenda o
  próximo envio daquele chip para daqui a um tempo **sorteado entre o mínimo e o máximo** do disparo
  (padrão 45 a 80 s). Mais chips = mais vazão.
- **Nunca envia em dobro**: a mensagem é gravada como `ENVIANDO` **antes** de chamar o celular. Se algo cair
  no meio, ela vira `INCERTA` (confira no celular) e **não é reenviada sozinha**.
- **Falha clara** (o celular respondeu que não enviou): volta para a fila e tenta por qualquer chip livre,
  com espera de 30 s, 2 min e 8 min. Depois de 3 tentativas, `FALHOU`.
- **Chip com 5 falhas seguidas** sai da roleta e gera um log de erro. Reative em *Aparelhos e chips*.
- **Celular que não responde** sai da roleta sozinho e volta quando responder (o worker confere a cada 30 s).
- **Backup** do banco todo dia em `./backups` (guarda 14 dias).

| Estado | Significa |
|---|---|
| Na fila | Esperando um chip livre |
| Enviando | Gravado que vai sair agora |
| Aceita pelo celular / Enviada | Saiu; esperando o relatório da operadora |
| Entregue | A operadora confirmou a entrega |
| Falhou | Não saiu depois de 3 tentativas |
| Incerta | O serviço caiu ou o celular não respondeu no envio: pode ter saído. Confira no celular |
| Sem confirmação | Saiu, mas a operadora não mandou relatório em 24 h |
| Cancelada | O disparo foi cancelado antes de ela sair |

## Instalação no mini PC

Requisitos: Linux (Ubuntu Server 24.04 recomendado) com **Docker Engine** e o plugin **Docker Compose**,
cabo de rede, nobreak e a BIOS configurada para ligar sozinha quando a energia voltar.

```bash
git clone https://github.com/OliveiratheDev/sms-recall.git
cd sms-recall
cp .env.example .env
nano .env        # preencha POSTGRES_PASSWORD, APP_SECRET e ADMIN_* (veja abaixo)
docker compose up -d --build
docker compose ps    # postgres healthy, migrate exited (0), app healthy, worker e backup running
```

No `.env`:

- `POSTGRES_PASSWORD`: senha longa do banco.
- `APP_SECRET`: 64 caracteres aleatórios. Gere com
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` ou `openssl rand -hex 32`.
  **Não troque depois**: ele cifra as senhas dos celulares guardadas no banco.
- `ADMIN_EMAIL`, `ADMIN_NOME`, `ADMIN_SENHA` (8+ caracteres): o primeiro administrador, criado na primeira
  subida. Depois, os outros usuários são criados na tela *Usuários*.
- `PORTA`: porta da tela no mini PC (padrão 3000).

Abra `http://<ip-do-mini-pc>:3000`, entre como administrador e cadastre os celulares.

## Ligar um celular

1. Instale o **SMS Gateway for Android** e libere as permissões de SMS, telefone e notificações.
   (Em Xiaomi, a permissão de SMS pode exigir liberar "configurações restritas" pelo ADB.)
2. No app, ligue o **Local Server**. Anote o usuário e a senha.
3. Celular na Wi-Fi da empresa, com **IP fixo** (reserva de DHCP no roteador). Tire o app da economia de bateria.
4. Na tela **Aparelhos e chips** → *Adicionar celular*: nome, `http://<ip-do-celular>:8080`, usuário e senha do app.
5. **Testar conexão** (não envia SMS): deve mostrar os chips e a bateria.

Celular pelo cabo USB em vez de Wi-Fi: rode `adb forward tcp:8080 tcp:8080` no mini PC e use a URL
`http://host.docker.internal:8080`.

## Operação

| Comando (na pasta do projeto) | Para quê |
|---|---|
| `docker compose ps` | O que está rodando e se está saudável |
| `docker compose logs -f worker` | Envio ao vivo (telefone sempre mascarado) |
| `docker compose restart worker` | Reinicia o envio (o que estava saindo vira Incerta, nada duplica) |
| `docker compose up -d --scale worker=2` | Dois workers (seguro: nunca pegam a mesma mensagem) |
| `git pull && docker compose up -d --build` | Atualiza para a versão nova (as migrações rodam sozinhas) |
| `ls backups/` | Backups diários do banco |

Restaurar um backup (para o banco atual, com o sistema parado):

```bash
docker compose stop app worker
docker compose exec -T postgres pg_restore -U sms -d sms --clean --if-exists < backups/<arquivo>.dump
docker compose start app worker
```

**Copie `./backups` para fora do mini PC** (disco externo ou outro mini PC): backup no mesmo disco não salva de disco queimado.

## Cuidados

- Use texto **sem acento** quando possível: acento muda a codificação e cada SMS passa a ser cobrado como 2.
- Chip que dispara rápido demais é bloqueado pela operadora: mantenha o intervalo de 45 a 80 s.
- O sistema é para a **rede interna**. Não exponha a porta 3000 na internet.
- Telefone aparece mascarado na tela e nos logs; o texto das mensagens não vai para o log.

## Desenvolvimento

```bash
npm ci
cp .env.example .env    # para rodar sem Docker, defina DATABASE_URL apontando para um Postgres
SMSGATE_SIMULADO=1 npm start        # ensaio: nenhum SMS sai, os celulares são imitados
SMSGATE_SIMULADO=1 npm run worker
```

### Testes

Precisam de um PostgreSQL com o banco `sms_teste` migrado (padrão `postgresql://sms:dev@localhost:5433/sms_teste`,
ou defina `DATABASE_URL_TESTE`):

```bash
docker run -d --name sms-recall-dev-pg -e POSTGRES_DB=sms -e POSTGRES_USER=sms -e POSTGRES_PASSWORD=dev -p 5433:5432 postgres:16-alpine
docker exec sms-recall-dev-pg psql -U sms -d sms -c "CREATE DATABASE sms_teste"
DATABASE_URL=postgresql://sms:dev@localhost:5433/sms_teste npx prisma migrate deploy
npm test
```

## Estrutura

```
src/
  app.js, servidor.js     telas + API (Fastify, Zod), login e travas de origem
  worker/                 fila: reservar, enviar, acompanhar entrega, recuperar órfãs, fechar disparos
  smsgate/adaptador.js    a única peça que conhece o app sms-gate (e o modo simulado)
  servicos/               disparos, celulares e chips, eventos (log imutável)
  auth/                   senha (scrypt) e sessão por cookie
  lib/                    telefone, segmentos de SMS, cifra, log
  web/                    telas (design system Recall)
prisma/                   schema e migrações
scripts/backup.sh         backup diário
```
