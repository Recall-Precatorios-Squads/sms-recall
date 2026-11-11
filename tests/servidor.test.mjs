// Modo SIMULADO: telas, envio avulso, disparo por planilha, cancelamento, logs, configuração e travas.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 3391;
const BASE = `http://localhost:${PORT}`;
const PASTA = mkdtempSync(join(tmpdir(), 'sms-mvp-'));
const ENV_TESTE = join(PASTA, '.env');
let proc;

before(async () => {
  proc = spawn(process.execPath, ['src/servidor.mjs', '--simular'], {
    cwd: join(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(PORT), SMS_MVP_ENV_FILE: ENV_TESTE, SMS_MVP_DATA_DIR: join(PASTA, 'data'), DISPARO_INTERVALO_MS: '100' },
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
  rmSync(PASTA, { recursive: true, force: true });
});

const post = (p, body, headers = {}) => fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body ?? {}) });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('todas as telas e os arquivos carregam', async () => {
  for (const p of ['/', '/disparos', '/disparos/novo', '/avulso', '/aparelhos', '/logs', '/config']) {
    const r = await fetch(BASE + p);
    assert.equal(r.status, 200, p);
    assert.match(r.headers.get('content-type'), /text\/html/, p);
  }
  assert.match(await (await fetch(`${BASE}/tokens.css`)).text(), /--acao-primaria/);
  assert.match(await (await fetch(`${BASE}/planilha.js`)).text(), /window\.Planilha/);
});

test('as telas das APIs de provedor (Zenvia, Comtele) não existem mais', async () => {
  for (const p of ['/api', '/comtele', '/chip']) assert.equal((await fetch(BASE + p)).status, 404, p);
  assert.equal((await post('/zenvia/webhook/x', {})).status, 404);
});

test('envio avulso pela roleta chega a "Entregue"', async () => {
  const r = await post('/api/mensagens', { telefone: '(11) 99999-1234', texto: 'Olá' });
  assert.equal(r.status, 202);
  const m = await r.json();
  assert.equal(m.telefone, '+55 11 9****-1234');
  assert.ok(m.chipRotulo);
  for (let i = 0; i < 40; i++) {
    const s = await (await fetch(`${BASE}/api/mensagens/${m.id}`)).json();
    if (s.final) return assert.equal(s.entregue, true);
    await esperar(150);
  }
  assert.fail('não chegou a Entregue');
});

test('envio avulso: telefone inválido → 422 no formato { codigo, mensagem, detalhes }', async () => {
  const r = await post('/api/mensagens', { telefone: '123', texto: 'x' });
  assert.equal(r.status, 422);
  const c = await r.json();
  assert.equal(c.codigo, 'TELEFONE_INVALIDO');
  assert.ok('mensagem' in c && 'detalhes' in c);
});

test('disparo por planilha: roleta de mensagens, {nome}, repetidos uma vez só, tudo entregue', async () => {
  const contatos = [
    { linha: 2, telefone: '5511999990001', nome: 'Maria' },
    { linha: 3, telefone: '5511999990002', nome: 'João' },
    { linha: 4, telefone: '5511999990001', nome: 'Maria de novo' }, // repetido
    { linha: 5, telefone: '5511999990003', nome: '', mensagem: 'Mensagem própria da linha.' },
  ];
  const r = await post('/api/disparos', { nome: 'Teste', contatos, mensagens: ['Oi {nome}!', 'Olá {nome}.'], intervaloSegundos: 1 });
  assert.equal(r.status, 202);
  const d = await r.json();
  assert.equal(d.contagem.total, 3);
  assert.equal(d.duplicados, 1);
  let det;
  for (let i = 0; i < 60; i++) {
    det = await (await fetch(`${BASE}/api/disparos/${d.id}`)).json();
    if (det.status !== 'ENVIANDO' && det.mensagens.every((m) => m.final)) break;
    await esperar(150);
  }
  assert.equal(det.status, 'CONCLUIDO');
  assert.equal(det.contagem.entregues, 3);
  assert.deepEqual(det.mensagens.map((m) => m.indiceTexto), [1, 2, null], 'roleta de textos; a linha com mensagem própria usa a dela');
  assert.deepEqual(det.mensagens.map((m) => m.nome), ['Maria', 'João', null]);
  const chips = det.mensagens.map((m) => m.chipChave);
  assert.notEqual(chips[0], chips[1], 'roleta de chips alterna');
});

test('disparo: só um por vez; cancelar para o que ainda não saiu', async () => {
  const contatos = Array.from({ length: 6 }, (_, i) => ({ telefone: `551199999100${i}` }));
  const r = await post('/api/disparos', { contatos, mensagens: ['X'], intervaloSegundos: 1 });
  assert.equal(r.status, 202);
  const d = await r.json();
  const outro = await post('/api/disparos', { contatos: [{ telefone: '5511999992000' }], mensagens: ['Y'] });
  assert.equal(outro.status, 409);
  assert.equal((await outro.json()).codigo, 'DISPARO_EM_ANDAMENTO');
  await esperar(300);
  assert.equal((await post(`/api/disparos/${d.id}/cancelar`)).status, 202);
  let det;
  for (let i = 0; i < 40; i++) {
    det = await (await fetch(`${BASE}/api/disparos/${d.id}`)).json();
    if (det.status !== 'ENVIANDO') break;
    await esperar(150);
  }
  assert.equal(det.status, 'CANCELADO');
  assert.ok(det.contagem.canceladas >= 4, `canceladas: ${det.contagem.canceladas}`);
  assert.equal((await post(`/api/disparos/${d.id}/cancelar`)).status, 409);
});

test('disparo: valida planilha, mensagens e intervalo', async () => {
  assert.equal((await post('/api/disparos', { contatos: [], mensagens: ['A'] })).status, 422);
  const ruim = await post('/api/disparos', { contatos: [{ linha: 7, telefone: '123' }], mensagens: ['A'] });
  assert.equal(ruim.status, 422);
  assert.equal((await ruim.json()).detalhes.problemas[0].linha, 7);
  assert.equal((await post('/api/disparos', { contatos: [{ telefone: '5511999993000' }], mensagens: [] })).status, 422, 'sem mensagem nenhuma');
  assert.equal((await post('/api/disparos', { contatos: [{ telefone: '5511999993000' }], mensagens: ['A'], intervaloSegundos: 0 })).status, 422);
  const vinteEUma = Array.from({ length: 21 }, (_, i) => `Texto ${i + 1}`);
  assert.equal((await post('/api/disparos', { contatos: [{ telefone: '5511999993000' }], mensagens: vinteEUma })).status, 422, 'mais de 20 textos na roleta');
  const invertido = await post('/api/disparos', { contatos: [{ telefone: '5511999993000' }], mensagens: ['A'], intervaloMinSegundos: 80, intervaloMaxSegundos: 45 });
  assert.equal(invertido.status, 422, 'mínimo maior que o máximo');
  assert.equal((await invertido.json()).codigo, 'INTERVALO_INVALIDO');
  assert.equal((await post('/api/disparos', { contatos: [{ telefone: '5511999993000' }], mensagens: ['A'], intervaloMinSegundos: 45, intervaloMaxSegundos: 601 })).status, 422, 'máximo acima do limite');
});

test('disparo: intervalo sorteado entre o mínimo e o máximo, com 20 textos na roleta, e cancelamento sem esperar o intervalo', async () => {
  const vinte = Array.from({ length: 20 }, (_, i) => `Abordagem ${i + 1}, {nome}`);
  const contatos = [{ telefone: '5511999994000', nome: 'Ana' }, { telefone: '5511999994001', nome: 'Bia' }, { telefone: '5511999994002', nome: 'Caio' }];
  const r = await post('/api/disparos', { nome: 'Faixa', contatos, mensagens: vinte, intervaloMinSegundos: 45, intervaloMaxSegundos: 80 });
  assert.equal(r.status, 202);
  const d = await r.json();
  assert.equal(d.intervaloMinMs, 45_000);
  assert.equal(d.intervaloMaxMs, 80_000);
  assert.equal(d.modelos, 20);
  await esperar(300); // a 1ª sai na hora; a 2ª está esperando 45–80 s
  assert.equal((await post(`/api/disparos/${d.id}/cancelar`)).status, 202);
  let det;
  for (let i = 0; i < 30; i++) {
    det = await (await fetch(`${BASE}/api/disparos/${d.id}`)).json();
    if (det.status !== 'ENVIANDO') break;
    await esperar(100);
  }
  assert.equal(det.status, 'CANCELADO', 'cancelou em até 3 s, sem esperar os 45 s');
  assert.equal(det.contagem.canceladas, 2);
});

test('painel: números de hoje e cada chip com os seus contadores', async () => {
  const p = await (await fetch(`${BASE}/api/painel`)).json();
  assert.ok(p.hoje.total >= 4);
  assert.equal(p.chips.length, 2);
  assert.ok(p.chips.every((c) => typeof c.hoje.total === 'number'));
  assert.ok(p.ultimosDisparos.length >= 1);
});

test('logs: registram envio, entrega e disparo, sem o texto da mensagem', async () => {
  const { data } = await (await fetch(`${BASE}/api/eventos`)).json();
  const tipos = new Set(data.map((e) => e.tipo));
  for (const t of ['servico', 'envio', 'entrega', 'disparo']) assert.ok(tipos.has(t), `falta evento ${t}`);
  assert.ok(!data.some((e) => e.texto.includes('Oi Maria')), 'o texto da mensagem nunca vai para o log');
  const so = await (await fetch(`${BASE}/api/eventos?nivel=aviso`)).json();
  assert.ok(so.data.every((e) => e.nivel === 'aviso'));
});

test('configuração: salva no .env, nunca devolve a senha, recusa injeção', async () => {
  const r = await post('/api/config', { SMSGATE_URL: 'http://127.0.0.1:8080', SMSGATE_USER: 'sms', SMSGATE_PASSWORD: 'senha-secreta-1234' });
  assert.equal(r.status, 200);
  assert.ok(!JSON.stringify(await r.json()).includes('senha-secreta-1234'));
  assert.match(readFileSync(ENV_TESTE, 'utf8'), /SMSGATE_PASSWORD="senha-secreta-1234"/);
  const inj = await post('/api/config', { SMSGATE_USER: 'x\nSMSGATE_PASSWORD=roubada' });
  assert.equal(inj.status, 422);
  assert.doesNotMatch(readFileSync(ENV_TESTE, 'utf8'), /roubada/);
});

test('travas: outro site (Origin) → 403; sem JSON → 415; vindo do túnel → 403', async () => {
  assert.equal((await post('/api/mensagens', { telefone: '11999991234', texto: 'x' }, { Origin: 'https://malicioso.example' })).status, 403);
  assert.equal((await fetch(`${BASE}/api/mensagens`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
  assert.equal((await fetch(`${BASE}/`, { headers: { 'cf-connecting-ip': '203.0.113.9' } })).status, 403);
});
