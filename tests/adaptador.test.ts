// Adaptador contra um "celular" HTTP de verdade (servidor local imitando o app sms-gate).
import { type Server, createServer } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { saude } from '../src/smsgate/adaptador.js';

let servidor: Server;
let base = '';
let resposta: { status: number; corpo: unknown } = { status: 200, corpo: {} };

beforeAll(async () => {
  config.simulado = false;
  servidor = createServer((req, res) => {
    res.statusCode = resposta.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(resposta.corpo));
  });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', () => r()));
  const end = servidor.address();
  base = `http://127.0.0.1:${typeof end === 'object' && end ? end.port : 0}`;
});
afterAll(() => {
  config.simulado = true;
  servidor.close();
});
beforeEach(() => {
  resposta = { status: 200, corpo: {} };
});

const ap = () => ({ nome: 'Celular 1', url: base, usuario: 'u', senha: 's' });
const health = (status: string, falhas: number) => ({
  status,
  checks: {
    'battery:level': { status: 'pass', observedValue: 64 },
    'connection:status': { status: 'pass', observedValue: 1 },
    'messages:failed': { status: falhas ? 'fail' : 'pass', observedValue: falhas },
  },
});

describe('saúde do celular', () => {
  it('tudo ok: online, com bateria', async () => {
    resposta = { status: 200, corpo: health('pass', 0) };
    expect(await saude(ap())).toMatchObject({ online: true, bateria: 64, internet: true, detalhe: 'pass' });
  });

  it('HTTP 500 com health válido (SMS falhou na operadora) continua ONLINE, com o aviso', async () => {
    resposta = { status: 500, corpo: health('fail', 1) };
    const s = await saude(ap());
    expect(s.online).toBe(true);
    expect(s.detalhe).toContain('messages:failed=1');
  });

  it('HTTP 500 sem corpo de health é fora do ar', async () => {
    resposta = { status: 500, corpo: { erro: 'x' } };
    expect(await saude(ap())).toMatchObject({ online: false, detalhe: 'respondeu HTTP 500' });
  });

  it('sem resposta é fora do ar', async () => {
    expect(await saude({ ...ap(), url: 'http://127.0.0.1:1' })).toMatchObject({ online: false });
  });
});
