# Integração com o sms-recall (API /v1, uso interno) — guia para o time e para o agente de código

> **Para o agente (Claude/Codex) que for implementar:** este arquivo é a fonte de verdade da integração.
> O contrato abaixo foi tirado do código do `sms-recall` (`src/rotas/v1.ts`, `src/rotas/openapi.ts`,
> `src/worker/notificador.ts`). Siga a seção **Checklist de implementação** na ordem, e não invente campos:
> o contrato de máquina está em `GET /v1/openapi.json` e a página humana em `GET /v1/docs`.

## 1. O que é

O `sms-recall` envia SMS pelos **chips da empresa** (celulares Android com o app sms-gate), a partir de um mini PC
na rede interna. Sistemas e times **internos** pedem o envio por uma API HTTP (uso só na rede da empresa).

- **Assíncrono:** o pedido entra numa fila e a API responde `202` na hora. O SMS sai quando houver um chip livre,
  dentro da janela de envio (08:00–20:00, horário de Brasília) e respeitando a cota diária de cada chip.
- **Nunca envia em dobro:** com `Idempotency-Key`, repetir o pedido devolve a mesma mensagem.
- **Status final** chega por **webhook** (POST assinado) ou por **consulta** (`GET`).

## 2. Endereço e acesso

| Item | Valor |
|---|---|
| Base (rede interna) | `http://RECALL-0169:3000` (IP `192.168.172.214`) |
| Autenticação | header `X-Api-Key: sms_...` (uma chave por time; criada por um administrador na tela **Times (API)**) |
| Formato | JSON (`Content-Type: application/json`), camelCase, datas ISO 8601 em UTC |
| Erros | sempre `{ "codigo": "...", "mensagem": "...", "detalhes": {} }` (mensagem em PT-BR, pode ir para o usuário) |
| Correlação | toda resposta traz `X-Request-Id`; mande o seu `X-Request-Id` para cruzar logs |
| Documentação | `GET /v1/docs` (humana) · `GET /v1/openapi.json` (máquina) — as duas sem chave |

Configuração no sistema cliente (nunca no código nem no Git):
```
SMS_API_URL=http://RECALL-0169:3000
SMS_API_KEY=sms_...            # cofre de segredos / .env
```

## 3. Rede: uso só interno

A API é **só para sistemas e pessoas na rede interna da empresa** (decisão de 11/11/2026: nenhum sistema externo, como o
CRM na AWS, vai usar). Não há túnel nem exposição para a internet.

- Quem chama precisa estar na **rede da empresa** (cabo ou Wi-Fi interna). A Wi-Fi de **visitantes** não enxerga o mini PC.
- O **webhook** só pode apontar para endereços da rede interna (o mini PC não sai para a internet: o proxy da empresa bloqueia).
- Se um dia algum sistema externo precisar usar, é uma mudança de arquitetura (túnel + exceção de proxy) a decidir antes.

## 4. Endpoints

### 4.1 `POST /v1/mensagens` — enviar uma mensagem

Headers: `X-Api-Key` (obrigatório), `Idempotency-Key` (**use sempre**: até 100 caracteres, único do seu lado).

```json
{ "telefone": "51999991234", "texto": "Ola {nome}, aqui e da Recall.", "nome": "Ana" }
```
- `telefone`: celular brasileiro com DDD; aceita `51999991234`, `(51) 99999-1234`, `+5551999991234`.
- `texto`: até 640 caracteres; `{nome}` é trocado por `nome`. **Sem acento** sai mais barato (GSM-7: 160 por SMS; com acento, UCS-2: 70).
- `nome`: opcional.

Respostas:
- `202` — criada. `200` — já existia com essa `Idempotency-Key` (mesmo corpo; **não** cria outra).
- `401 CHAVE_INVALIDA` · `422 DADOS_INVALIDOS | TELEFONE_INVALIDO | TELEFONE_BLOQUEADO | IDEMPOTENCY_KEY_INVALIDA` · `429 COTA_DO_TIME`.

Corpo da mensagem (igual em todas as rotas de mensagem):
```json
{
  "id": 42,
  "status": "PENDENTE",
  "rotulo": "Na fila",
  "chaveIdempotencia": "cobranca-123",
  "disparoId": null,
  "criadoEm": "2026-11-11T15:00:00.000Z",
  "atualizadoEm": "2026-11-11T15:00:00.000Z",
  "entregueEm": null,
  "detalhe": null
}
```

### 4.2 `GET /v1/mensagens/{id}` — status de uma mensagem
Mesmo corpo acima. Só enxerga mensagens do próprio time (outro time → `404 NAO_ENCONTRADA`).

### 4.3 `GET /v1/mensagens` — lista paginada
Query: `status`, `de`, `ate` (`AAAA-MM-DD`, Brasília; padrão hoje; máx. 92 dias), `page` (1), `size` (50, máx. 200).
Resposta: `{ "data": [mensagem], "page", "size", "total", "periodo": { "de", "ate" } }`.

### 4.4 `GET /v1/metricas` — números do time
Query: `de`, `ate` (padrão hoje; máx. 92 dias).
```json
{
  "periodo": { "de": "2026-11-01", "ate": "2026-11-11" },
  "resumo": { "total": 120, "naFila": 3, "enviando": 0, "aguardando": 2, "entregues": 110, "falhas": 4, "canceladas": 0, "incertas": 1 },
  "porStatus": { "ENTREGUE": { "quantidade": 108, "rotulo": "Entregue" } },
  "taxaEntrega": 96.5,
  "tempoMedioEntregaSegundos": 42,
  "porDia": [ { "dia": "2026-11-10", "total": 60, "entregues": 57, "falhas": 2, "naFila": 0, "enviando": 0, "aguardando": 0, "canceladas": 0, "incertas": 1 } ],
  "cotaHoje": { "usadas": 60, "cota": 1000, "restante": 940 }
}
```
`taxaEntrega` = entregues ÷ (entregues + falhas) em %, `null` sem finalizadas. `entregues` inclui `SEM_CONFIRMACAO`.

### 4.5 Lote: `POST /v1/disparos`, `GET /v1/disparos/{id}`, `POST /v1/disparos/{id}/cancelar`
```json
{ "nome": "Cobranca novembro",
  "contatos": [ { "telefone": "51999991234", "nome": "Ana" }, { "telefone": "51988887777", "mensagem": "Texto proprio" } ],
  "mensagens": ["Ola {nome}, aqui e da Recall.", "{nome}, podemos falar hoje?"],
  "intervaloMinSegundos": 45, "intervaloMaxSegundos": 80 }
```
Até 500 contatos; roleta de até 20 textos; repetidos entram uma vez; bloqueados ficam de fora (`bloqueados`).
Resposta `202`: resumo `{ id, nome, status, time, criadoPor, total, abordagens, duplicados, bloqueados, intervaloMinMs, intervaloMaxMs, contagem: { total, naFila, enviando, aguardando, entregues, falhas, canceladas, incertas }, criadoEm, terminadoEm }`.
Cancelar: `202`, ou `409 JA_TERMINOU`.

## 5. Status da mensagem

| status | final? | o que o cliente faz |
|---|---|---|
| `PENDENTE`, `RESERVADA`, `ENVIANDO`, `ACEITA`, `ENVIADA` | não | esperar (webhook ou consulta) |
| `ENTREGUE` | sim | marcar como entregue |
| `SEM_CONFIRMACAO` | sim | tratar como enviado (saiu, operadora não confirmou em 24 h) |
| `FALHOU` | sim | não saiu depois de 3 tentativas; ver `detalhe`; decidir no negócio se pede de novo (com **nova** Idempotency-Key) |
| `INCERTA` | sim | **pode ter saído**. NÃO reenviar automaticamente; a TI confere pela tela Revisão |
| `CANCELADA` | sim | cancelada antes de sair (disparo cancelado ou telefone bloqueado) |

## 6. Regras para o cliente (obrigatórias)

1. **Idempotency-Key em todo POST**, determinística a partir do seu evento: ex. `crm-negocio-<id>-cobranca-<AAAAMMDD>`.
   Guarde-a junto com o `id` devolvido.
2. **Repetição:** timeout, erro de rede ou `5xx` → repita **com a mesma** Idempotency-Key (backoff 2 s, 10 s, 60 s).
   `4xx` → **não repita**; corrija ou registre o erro (`429`: tente no dia seguinte).
3. **Acompanhar:** prefira o webhook. Sem webhook (ou como rede de segurança), consulte `GET /v1/mensagens/{id}`
   a cada **30–60 s** só enquanto não for final, e pare após status final. Para muitas mensagens, use a lista
   `GET /v1/mensagens?status=...` em vez de uma consulta por id.
4. **Nunca** logue a chave nem o texto completo da mensagem; telefone mascarado nos logs.
5. Janela e cota: pedido fora da janela é aceito (`202`) e sai quando ela abrir — não trate como erro.

## 7. Webhook (avisos de status)

Cadastre a URL no time (tela **Times (API)** → Editar → Webhook). Quando a mensagem chega a status **final**,
o sms-recall faz:

```
POST <sua URL>
Content-Type: application/json
X-SMS-Assinatura: <hex>          HMAC-SHA256 do corpo CRU, chave = SHA-256 (hex) da sua X-Api-Key
X-SMS-Aviso-Id: <número>

{ "evento": "mensagem.status", "id": 42, "chaveIdempotencia": "cobranca-123", "disparoId": null,
  "status": "ENTREGUE", "rotulo": "Entregue", "entregueEm": "2026-11-11T15:03:10.000Z", "avisoId": 128 }
```
- Responda **2xx** rápido (processe depois). **4xx** não é repetido; **5xx/timeout (10 s)** é repetido até 5 vezes
  (30 s, 2 min, 10 min, 30 min, 1 h).
- **Confira a assinatura com o corpo cru, antes do parse.** Ignore `avisoId` repetido (pode chegar 2 vezes).

## 8. Código de referência (TypeScript, Node 18+)

### 8.1 Cliente
```ts
// sms-client.ts
export type StatusSms = 'PENDENTE' | 'RESERVADA' | 'ENVIANDO' | 'ACEITA' | 'ENVIADA' | 'ENTREGUE' | 'FALHOU' | 'INCERTA' | 'CANCELADA' | 'SEM_CONFIRMACAO';
export const FINAIS: ReadonlySet<StatusSms> = new Set(['ENTREGUE', 'FALHOU', 'INCERTA', 'CANCELADA', 'SEM_CONFIRMACAO']);
export interface MensagemSms { id: number; status: StatusSms; rotulo: string; chaveIdempotencia: string | null; disparoId: number | null; criadoEm: string; atualizadoEm: string; entregueEm: string | null; detalhe: string | null }
export class ErroSms extends Error { constructor(public status: number, public codigo: string, mensagem: string) { super(mensagem); } }

const URL_BASE = process.env.SMS_API_URL!;
const CHAVE = process.env.SMS_API_KEY!;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function chamar<T>(metodo: 'GET' | 'POST', caminho: string, corpo?: unknown, idem?: string): Promise<T> {
  for (const [i, pausa] of [0, 2_000, 10_000, 60_000].entries()) {
    if (pausa) await espera(pausa);
    try {
      const r = await fetch(URL_BASE + caminho, {
        method: metodo,
        headers: { 'X-Api-Key': CHAVE, 'Content-Type': 'application/json', ...(idem ? { 'Idempotency-Key': idem } : {}) },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok) return json as T;
      if (r.status < 500) throw new ErroSms(r.status, json.codigo ?? 'ERRO', json.mensagem ?? `HTTP ${r.status}`); // 4xx: não repete
      if (i === 3) throw new ErroSms(r.status, json.codigo ?? 'ERRO_INTERNO', json.mensagem ?? `HTTP ${r.status}`);
    } catch (e) {
      if (e instanceof ErroSms) throw e;
      if (i === 3) throw e; // rede/timeout: repete com a MESMA Idempotency-Key
    }
  }
  throw new Error('inalcançável');
}

export const enviarSms = (p: { telefone: string; texto: string; nome?: string }, idempotencyKey: string) =>
  chamar<MensagemSms>('POST', '/v1/mensagens', p, idempotencyKey);
export const consultarSms = (id: number) => chamar<MensagemSms>('GET', `/v1/mensagens/${id}`);
export const metricasSms = (de?: string, ate?: string) =>
  chamar<Record<string, unknown>>('GET', `/v1/metricas${de ? `?de=${de}${ate ? `&ate=${ate}` : ''}` : ''}`);
```

### 8.2 Receber o webhook (Fastify)
```ts
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const chaveHmac = createHash('sha256').update(process.env.SMS_API_KEY!).digest('hex');
function assinaturaValida(corpoCru: string, recebida: string | undefined): boolean {
  if (!recebida) return false;
  const esperada = createHmac('sha256', chaveHmac).update(corpoCru).digest('hex');
  return esperada.length === recebida.length && timingSafeEqual(Buffer.from(esperada), Buffer.from(recebida));
}

// Precisa do corpo CRU: registre o parser de JSON como string nesta rota/plugin.
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => done(null, body));
app.post('/v1/integracoes/sms/webhook', async (req, reply) => {
  const cru = req.body as string;
  if (!assinaturaValida(cru, req.headers['x-sms-assinatura'] as string | undefined)) return reply.code(401).send();
  const aviso = JSON.parse(cru) as { avisoId: number; id: number; chaveIdempotencia: string | null; status: string; entregueEm: string | null };
  // 1) ignorar avisoId já processado  2) atualizar o registro pelo id/chaveIdempotencia  3) responder 2xx rápido
  return reply.code(204).send();
});
```
Teste local do webhook: `node scripts/receber-webhook.mjs` (no repositório do sms-recall).

## 9. Checklist de implementação (para o agente)

- [ ] **Config:** `SMS_API_URL` e `SMS_API_KEY` no `.env`/cofre; nunca no Git. Falha clara na inicialização se faltar.
- [ ] **Cliente** (`8.1`) num módulo único; nenhuma outra parte do sistema chama a API direto.
- [ ] **Persistência:** tabela/colunas para guardar, por envio: `idempotency_key` (UNIQUE), `sms_id`, `status`,
      `status_em`, `detalhe`; status final imutável depois de gravado.
- [ ] **Envio:** gerar a Idempotency-Key determinística a partir do evento de negócio; gravar o pedido antes de chamar
      (para retomar após queda) e o `id` devolvido depois.
- [ ] **Webhook** (`8.2`): rota com assinatura conferida no corpo cru, `avisoId` deduplicado, resposta 2xx rápida.
- [ ] **Rede de segurança:** job que consulta `GET /v1/mensagens/{id}` (ou a lista por status) para envios não finais há
      mais de 10 min — cobre webhook perdido (ex.: o sistema cliente estava fora do ar).
- [ ] **Tratamento de status** conforme a seção 5 (sem reenvio automático de `INCERTA`; `FALHOU` só com nova chave
      e decisão de negócio).
- [ ] **Erros 4xx** mostrados ao usuário com a `mensagem` da API; `429` sinaliza cota do time.
- [ ] **Logs:** `X-Request-Id`, `sms_id`, status; sem chave, sem texto, telefone mascarado.
- [ ] **Testes:** cliente contra um servidor falso (`202`, `200` idempotente, `422`, `429`, `5xx` com repetição e
      mesma chave); webhook com assinatura válida, inválida (`401`) e `avisoId` repetido; job de consulta.
- [ ] **Rede:** o sistema cliente roda na rede interna (seção 3); a URL do webhook é interna.

## 10. Critérios de aceite

1. Dado um evento de negócio, quando o sistema pede o SMS duas vezes (ex.: retry após timeout), então existe **uma**
   mensagem no sms-recall (mesmo `id`) e **um** SMS no celular do destinatário.
2. Dada uma mensagem entregue, quando o webhook chega, então o registro fica `ENTREGUE` com `entregueEm`; um segundo
   aviso igual não muda nada.
3. Dado um webhook com assinatura errada, então a rota responde `401` e nada é alterado.
4. Dado um webhook perdido (sistema cliente fora do ar), quando passam 10 min, então o job de consulta atualiza o status pela API.
5. Dada uma mensagem `INCERTA`, então nada é reenviado automaticamente e o caso fica visível para o time.

## 11. Contato e operação

- Sistema: `http://RECALL-0169:3000` (telas internas) · guia de operação do mini PC: `docs/ATUALIZACAO.md`.
- Chave vazou? Na tela **Times (API)** → **Gerar nova chave** (a anterior para de funcionar na hora).
- Métricas do time a qualquer momento: `GET /v1/metricas`.
