// Supervisor do serviço de SMS:
//   1. sobe o servidor e o religa sozinho se ele cair (espera crescente: 2 s, 4 s, 8 s… até 30 s);
//   2. de 15 em 15 s, confere os celulares no ADB e refaz o redirecionamento de porta quando o cabo volta.
// Rode FORA do Claude/terminal temporário:  iniciar-servico.cmd   ou   npm run servico
// Cada queda e cada porta refeita vão para data/supervisor.log.

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const PASTA_DADOS = process.env.SMS_MVP_DATA_DIR || join(RAIZ, 'data');
const LOG = join(PASTA_DADOS, 'supervisor.log');
mkdirSync(PASTA_DADOS, { recursive: true });

function registrar(texto) {
  const linha = `${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}  ${texto}`;
  console.log(`[supervisor] ${linha}`);
  try {
    appendFileSync(LOG, linha + '\n');
  } catch {}
}

/** Lê só ADB_PATH e ADB_PORTAS do .env (o resto é do servidor, que lê o .env sozinho). */
function configAdb() {
  let env = {};
  try {
    for (const l of readFileSync(join(RAIZ, '.env'), 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*(ADB_PATH|ADB_PORTAS)\s*=\s*"?([^"]*)"?\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  const adb = env.ADB_PATH || process.env.ADB_PATH || join(RAIZ, 'ferramentas', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
  const portas = (env.ADB_PORTAS || process.env.ADB_PORTAS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((x) => {
      const [serial, porta] = x.split(':');
      return { serial, porta: Number(porta) };
    })
    .filter((x) => x.serial && Number.isInteger(x.porta));
  return { adb, portas };
}

// ── 1. o servidor ──
let filho = null;
let parando = false;
let quedasSeguidas = 0;

function subir() {
  const inicio = Date.now();
  // O servidor lê o .env por conta própria a cada subida: uma configuração salva pela tela vale no próximo reinício.
  filho = spawn(process.execPath, ['--env-file-if-exists=.env', 'src/servidor.mjs', ...process.argv.slice(2)], { cwd: RAIZ, stdio: 'inherit' });
  filho.on('exit', (codigo, sinal) => {
    filho = null;
    if (parando) return process.exit(0);
    const durou = (Date.now() - inicio) / 1000;
    quedasSeguidas = durou > 60 ? 1 : quedasSeguidas + 1;
    const espera = Math.min(30, 2 ** quedasSeguidas);
    registrar(`O serviço parou (código ${codigo ?? '-'}${sinal ? `, sinal ${sinal}` : ''}) depois de ${Math.round(durou)} s. Religando em ${espera} s.`);
    setTimeout(subir, espera * 1000);
  });
  registrar(`Serviço iniciado (processo ${filho.pid}).`);
}

for (const sinal of ['SIGINT', 'SIGTERM', 'SIGBREAK']) {
  process.on(sinal, () => {
    if (parando) return;
    parando = true;
    registrar('Encerrando o serviço a pedido.');
    if (filho) filho.kill(sinal === 'SIGBREAK' ? 'SIGTERM' : sinal);
    else process.exit(0);
    setTimeout(() => process.exit(0), 5_000).unref();
  });
}

// ── 2. os celulares no ADB ──
const avisados = new Map(); // serial → 'fora' | 'ok'

/**
 * Roda um comando do ADB e devolve a saída, ou null se falhar.
 * Resolve no FIM do processo (evento "exit"), e não quando a saída fecha: se o comando subir o
 * servidor do ADB, esse servidor herda a saída e ela nunca fecha — com execFile o supervisor travava.
 */
function adb(bin, args) {
  return new Promise((resolve) => {
    let out = '';
    let fim = false;
    const p = spawn(bin, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    const acabar = (v) => {
      if (fim) return;
      fim = true;
      clearTimeout(t);
      resolve(v);
    };
    const t = setTimeout(() => {
      p.kill();
      acabar(null);
    }, 10_000);
    p.stdout.on('data', (d) => (out += d));
    p.on('error', () => acabar(null));
    p.on('exit', (codigo) => setTimeout(() => acabar(codigo === 0 ? out : null), 50));
  });
}

let adbIniciado = false;
let vigiando = false;

async function vigiarCelulares() {
  if (vigiando) return; // nunca duas verificações ao mesmo tempo
  vigiando = true;
  try {
    await verificar();
  } catch (e) {
    registrar(`Erro ao verificar os celulares: ${e.message}`);
  } finally {
    vigiando = false;
  }
}

async function verificar() {
  const { adb: bin, portas } = configAdb();
  if (!portas.length || !existsSync(bin)) return;
  if (!adbIniciado) {
    // Sobe o servidor do ADB separado, sem compartilhar a saída com o supervisor.
    await new Promise((resolve) => {
      const p = spawn(bin, ['start-server'], { windowsHide: true, stdio: 'ignore', detached: true });
      p.on('exit', resolve);
      p.on('error', resolve);
      p.unref();
    });
    adbIniciado = true;
  }
  const lista = await adb(bin, ['devices']);
  if (lista === null) return registrar(`Não consegui rodar o ADB em ${bin}.`);
  const conectados = new Set(lista.split(/\r?\n/).filter((l) => /\tdevice$/.test(l)).map((l) => l.split('\t')[0]));
  const redir = (await adb(bin, ['forward', '--list'])) ?? '';
  for (const { serial, porta } of portas) {
    if (!conectados.has(serial)) {
      if (avisados.get(serial) !== 'fora') registrar(`Celular ${serial} desconectado do cabo (porta ${porta}). Assim que voltar, a porta é refeita sozinha.`);
      avisados.set(serial, 'fora');
      continue;
    }
    const temPorta = redir.split(/\r?\n/).some((l) => l.startsWith(`${serial} tcp:${porta} `));
    if (!temPorta) {
      const ok = (await adb(bin, ['-s', serial, 'forward', `tcp:${porta}`, 'tcp:8080'])) !== null;
      registrar(ok ? `Porta ${porta} refeita para o celular ${serial}.` : `Não consegui refazer a porta ${porta} do celular ${serial}.`);
    } else if (avisados.get(serial) === 'fora') registrar(`Celular ${serial} conectado de novo (porta ${porta}).`);
    avisados.set(serial, 'ok');
  }
}

subir();
// SUPERVISOR_SEM_ADB=1 só para os testes: não mexe nos celulares de verdade.
if (process.env.SUPERVISOR_SEM_ADB !== '1') {
  vigiarCelulares();
  setInterval(vigiarCelulares, 15_000);
}
