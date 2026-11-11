// Documentação da API /v1 para gente: GET /v1/docs (pública, sem chave). Sem CDN: funciona sem internet.
// O contrato de máquina continua em /v1/openapi.json (importável no Postman/Insomnia).
import { config } from '../config.js';
import { LIMITES } from '../servicos/disparos.js';
import { ROTULOS } from '../servicos/mensagens.js';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const codigo = (s: string): string => `<pre class="cod"><code>${esc(s.trim())}</code></pre>`;

const SIGNIFICADO: Record<string, string> = {
  PENDENTE: 'Na fila, esperando um chip livre, a janela de envio e a cota.',
  RESERVADA: 'Um worker pegou a mensagem (estado de passagem).',
  ENVIANDO: 'Gravado que vai sair agora, pelo chip escolhido.',
  ACEITA: 'O celular aceitou o pedido.',
  ENVIADA: 'Saiu do celular; esperando o relatório da operadora.',
  ENTREGUE: 'A operadora confirmou a entrega. Final.',
  FALHOU: 'Não saiu depois de 3 tentativas. Final.',
  INCERTA: 'O serviço caiu ou o celular não respondeu no meio do envio: PODE ter saído. Nunca é reenviada sozinha. Final.',
  CANCELADA: 'Cancelada antes de sair (disparo cancelado ou telefone bloqueado). Final.',
  SEM_CONFIRMACAO: 'Saiu, mas a operadora não mandou relatório em 24 h. Final.',
};

export function paginaDocs(): string {
  const base = 'http://RECALL-0169:3000';
  const janela = `${config.janela.inicio} às ${config.janela.fim}`;
  const linhasStatus = Object.keys(SIGNIFICADO)
    .map((s) => `<tr><td><code>${s}</code></td><td>${esc(ROTULOS[s as keyof typeof ROTULOS])}</td><td>${esc(SIGNIFICADO[s] ?? '')}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="pt-BR" data-theme="claro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>API de SMS · Documentação</title>
<link rel="stylesheet" href="/public/tokens.css">
<style>
*{box-sizing:border-box}
body{margin:0;background:var(--fundo-pagina);color:var(--texto-primario);font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.45}
.pagina{max-width:1040px;margin:0 auto;padding:var(--space-8) var(--space-4) var(--space-16);display:grid;gap:var(--space-6)}
header{display:grid;gap:var(--space-2)}
.ante{font-size:16px;font-weight:500;color:var(--dourado-700)}
h1{font-size:32px;line-height:1.2;font-weight:700;margin:0}
h2{font-size:15px;line-height:1.2;font-weight:600;margin:0}
h3{font-size:14px;font-weight:600;margin:0}
p{margin:0}
.apoio{color:var(--texto-secundario)}
nav{display:flex;flex-wrap:wrap;gap:var(--space-2)}
nav a{font-size:12px;font-weight:500;color:var(--acao-texto);text-decoration:none;border:1px solid var(--borda-neutra);border-radius:var(--radius-full);padding:var(--space-1) var(--space-3);background:var(--superficie-neutra)}
.card{background:var(--superficie);border:1px solid var(--borda-padrao);border-radius:var(--radius-lg);box-shadow:var(--sombra-card);padding:var(--space-5);display:grid;gap:var(--space-4);min-width:0;scroll-margin-top:var(--space-4)}
.endpoint{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center}
.metodo{font-size:11px;font-weight:600;border-radius:var(--radius-full);padding:2px var(--space-2)}
.metodo.post{background:var(--sucesso-fundo);color:var(--sucesso)}
.metodo.get{background:var(--triagem-fundo);color:var(--triagem)}
.rota{font-family:ui-monospace,Consolas,monospace;font-size:14px;font-weight:600}
code{font-family:ui-monospace,Consolas,monospace;font-size:12px;background:var(--superficie-sutil);border-radius:var(--radius-xs);padding:1px var(--space-1)}
pre.cod{margin:0;background:var(--superficie-sutil);border:1px solid var(--borda-padrao);border-radius:var(--radius-md);padding:var(--space-3);overflow-x:auto;font-size:12px;line-height:1.5}
pre.cod code{background:none;padding:0}
.tabela{overflow-x:auto;border:1px solid var(--borda-neutra);border-radius:var(--radius-md)}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;vertical-align:top;padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--borda-padrao)}
th{font-size:12px;font-weight:600;text-transform:uppercase;color:var(--texto-secundario);background:var(--superficie-sutil)}
tr:last-child td{border-bottom:0}
.abas{display:grid;gap:var(--space-2)}
.abas details{border:1px solid var(--borda-padrao);border-radius:var(--radius-md);background:var(--superficie)}
.abas summary{cursor:pointer;padding:var(--space-2) var(--space-3);font-weight:500;color:var(--acao-texto)}
.abas details pre.cod{border:0;border-top:1px solid var(--borda-padrao);border-radius:0 0 var(--radius-md) var(--radius-md)}
.alerta{border-radius:var(--radius-md);padding:var(--space-4);background:var(--alerta-fundo);color:var(--alerta-texto)}
.info{border-radius:var(--radius-md);padding:var(--space-4);background:var(--triagem-fundo);color:var(--triagem)}
.grade{display:grid;gap:var(--space-4)}
@media (min-width:760px){.grade.g2{grid-template-columns:repeat(2,minmax(0,1fr))}}
ul{margin:0;padding-left:var(--space-5);display:grid;gap:var(--space-1)}
a{color:var(--acao-texto)}
</style>
</head>
<body>
<div class="pagina">
<header>
  <span class="ante">Serviço de SMS · API v1</span>
  <h1>Como enviar SMS pela API</h1>
  <p class="apoio">Para sistemas e times da empresa (ex.: o CRM) enviarem SMS pelos chips da Recall. O envio é <b>assíncrono</b>: o pedido entra na fila e a API responde na hora; o SMS sai quando houver um chip livre.</p>
  <nav aria-label="Seções">
    <a href="#comecar">Começar</a><a href="#enviar">Enviar uma mensagem</a><a href="#consultar">Consultar</a><a href="#lote">Enviar em lote</a><a href="#metricas">Métricas</a>
    <a href="#status">Status</a><a href="#erros">Erros</a><a href="#webhook">Webhook</a><a href="#limites">Limites</a><a href="/v1/openapi.json">openapi.json</a>
  </nav>
</header>

<section class="card" id="comecar">
  <h2>1. Começar</h2>
  <ul>
    <li><b>Endereço:</b> <code>${base}</code> (rede interna da empresa).</li>
    <li><b>Chave:</b> um administrador cria o seu time na tela <b>Times (API)</b> e te passa a chave (começa com <code>sms_</code>). Ela aparece uma vez só: guarde num cofre de segredos, nunca no código.</li>
    <li>Toda chamada leva o header <code>X-Api-Key: sms_...</code>. Corpo sempre em JSON (<code>Content-Type: application/json</code>).</li>
    <li>Toda resposta traz <code>X-Request-Id</code>. Mande também o seu (<code>X-Request-Id: ...</code>) para cruzar os logs dos dois lados.</li>
  </ul>
  <div class="info">Fluxo: <b>POST</b> a mensagem → recebe <code>202</code> com o <code>id</code> → o SMS sai pelo celular → você acompanha por <b>GET</b> ou recebe o <b>webhook</b> quando chegar a um status final.</div>
</section>

<section class="card" id="enviar">
  <div class="endpoint"><span class="metodo post">POST</span><span class="rota">/v1/mensagens</span></div>
  <h2>2. Enviar uma mensagem</h2>
  <div class="tabela"><table>
    <thead><tr><th>Campo</th><th>Tipo</th><th>Obrigatório</th><th>Descrição</th></tr></thead>
    <tbody>
      <tr><td><code>telefone</code></td><td>texto</td><td>sim</td><td>Celular com DDD. Aceita <code>51999991234</code>, <code>(51) 99999-1234</code> ou <code>+5551999991234</code>.</td></tr>
      <tr><td><code>texto</code></td><td>texto</td><td>sim</td><td>Até ${LIMITES.caracteres} caracteres. <code>{nome}</code> é trocado pelo campo <code>nome</code>. Sem acento sai mais barato (1 SMS a cada 160 caracteres; com acento, a cada 70).</td></tr>
      <tr><td><code>nome</code></td><td>texto</td><td>não</td><td>Nome do contato, usado no <code>{nome}</code>.</td></tr>
    </tbody>
  </table></div>
  <div class="tabela"><table>
    <thead><tr><th>Header</th><th>Obrigatório</th><th>Descrição</th></tr></thead>
    <tbody>
      <tr><td><code>X-Api-Key</code></td><td>sim</td><td>Chave do time.</td></tr>
      <tr><td><code>Idempotency-Key</code></td><td>recomendado</td><td>Identificador único do SEU lado (ex.: <code>cobranca-123</code>, até 100 caracteres). Se a chamada der timeout e você repetir com a mesma chave, a API devolve a mesma mensagem (<code>200</code>) e <b>não manda outro SMS</b>.</td></tr>
    </tbody>
  </table></div>
  <div class="abas">
    <details open><summary>curl</summary>${codigo(`curl -X POST ${base}/v1/mensagens \\
  -H "X-Api-Key: sms_SUA_CHAVE" \\
  -H "Idempotency-Key: cobranca-123" \\
  -H "Content-Type: application/json" \\
  -d '{"telefone":"51999991234","texto":"Ola {nome}, aqui e da Recall.","nome":"Ana"}'`)}</details>
    <details><summary>PowerShell</summary>${codigo(`$chave = "sms_SUA_CHAVE"
$corpo = @{ telefone = "51999991234"; texto = "Ola {nome}, aqui e da Recall."; nome = "Ana" } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri "${base}/v1/mensagens" -ContentType "application/json" -Body $corpo -Headers @{ "X-Api-Key" = $chave; "Idempotency-Key" = "cobranca-123" }
$r.id`)}</details>
    <details><summary>JavaScript (Node 18+)</summary>${codigo(`const r = await fetch('${base}/v1/mensagens', {
  method: 'POST',
  headers: { 'X-Api-Key': process.env.SMS_API_KEY, 'Idempotency-Key': 'cobranca-123', 'Content-Type': 'application/json' },
  body: JSON.stringify({ telefone: '51999991234', texto: 'Ola {nome}, aqui e da Recall.', nome: 'Ana' }),
});
const mensagem = await r.json(); // 202 (nova) ou 200 (já existia com essa Idempotency-Key)`)}</details>
  </div>
  <h3>Resposta <code>202 Accepted</code> (ou <code>200</code> se a Idempotency-Key já existia)</h3>
  ${codigo(`{
  "id": 42,
  "status": "PENDENTE",
  "rotulo": "Na fila",
  "chaveIdempotencia": "cobranca-123",
  "disparoId": null,
  "criadoEm": "2026-11-11T15:00:00.000Z",
  "atualizadoEm": "2026-11-11T15:00:00.000Z",
  "entregueEm": null,
  "detalhe": null
}`)}
</section>

<section class="card" id="consultar">
  <div class="endpoint"><span class="metodo get">GET</span><span class="rota">/v1/mensagens/{id}</span></div>
  <h2>3. Consultar o status</h2>
  <p class="apoio">Devolve o mesmo formato da resposta acima, com o <code>status</code> atual. Só enxerga mensagens do seu time (de outro time responde <code>404</code>). Consulte a cada 15–30 s até um status final, ou use o webhook.</p>
  ${codigo(`curl ${base}/v1/mensagens/42 -H "X-Api-Key: sms_SUA_CHAVE"`)}
</section>

<section class="card" id="lote">
  <div class="endpoint"><span class="metodo post">POST</span><span class="rota">/v1/disparos</span><span class="metodo get">GET</span><span class="rota">/v1/disparos/{id}</span><span class="metodo post">POST</span><span class="rota">/v1/disparos/{id}/cancelar</span></div>
  <h2>4. Enviar em lote</h2>
  <p class="apoio">Até ${LIMITES.contatos} contatos por lote e uma roleta de até ${LIMITES.modelos} textos (cada contato recebe o próximo texto). Telefones repetidos entram uma vez; telefones bloqueados ficam de fora (contados em <code>bloqueados</code>).</p>
  ${codigo(`curl -X POST ${base}/v1/disparos \\
  -H "X-Api-Key: sms_SUA_CHAVE" -H "Content-Type: application/json" \\
  -d '{
    "nome": "Cobranca novembro",
    "contatos": [
      { "telefone": "51999991234", "nome": "Ana" },
      { "telefone": "51988887777", "nome": "Bruno", "mensagem": "Texto proprio so para o Bruno" }
    ],
    "mensagens": ["Ola {nome}, aqui e da Recall.", "{nome}, podemos falar hoje?"],
    "intervaloMinSegundos": 45,
    "intervaloMaxSegundos": 80
  }'`)}
  <h3>Resposta <code>202</code></h3>
  ${codigo(`{
  "id": 7, "nome": "Cobranca novembro", "status": "ENVIANDO", "time": "CRM", "criadoPor": null,
  "total": 2, "abordagens": 2, "duplicados": 0, "bloqueados": 0,
  "intervaloMinMs": 45000, "intervaloMaxMs": 80000,
  "contagem": { "total": 2, "naFila": 2, "enviando": 0, "aguardando": 0, "entregues": 0, "falhas": 0, "canceladas": 0, "incertas": 0 },
  "criadoEm": "2026-11-11T15:00:00.000Z", "terminadoEm": null
}`)}
  <p class="apoio"><code>GET /v1/disparos/{id}</code> devolve esse resumo atualizado. <code>POST /v1/disparos/{id}/cancelar</code> cancela o que ainda não saiu (o que já saiu segue o curso).</p>
</section>


<section class="card" id="metricas">
  <div class="endpoint"><span class="metodo get">GET</span><span class="rota">/v1/metricas</span><span class="metodo get">GET</span><span class="rota">/v1/mensagens</span></div>
  <h2>5. Métricas e lista do seu time</h2>
  <p class="apoio">Quanto o seu time enviou, quanto foi entregue, quanto falhou e quanto ainda está na fila. Só as mensagens do seu time. Período por <code>?de=AAAA-MM-DD&amp;ate=AAAA-MM-DD</code> (horário de Brasília; padrão: hoje; até 92 dias).</p>
  ${codigo(`curl "${base}/v1/metricas?de=2026-11-01&ate=2026-11-11" -H "X-Api-Key: sms_SUA_CHAVE"`)}
  <h3>Resposta</h3>
  ${codigo(`{
  "periodo": { "de": "2026-11-01", "ate": "2026-11-11" },
  "resumo": { "total": 120, "naFila": 3, "enviando": 0, "aguardando": 2, "entregues": 110, "falhas": 4, "canceladas": 0, "incertas": 1 },
  "porStatus": { "ENTREGUE": { "quantidade": 108, "rotulo": "Entregue" }, "FALHOU": { "quantidade": 4, "rotulo": "Falhou" } },
  "taxaEntrega": 96.5,
  "tempoMedioEntregaSegundos": 42,
  "respostas": { "respondidas": 22, "base": 112, "taxaResposta": 19.6, "tempoMedianoRespostaSegundos": 540, "tempoMedioRespostaSegundos": 2280 },
  "porDia": [ { "dia": "2026-11-10", "total": 60, "entregues": 57, "falhas": 2, "naFila": 0, "enviando": 0, "aguardando": 0, "canceladas": 0, "incertas": 1 } ],
  "cotaHoje": { "usadas": 60, "cota": 1000, "restante": 940 }
}`)}
  <ul>
    <li><b>taxaEntrega</b>: entregues ÷ (entregues + falhas), em %. Mensagens ainda na fila ou aguardando não entram.</li>
    <li><b>entregues</b> inclui <code>SEM_CONFIRMACAO</code> (saiu, sem relatório da operadora).</li>
    <li><b>cotaHoje</b>: quanto o seu time já pediu hoje e quanto ainda pode pedir.</li>
    <li><b>respostas</b>: quantos contatos responderam o SMS. <b>taxaResposta</b> = respondidas ÷ mensagens que saíram sem falha (<b>base</b>), em %. <b>tempoMedianoRespostaSegundos</b> é o tempo típico entre a mensagem sair e a 1ª resposta chegar (a média sobe muito com quem responde no dia seguinte). A resposta conta para a última mensagem enviada àquele telefone nos 7 dias anteriores. O celular é lido a cada minuto.</li>
    <li>A resposta de uma mensagem aparece em <code>GET /v1/mensagens/{id}</code>, no campo <code>respostas</code> (<code>[{ id, texto, recebidaEm }]</code>).</li>
  </ul>
  <h3>Quais falharam? Lista paginada</h3>
  ${codigo(`curl "${base}/v1/mensagens?status=FALHOU&de=2026-11-01&ate=2026-11-11&page=1&size=50" -H "X-Api-Key: sms_SUA_CHAVE"
# { "data": [ { "id": 31, "status": "FALHOU", "detalhe": "falhou 3 vez(es); última: ...", ... } ], "page": 1, "size": 50, "total": 4 }`)}
  <p class="apoio">Filtros: <code>status</code> (qualquer um da tabela de status), <code>de</code>, <code>ate</code>, <code>page</code>, <code>size</code> (até 200).</p>
</section>

<section class="card" id="status">
  <h2>6. Status da mensagem</h2>
  <div class="tabela"><table>
    <thead><tr><th>status</th><th>rotulo</th><th>Significa</th></tr></thead>
    <tbody>${linhasStatus}</tbody>
  </table></div>
  <div class="alerta"><b>INCERTA</b> não é falha: pode ter saído. Não reenvie automaticamente do seu lado; a TI confere no celular pela tela Revisão.</div>
</section>

<section class="card" id="erros">
  <h2>7. Erros</h2>
  <p class="apoio">Sempre no formato <code>{ "codigo": "...", "mensagem": "...", "detalhes": {} }</code>. A <code>mensagem</code> é em português e pode ser mostrada para o usuário.</p>
  <div class="tabela"><table>
    <thead><tr><th>HTTP</th><th>codigo</th><th>Quando</th><th>O que fazer</th></tr></thead>
    <tbody>
      <tr><td>401</td><td><code>CHAVE_INVALIDA</code></td><td>Sem <code>X-Api-Key</code>, chave errada, trocada ou time desativado</td><td>Peça a chave nova ao administrador</td></tr>
      <tr><td>422</td><td><code>DADOS_INVALIDOS</code></td><td>Campo faltando ou grande demais</td><td>Corrija o corpo; não repita igual</td></tr>
      <tr><td>422</td><td><code>TELEFONE_INVALIDO</code></td><td>Telefone sem DDD ou fora do padrão brasileiro</td><td>Corrija o número</td></tr>
      <tr><td>422</td><td><code>TELEFONE_BLOQUEADO</code></td><td>O número pediu para sair ou foi bloqueado</td><td>Não envie; atualize o seu cadastro</td></tr>
      <tr><td>422</td><td><code>IDEMPOTENCY_KEY_INVALIDA</code></td><td>Idempotency-Key vazia ou com mais de 100 caracteres</td><td>Use um identificador curto e único</td></tr>
      <tr><td>429</td><td><code>COTA_DO_TIME</code></td><td>Seu time passou da cota do dia</td><td>Tente amanhã ou peça aumento de cota</td></tr>
      <tr><td>404</td><td><code>NAO_ENCONTRADA</code> / <code>NAO_ENCONTRADO</code></td><td>Id inexistente ou de outro time</td><td>Confira o id</td></tr>
      <tr><td>422</td><td><code>PERIODO_INVALIDO</code> / <code>PERIODO_LONGO</code></td><td>Data final antes da inicial, ou mais de 92 dias</td><td>Ajuste o período</td></tr>
      <tr><td>409</td><td><code>JA_TERMINOU</code></td><td>Cancelar um disparo que já terminou</td><td>Nada a fazer</td></tr>
      <tr><td>500</td><td><code>ERRO_INTERNO</code></td><td>Falha do serviço</td><td>Repita com a MESMA Idempotency-Key; mande o <code>requestId</code> para a TI</td></tr>
    </tbody>
  </table></div>
</section>

<section class="card" id="webhook">
  <h2>8. Webhook: ser avisado em vez de perguntar</h2>
  <p class="apoio">Se o seu time tem uma URL de webhook cadastrada, quando a mensagem chega a um status final (<code>ENTREGUE</code>, <code>FALHOU</code>, <code>INCERTA</code>, <code>CANCELADA</code>, <code>SEM_CONFIRMACAO</code>) o serviço faz um <b>POST</b> nela:</p>
  ${codigo(`POST https://seu-sistema/webhooks/sms
Content-Type: application/json
X-SMS-Assinatura: 5f2c...   (HMAC-SHA256 do corpo, em hex)
X-SMS-Aviso-Id: 128

{ "evento": "mensagem.status", "id": 42, "chaveIdempotencia": "cobranca-123", "disparoId": null,
  "status": "ENTREGUE", "rotulo": "Entregue", "entregueEm": "2026-11-11T15:03:10.000Z", "avisoId": 128 }`)}
  <p class="apoio">Quando o contato <b>responde</b> o SMS, chega outro aviso, com o texto da resposta (uma por resposta):</p>
  ${codigo(`{ "evento": "mensagem.respondida", "id": 42, "chaveIdempotencia": "cobranca-123", "disparoId": null,
  "resposta": { "id": 7, "texto": "Tenho interesse, pode me ligar?", "recebidaEm": "2026-11-11T15:12:40.000Z" }, "avisoId": 131 }`)}
  <div class="grade g2">
    <div class="grade">
      <h3>Responda</h3>
      <ul>
        <li><b>2xx</b>: recebido.</li>
        <li><b>4xx</b>: não tentamos de novo (é configuração errada do seu lado).</li>
        <li><b>5xx ou sem resposta em 10 s</b>: tentamos de novo até 5 vezes (30 s, 2 min, 10 min, 30 min, 1 h).</li>
        <li>O mesmo aviso pode chegar 2 vezes: use <code>avisoId</code> para ignorar repetidos.</li>
      </ul>
    </div>
    <div class="grade">
      <h3>Confira a assinatura</h3>
      <p class="apoio">Chave do HMAC = SHA-256 (hex) da sua chave de API. Compare com o corpo <b>cru</b>, antes de fazer o parse.</p>
    </div>
  </div>
  ${codigo(`import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

function assinaturaValida(corpoCru, assinaturaRecebida, chaveDeApi) {
  const chaveHmac = createHash('sha256').update(chaveDeApi).digest('hex');
  const esperada = createHmac('sha256', chaveHmac).update(corpoCru).digest('hex');
  return esperada.length === assinaturaRecebida.length && timingSafeEqual(Buffer.from(esperada), Buffer.from(assinaturaRecebida));
}`)}
</section>

<section class="card" id="limites">
  <h2>9. Limites e regras de envio</h2>
  <div class="tabela"><table>
    <thead><tr><th>Regra</th><th>Valor</th><th>Efeito</th></tr></thead>
    <tbody>
      <tr><td>Janela de envio</td><td>${esc(janela)} (horário de Brasília)</td><td>Fora dela a mensagem é aceita (<code>202</code>) e espera na fila.</td></tr>
      <tr><td>Cota por chip</td><td>${config.cotaDiariaChip} SMS por dia (padrão)</td><td>Com todos os chips na cota, a fila espera o dia seguinte.</td></tr>
      <tr><td>Ritmo por chip</td><td>${config.intervaloApi.minMs / 1000} a ${config.intervaloApi.maxMs / 1000} s entre envios (sorteado)</td><td>Evita bloqueio pela operadora. Mais chips = mais vazão.</td></tr>
      <tr><td>Cota do time</td><td>definida na tela Times</td><td>Passou: <code>429 COTA_DO_TIME</code>.</td></tr>
      <tr><td>Prioridade do time</td><td>0 a 10</td><td>Maior sai antes.</td></tr>
      <tr><td>Texto</td><td>${LIMITES.caracteres} caracteres</td><td>Mensagem longa é cobrada como vários SMS.</td></tr>
      <tr><td>Lote</td><td>${LIMITES.contatos} contatos, ${LIMITES.modelos} textos</td><td>Acima disso: <code>422</code>.</td></tr>
    </tbody>
  </table></div>
  <p class="apoio">Contrato de máquina (para importar no Postman ou Insomnia): <a href="/v1/openapi.json">/v1/openapi.json</a>.</p>
</section>
</div>
</body>
</html>`;
}
