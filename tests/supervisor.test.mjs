// O supervisor religa o serviço quando ele morre, e registra a queda no log.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 3398;
const BASE = `http://localhost:${PORT}`;
const PASTA = mkdtempSync(join(tmpdir(), 'sms-mvp-sup-'));
let sup;

after(async () => {
  if (sup && sup.exitCode === null) {
    sup.kill('SIGKILL');
    await new Promise((r) => setTimeout(r, 300));
  }
  // o servidor filho também precisa sair
  try {
    const { pid } = await (await fetch(`${BASE}/health`)).json();
    process.kill(pid, 'SIGKILL');
  } catch {}
  rmSync(PASTA, { recursive: true, force: true });
});

async function esperarSaude(diferenteDe) {
  for (let i = 0; i < 100; i++) {
    try {
      const h = await (await fetch(`${BASE}/health`)).json();
      if (h.ok && h.pid !== diferenteDe) return h.pid;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('o serviço não voltou');
}

test('o serviço morre e o supervisor religa sozinho', async () => {
  sup = spawn(process.execPath, ['src/supervisor.mjs', '--simular'], {
    cwd: join(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(PORT), SMS_MVP_ENV_FILE: join(PASTA, '.env'), SMS_MVP_DATA_DIR: join(PASTA, 'data'), SUPERVISOR_SEM_ADB: '1' },
    stdio: 'ignore',
  });
  const pid1 = await esperarSaude(null);
  process.kill(pid1, 'SIGKILL'); // queda sem aviso
  const pid2 = await esperarSaude(pid1);
  assert.notEqual(pid2, pid1, 'subiu um processo novo');
  const log = readFileSync(join(PASTA, 'data', 'supervisor.log'), 'utf8');
  assert.match(log, /O serviço parou/);
  assert.match(log, /Religando em/);
});
