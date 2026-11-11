// O serviço morre no meio de um disparo (como hoje): ao voltar, retoma o que faltava,
// não reenvia o que já saiu, e o histórico continua lá.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 3397;
const BASE = `http://localhost:${PORT}`;
const PASTA = mkdtempSync(join(tmpdir(), 'sms-mvp-ret-'));
let proc;

async function subir() {
  proc = spawn(process.execPath, ['src/servidor.mjs', '--simular'], {
    cwd: join(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(PORT), SMS_MVP_ENV_FILE: join(PASTA, '.env'), SMS_MVP_DATA_DIR: join(PASTA, 'data') },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('servidor não subiu');
}
function derrubar() {
  // Morte "na marra", sem aviso (como o processo que caiu hoje): não roda o código de saída.
  return new Promise((r) => {
    proc.once('exit', r);
    proc.kill('SIGKILL');
  });
}
after(async () => {
  if (proc && proc.exitCode === null) await derrubar();
  rmSync(PASTA, { recursive: true, force: true });
});
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('derrubado no meio do disparo: volta, retoma o que faltava e não reenvia o que saiu', async () => {
  await subir();
  const contatos = Array.from({ length: 6 }, (_, i) => ({ linha: i + 2, telefone: `551199999300${i}`, nome: `P${i}` }));
  const r = await fetch(`${BASE}/api/disparos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Retomada', contatos, mensagens: ['Oi {nome}'], intervaloSegundos: 1 }) });
  assert.equal(r.status, 202);
  const { id } = await r.json();
  await esperar(2_500); // saem umas 3
  const antes = await (await fetch(`${BASE}/api/disparos/${id}`)).json();
  const saidasAntes = antes.mensagens.filter((m) => m.status !== 'CRIADA').length;
  assert.ok(saidasAntes >= 1 && saidasAntes < 6, `antes de derrubar saíram ${saidasAntes}`);
  await derrubar();

  await subir();
  let det;
  for (let i = 0; i < 80; i++) {
    det = await (await fetch(`${BASE}/api/disparos/${id}`)).json();
    if (det.status !== 'ENVIANDO' && det.mensagens.every((m) => m.final)) break;
    await esperar(200);
  }
  assert.equal(det.status, 'CONCLUIDO', 'o disparo terminou depois de retomado');
  assert.equal(det.mensagens.length, 6, 'nenhuma mensagem nova foi criada');
  assert.deepEqual(det.mensagens.map((m) => m.id), antes.mensagens.map((m) => m.id), 'as mesmas mensagens, sem duplicar');
  assert.ok(det.mensagens.every((m) => m.status !== 'CRIADA'), 'nada ficou para trás');
  const incertas = det.mensagens.filter((m) => m.status === 'INCERTA').length;
  assert.ok(incertas <= 1, `no máximo a que estava saindo na hora da queda fica incerta (foram ${incertas})`);
  assert.equal(det.contagem.entregues + incertas, 6);

  const { data } = await (await fetch(`${BASE}/api/eventos`)).json();
  assert.ok(data.some((e) => e.texto.includes('reiniciou no meio do disparo')), 'o log explica a retomada');
  assert.ok(data.some((e) => e.texto.includes('Histórico recuperado')), 'o histórico voltou');
});
