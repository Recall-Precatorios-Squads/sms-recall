// Serviço de SMS · MVP — envio pelos chips de celulares Android com o app sms-gate.
// Telas: Visão geral, Disparos (planilha), Envio avulso, Aparelhos e chips, Logs, Configurações.
// Sem dependências: Node 22+. Estado em memória (some ao reiniciar). Só abre em localhost.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gravarEnv, validar, valoresParaTela } from './config.mjs';
import { dto, evento, eventos, gravarAgora, iniciarPersistencia, log } from './estado.mjs';
import { aplicarEnv, cfg, chipsDoGate, configurado, modo, rotuloChip, saudeAparelhos, testarAparelhos, atualizarGate } from './smsgate.mjs';
import { cancelarDisparo, criarDisparo, detalheDisparo, enviarAvulso, iniciarAtualizador, listarAvulsas, listarDisparos, mensagemPorId, painel, retomarDisparos, LIMITES } from './disparos.mjs';
import * as telas from './web/paginas.mjs';

const RAIZ = join(import.meta.dirname, '..');
const ARQUIVO_ENV = process.env.SMS_MVP_ENV_FILE || join(RAIZ, '.env'); // configurável só para os testes
modo.simular = process.argv.includes('--simular') || process.env.SIMULAR === '1';
const PORT = Number(process.env.PORT ?? 3333);
const HOST = process.env.HOST ?? '127.0.0.1';
const ORIGENS_LOCAIS = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);
const HOSTS_LOCAIS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);

aplicarEnv();

// Estado gravado em disco: sobrevive a um reinício (data/ fica fora do Git).
const PASTA_DADOS = process.env.SMS_MVP_DATA_DIR || join(RAIZ, 'data');
const carregado = iniciarPersistencia(join(PASTA_DADOS, 'estado.json'));

// Erro inesperado: registra nos Logs. Exceção não tratada encerra (o supervisor religa); promessa rejeitada só registra.
process.on('uncaughtException', (e) => {
  log('erro_inesperado', { erro: e.name, mensagem: e.message, pilha: e.stack?.split('\n').slice(0, 4).join(' | ') });
  evento('servico', 'erro', `Erro inesperado no serviço (${e.message}). Ele será reiniciado pelo supervisor, se estiver rodando com ele.`);
  gravarAgora();
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  log('promessa_rejeitada', { erro: e?.name, mensagem: e?.message });
  evento('servico', 'erro', `Erro inesperado numa tarefa em segundo plano (${e?.message ?? e}). O serviço continua.`);
});
for (const sinal of ['SIGINT', 'SIGTERM', 'SIGBREAK']) {
  process.on(sinal, () => {
    evento('servico', 'aviso', 'Serviço encerrado. O estado foi gravado e os disparos em andamento serão retomados na próxima vez.');
    gravarAgora();
    process.exit(0);
  });
}
process.on('exit', () => gravarAgora());

// ── respostas ──

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corpo));
}
function erro(res, status, codigo, mensagem, detalhes = {}) {
  json(res, status, { codigo, mensagem, detalhes });
}
function html(res, conteudo) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
  res.end(conteudo);
}

async function lerCorpo(req, limite = 16_384) {
  let tamanho = 0;
  const partes = [];
  for await (const parte of req) {
    tamanho += parte.length;
    if (tamanho > limite) throw new Error('CORPO_GRANDE');
    partes.push(parte);
  }
  const txt = Buffer.concat(partes).toString('utf8');
  return txt ? JSON.parse(txt) : {};
}

/**
 * Proteção contra CSRF, DNS rebinding e acesso pelo túnel:
 * só a própria máquina (localhost nesta porta) usa as telas e a API; POST só em application/json.
 */
function origemLocalOk(req) {
  if (req.headers['cf-connecting-ip'] || req.headers['cf-ray']) return false;
  if (!HOSTS_LOCAIS.has(req.headers.host ?? '')) return false;
  const origem = req.headers.origin;
  return !origem || ORIGENS_LOCAIS.has(origem);
}

const estaticos = new Map();
async function estatico(res, arquivo, tipo) {
  if (!estaticos.has(arquivo)) estaticos.set(arquivo, await readFile(join(RAIZ, 'public', arquivo), 'utf8'));
  res.writeHead(200, { 'Content-Type': `${tipo}; charset=utf-8`, 'Cache-Control': 'no-cache' });
  res.end(estaticos.get(arquivo));
}

const ctx = () => ({ simulado: modo.simular, configurado: configurado() });

// ── rotas ──

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const m = req.method;
  try {
    if (!origemLocalOk(req)) return erro(res, 403, 'ORIGEM_RECUSADA', 'Este serviço só abre em http://localhost.');
    if (m === 'POST' && !(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json'))
      return erro(res, 415, 'TIPO_INVALIDO', 'Envie o corpo como application/json.');

    // arquivos
    if (m === 'GET' && p === '/tokens.css') return estatico(res, 'tokens.css', 'text/css');
    if (m === 'GET' && p === '/planilha.js') return estatico(res, 'planilha.js', 'text/javascript');
    if (m === 'GET' && p === '/health') return json(res, 200, { ok: true, pid: process.pid });

    // telas
    if (m === 'GET' && p === '/') return html(res, telas.visaoGeral(ctx()));
    if (m === 'GET' && p === '/disparos') return html(res, telas.listaDisparos(ctx()));
    if (m === 'GET' && p === '/disparos/novo') return html(res, telas.novoDisparo({ ...ctx(), limites: LIMITES }));
    const tDisp = p.match(/^\/disparos\/([0-9a-f-]{36})$/);
    if (m === 'GET' && tDisp) return html(res, telas.detalheDisparo({ ...ctx(), id: tDisp[1] }));
    if (m === 'GET' && p === '/avulso') return html(res, telas.envioAvulso(ctx()));
    if (m === 'GET' && p === '/aparelhos') return html(res, telas.aparelhos(ctx()));
    if (m === 'GET' && p === '/logs') return html(res, telas.logs(ctx()));
    if (m === 'GET' && p === '/config') return html(res, telas.configuracoes(ctx()));

    // API · painel, chips, aparelhos
    if (m === 'GET' && p === '/api/painel') return json(res, 200, await painel());
    if (m === 'GET' && p === '/api/chips') {
      const { chips, erros } = await chipsDoGate({ forcar: url.searchParams.has('atualizar') });
      return json(res, 200, { simulado: modo.simular, chips: chips.map((c) => ({ ...c, rotulo: `${rotuloChip(c)} · ${c.telefone}` })), erros });
    }
    if (m === 'GET' && p === '/api/aparelhos') {
      const forcar = url.searchParams.has('atualizar');
      const [saude, { chips, erros }] = await Promise.all([saudeAparelhos({ forcar }), chipsDoGate({ forcar })]);
      return json(res, 200, { simulado: modo.simular, modo: cfg.modo, aparelhos: saude.map((a) => ({ ...a, chips: chips.filter((c) => c.aparelhoId === a.id) })), erros });
    }
    if (m === 'POST' && p === '/api/aparelhos/testar') return json(res, 200, await testarAparelhos());

    // API · envio avulso
    if (m === 'POST' && p === '/api/mensagens') {
      const r = await enviarAvulso(await lerCorpo(req));
      return json(res, r.status, r.corpo);
    }
    if (m === 'GET' && p === '/api/mensagens') return json(res, 200, { data: listarAvulsas() });
    const aMsg = p.match(/^\/api\/mensagens\/([0-9a-f-]{36})$/);
    if (m === 'GET' && aMsg) {
      const msg = mensagemPorId(aMsg[1]);
      if (!msg) return erro(res, 404, 'NAO_ENCONTRADA', 'Mensagem não encontrada.');
      await atualizarGate(msg);
      return json(res, 200, dto(msg));
    }

    // API · disparos
    if (m === 'POST' && p === '/api/disparos') {
      const r = await criarDisparo(await lerCorpo(req, 1_048_576));
      return json(res, r.status, r.corpo);
    }
    if (m === 'GET' && p === '/api/disparos') return json(res, 200, { data: listarDisparos() });
    const aDisp = p.match(/^\/api\/disparos\/([0-9a-f-]{36})$/);
    if (m === 'GET' && aDisp) {
      const d = await detalheDisparo(aDisp[1]);
      return d ? json(res, 200, d) : erro(res, 404, 'NAO_ENCONTRADO', 'Disparo não encontrado.');
    }
    const aCanc = p.match(/^\/api\/disparos\/([0-9a-f-]{36})\/cancelar$/);
    if (m === 'POST' && aCanc) {
      const r = cancelarDisparo(aCanc[1]);
      return json(res, r.status, r.corpo);
    }

    // API · logs
    if (m === 'GET' && p === '/api/eventos') {
      const desde = Number(url.searchParams.get('desde') ?? 0);
      const nivel = url.searchParams.get('nivel');
      const chip = url.searchParams.get('chip');
      const lista = eventos.filter((e) => e.id > desde && (!nivel || e.nivel === nivel) && (!chip || e.chip === chip));
      return json(res, 200, { data: lista.slice(-300), ultimo: eventos.at(-1)?.id ?? 0 });
    }

    // API · configuração
    if (m === 'GET' && p === '/api/config') return json(res, 200, { campos: valoresParaTela(process.env), simulado: modo.simular });
    if (m === 'POST' && p === '/api/config') {
      const { erros, novo, final } = validar(await lerCorpo(req), process.env);
      if (Object.keys(erros).length) return erro(res, 422, 'CONFIG_INVALIDA', 'Confira os campos marcados.', { erros });
      await gravarEnv(ARQUIVO_ENV, final);
      for (const [k, v] of Object.entries(novo)) {
        if (v === '') delete process.env[k];
        else process.env[k] = v;
      }
      aplicarEnv();
      evento('config', 'info', `Configuração dos celulares salva (${Object.keys(novo).length} campo(s)).`);
      return json(res, 200, { mensagem: 'Configuração salva.', campos: valoresParaTela(process.env) });
    }

    return erro(res, 404, 'NAO_ENCONTRADO', 'Página não encontrada.');
  } catch (e) {
    if (e instanceof SyntaxError) return erro(res, 400, 'JSON_INVALIDO', 'O corpo não é um JSON válido.');
    if (e.message === 'CORPO_GRANDE') return erro(res, 413, 'CORPO_GRANDE', 'Arquivo ou corpo grande demais.');
    log('erro_interno', { rota: p, erro: e.name, mensagem: e.message });
    return erro(res, 500, 'ERRO_INTERNO', 'Erro interno.');
  }
});

iniciarAtualizador();
servidor.on('error', (e) => {
  log('servidor_erro', { erro: e.code, mensagem: e.message });
  if (e.code === 'EADDRINUSE') console.error(`\nA porta ${PORT} já está em uso: o serviço já está rodando em outra janela?\n`);
  process.exit(1);
});
servidor.listen(PORT, HOST, () => {
  const volta = carregado.mensagens || carregado.disparos ? ` Histórico recuperado: ${carregado.disparos} disparo(s) e ${carregado.mensagens} mensagem(ns).` : '';
  evento('servico', 'info', `Serviço iniciado ${modo.simular ? 'em modo simulado (nenhum SMS real sai)' : 'em modo real'}, com ${cfg.aparelhos.length} celular(es) configurado(s).${volta}`);
  console.log(`\nServiço de SMS · MVP ${modo.simular ? '(MODO SIMULADO)' : '(modo real)'} — http://localhost:${PORT}/\n`);
  retomarDisparos();
});
