// Outboxes entregues de verdade a um servidor HTTP local: alerta da TI e aviso assinado ao time.
import { createHash } from 'node:crypto';
import { type Server, createServer } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { prisma } from '../src/db.js';
import { registrarEvento } from '../src/servicos/eventos.js';
import { assinar, enviarAlertas, enviarAvisos } from '../src/worker/notificador.js';
import { cenario } from './apoio.js';

let servidor: Server;
let base = '';
let recebidos: { url: string; corpo: string; assinatura?: string }[] = [];
let responder = 200;

beforeAll(async () => {
  servidor = createServer((req, res) => {
    let corpo = '';
    req.on('data', (d) => (corpo += d));
    req.on('end', () => {
      recebidos.push({ url: req.url ?? '', corpo, assinatura: req.headers['x-sms-assinatura'] as string | undefined });
      res.statusCode = responder;
      res.end('{}');
    });
  });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', () => r()));
  const end = servidor.address();
  base = `http://127.0.0.1:${typeof end === 'object' && end ? end.port : 0}`;
});
afterAll(() => servidor.close());
beforeEach(async () => {
  await cenario();
  recebidos = [];
  responder = 200;
});

describe('notificador', () => {
  it('alerta de erro chega ao webhook da TI e fica marcado como enviado', async () => {
    config.alertas.webhookUrl = `${base}/alerta`;
    await registrarEvento({ tipo: 'chip', nivel: 'ERRO', texto: 'Chip 1 saiu da roleta' });
    expect(await enviarAlertas()).toBe(1);
    expect(JSON.parse(recebidos[0]!.corpo).text).toContain('Chip 1 saiu da roleta');
    expect((await prisma.alerta.findFirstOrThrow()).status).toBe('ENVIADO');
  });

  it('sem canal configurado o alerta não fica preso: registra que não havia canal', async () => {
    config.alertas.webhookUrl = '';
    await registrarEvento({ tipo: 'chip', nivel: 'ERRO', texto: 'x' });
    await enviarAlertas();
    expect((await prisma.alerta.findFirstOrThrow()).status).toBe('FALHOU');
  });

  it('aviso ao time vai assinado; 4xx do time não é repetido', async () => {
    const time = await prisma.time.create({ data: { nome: 'CRM', chaveHash: createHash('sha256').update('sms_chave').digest('hex'), chavePrefixo: 'sms_chav', webhookUrl: `${base}/aviso` } });
    const m = await prisma.mensagem.create({ data: { telefone: '+5511999990001', texto: 'oi', timeId: time.id, status: 'ENTREGUE', chaveIdempotencia: 'k1' } });
    await prisma.aviso.create({ data: { mensagemId: m.id, timeId: time.id, statusMensagem: 'ENTREGUE' } });
    expect(await enviarAvisos()).toBe(1);
    const r = recebidos[0]!;
    expect(JSON.parse(r.corpo)).toMatchObject({ id: m.id, chaveIdempotencia: 'k1', status: 'ENTREGUE', rotulo: 'Entregue' });
    expect(r.assinatura).toBe(assinar(r.corpo, time.chaveHash));

    responder = 404;
    await prisma.aviso.create({ data: { mensagemId: m.id, timeId: time.id, statusMensagem: 'ENTREGUE' } });
    await enviarAvisos();
    const ultimo = await prisma.aviso.findFirstOrThrow({ orderBy: { id: 'desc' } });
    expect(ultimo).toMatchObject({ status: 'FALHOU', tentativas: 1 });
  });

  it('time fora do ar (5xx) tenta de novo mais tarde', async () => {
    responder = 503;
    const time = await prisma.time.create({ data: { nome: 'CRM', chaveHash: 'h', chavePrefixo: 'sms_xxxx', webhookUrl: `${base}/aviso` } });
    const m = await prisma.mensagem.create({ data: { telefone: '+5511999990001', texto: 'oi', timeId: time.id, status: 'ENTREGUE' } });
    await prisma.aviso.create({ data: { mensagemId: m.id, timeId: time.id, statusMensagem: 'ENTREGUE' } });
    await enviarAvisos();
    const a = await prisma.aviso.findFirstOrThrow();
    expect(a.status).toBe('PENDENTE');
    expect(a.proximaTentativaEm.getTime()).toBeGreaterThan(Date.now() + 20_000);
  });
});
