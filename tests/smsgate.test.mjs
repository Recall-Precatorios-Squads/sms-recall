// Modo REAL contra DOIS "celulares falsos" com a API do sms-gate (modo Local).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 3394;
const BASE = `http://localhost:${PORT}`;
const PASTA = mkdtempSync(join(tmpdir(), 'sms-mvp-gate-'));
const recebidos = [];
const estados = new Map();

function celularFalso(nome, porta, usuario, senha, simCards) {
  const authCerta = 'Basic ' + Buffer.from(`${usuario}:${senha}`).toString('base64');
  const srv = http.createServer(async (req, res) => {
    let corpo = '';
    for await (const p of req) corpo += p;
    const json = corpo ? JSON.parse(corpo) : null;
    recebidos.push({ celular: nome, metodo: req.method, url: req.url, auth: req.headers.authorization, corpo: json });
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization !== authCerta) {
      res.statusCode = 401;
      return res.end('{}');
    }
    if (req.method === 'GET' && req.url === '/device') return res.end(JSON.stringify([{ id: `dev-${nome}`, name: nome, simCards }]));
    if (req.method === 'GET' && req.url === '/health')
      return res.end(JSON.stringify({ status: 'pass', version: '1.78.2', checks: { 'battery:level': { observedValue: 77 }, 'battery:charging': { observedValue: 5 }, 'connection:status': { observedValue: 1 }, 'messages:failed': { observedValue: 0 } } }));
    if (req.method === 'POST' && req.url === '/message') {
      estados.set(json.id, 'Pending');
      res.statusCode = 202;
      return res.end(JSON.stringify({ id: json.id, state: 'Pending' }));
    }
    const m = req.url.match(/^\/message\/(.+)$/);
    if (req.method === 'GET' && m) {
      const st = estados.get(decodeURIComponent(m[1]));
      if (!st) {
        res.statusCode = 404;
        return res.end('{}');
      }
      return res.end(JSON.stringify({ id: m[1], state: st }));
    }
    res.statusCode = 404;
    res.end('{}');
  });
  return new Promise((r) => srv.listen(porta, '127.0.0.1', () => r(srv)));
}

let cel1, cel2, proc;
before(async () => {
  cel1 = await celularFalso('c1', 3395, 'u1', 's1', [
    { carrierName: 'VIVO', phoneNumber: '+5515999990001', simNumber: 1 },
    { carrierName: 'TIM', phoneNumber: '+5511988880002', simNumber: 2 },
  ]);
  cel2 = await celularFalso('c2', 3396, 'u2', 's2', [{ carrierName: 'fluke', phoneNumber: '+5541977770003', simNumber: 2 }]);
  proc = spawn(process.execPath, ['src/servidor.mjs'], {
    cwd: join(import.meta.dirname, '..'),
    env: {
      ...process.env,
      PORT: String(PORT),
      SMS_MVP_ENV_FILE: join(PASTA, '.env'),
      SMS_MVP_DATA_DIR: join(PASTA, 'data'),
      DISPARO_INTERVALO_MS: '50',
      SMSGATE_MODE: 'local',
      SMSGATE_URL: 'http://127.0.0.1:3395',
      SMSGATE_USER: 'u1',
      SMSGATE_PASSWORD: 's1',
      SMSGATE_2_URL: 'http://127.0.0.1:3396',
      SMSGATE_2_USER: 'u2',
      SMSGATE_2_PASSWORD: 's2',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('servidor não subiu');
});
after(() => {
  proc?.kill();
  cel1?.close();
  cel2?.close();
  rmSync(PASTA, { recursive: true, force: true });
});

const post = (p, body) => fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const envios = () => recebidos.filter((x) => x.metodo === 'POST' && x.url === '/message');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('chips dos dois celulares, com operadora e número mascarado', async () => {
  const { chips, erros } = await (await fetch(`${BASE}/api/chips?atualizar=1`)).json();
  assert.deepEqual(erros, []);
  assert.deepEqual(chips.map((c) => c.rotulo), ['Celular 1 · Chip 1 · VIVO · +55 15 9****-0001', 'Celular 1 · Chip 2 · TIM · +55 11 9****-0002', 'Celular 2 · Chip 2 · fluke · +55 41 9****-0003']);
});

test('aparelhos: saúde de cada celular (bateria, internet) e os chips dele', async () => {
  const a = await (await fetch(`${BASE}/api/aparelhos?atualizar=1`)).json();
  assert.equal(a.aparelhos.length, 2);
  assert.equal(a.aparelhos[0].bateria, 77);
  assert.equal(a.aparelhos[0].internet, true);
  assert.equal(a.aparelhos[0].chips.length, 2);
});

test('chip escolhido vai para o celular certo, com Basic Auth, E.164, simNumber e o nosso id', async () => {
  const antes = envios().length;
  const r = await post('/api/mensagens', { telefone: '(15) 99729-1234', texto: 'Teste real', chip: 'a2:2' });
  assert.equal(r.status, 202);
  const msg = await r.json();
  const e = envios()[antes];
  assert.equal(e.celular, 'c2');
  assert.equal(e.auth, 'Basic ' + Buffer.from('u2:s2').toString('base64'));
  assert.deepEqual(e.corpo.phoneNumbers, ['+5515997291234']);
  assert.equal(e.corpo.simNumber, 2);
  assert.equal(e.corpo.id, msg.id);
  estados.set(msg.id, 'Delivered');
  await esperar(2_100);
  assert.equal((await (await fetch(`${BASE}/api/mensagens/${msg.id}`)).json()).status, 'Delivered');
});

test('disparo de 5: roleta passa pelos 3 chips e pelos textos, um por vez', async () => {
  const antes = envios().length;
  const contatos = ['5511999991001', '5511999991002', '5511999991003', '5511999991004', '5511999991005'].map((t, i) => ({ linha: i + 2, telefone: t, nome: `Pessoa ${i + 1}` }));
  const r = await post('/api/disparos', { contatos, mensagens: ['A {nome}', 'B {nome}'] });
  assert.equal(r.status, 202);
  const d = await r.json();
  for (let i = 0; i < 60 && envios().length - antes < 5; i++) await esperar(50);
  const lote = envios().slice(antes);
  assert.equal(lote.length, 5);
  assert.deepEqual(lote.map((e) => e.corpo.textMessage.text), ['A Pessoa 1', 'B Pessoa 2', 'A Pessoa 3', 'B Pessoa 4', 'A Pessoa 5']);
  const chips = lote.map((e) => `${e.celular}:${e.corpo.simNumber}`);
  assert.equal(new Set(chips.slice(0, 3)).size, 3, `os 3 primeiros usam os 3 chips: ${chips.join(', ')}`);
  for (const m of (await (await fetch(`${BASE}/api/disparos/${d.id}`)).json()).mensagens) estados.set(m.id, 'Delivered');
  await esperar(2_100);
  const det = await (await fetch(`${BASE}/api/disparos/${d.id}`)).json();
  assert.equal(det.contagem.entregues, 5);
});

test('celular fora do ar: os chips dele saem da roleta e o log avisa', async () => {
  cel2.close();
  await esperar(100);
  const { chips, erros } = await (await fetch(`${BASE}/api/chips?atualizar=1`)).json();
  assert.equal(chips.length, 2);
  assert.equal(erros[0].aparelho, 'Celular 2');
  const { data } = await (await fetch(`${BASE}/api/eventos?nivel=aviso`)).json();
  assert.ok(data.some((e) => e.texto.includes('Celular 2 não respondeu')));
});

test('testar conexão não envia SMS', async () => {
  const antes = envios().length;
  const c = await (await post('/api/aparelhos/testar')).json();
  assert.match(c.mensagem, /Celular 1: conectado/);
  assert.equal(envios().length, antes);
});
