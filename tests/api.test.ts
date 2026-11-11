// API pela porta da frente (fastify.inject): login, papéis, travas, revisão e a API /v1 dos times.
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarApp } from '../src/app.js';
import { gerarHash } from '../src/auth/senha.js';
import { prisma } from '../src/db.js';
import { cenario } from './apoio.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = await criarApp();
});
afterAll(async () => {
  await app.close();
});

async function entrar(email: string, senha: string): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { email, senha } });
  expect(r.statusCode).toBe(200);
  const c = r.cookies.find((x) => x.name === 'sms_sessao');
  return `sms_sessao=${c?.value}`;
}

let admin: string;
let operador: string;
beforeEach(async () => {
  await cenario();
  await prisma.usuario.create({ data: { email: 'admin@teste.local', nome: 'Admin', papel: 'ADMIN', senhaHash: await gerarHash('senha-admin-1') } });
  await prisma.usuario.create({ data: { email: 'oper@teste.local', nome: 'Oper', papel: 'OPERADOR', senhaHash: await gerarHash('senha-oper-1') } });
  admin = await entrar('admin@teste.local', 'senha-admin-1');
  operador = await entrar('oper@teste.local', 'senha-oper-1');
});

describe('telas e /api', () => {
  it('toda resposta traz X-Request-Id, e o que vem de quem chamou é mantido', async () => {
    const r = await app.inject({ method: 'GET', url: '/health', headers: { 'x-request-id': 'abc-123' } });
    expect(r.headers['x-request-id']).toBe('abc-123');
    expect((await app.inject({ method: 'GET', url: '/health' })).headers['x-request-id']).toBeTruthy();
  });

  it('sem login: tela redireciona e API responde 401', async () => {
    expect((await app.inject({ method: 'GET', url: '/disparos' })).statusCode).toBe(302);
    expect((await app.inject({ method: 'GET', url: '/api/painel' })).statusCode).toBe(401);
  });

  it('todas as telas abrem para o admin', async () => {
    for (const url of ['/', '/disparos', '/disparos/novo', '/revisao', '/aparelhos', '/bloqueios', '/logs', '/usuarios', '/times']) {
      const r = await app.inject({ method: 'GET', url, headers: { cookie: admin } });
      expect(r.statusCode, url).toBe(200);
      expect(r.body).toContain('<title>');
    }
  });

  it('operador não administra: usuários, times e celulares são do ADMIN', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/times', headers: { cookie: operador } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/usuarios', headers: { cookie: operador } })).statusCode).toBe(302);
    expect((await app.inject({ method: 'POST', url: '/api/aparelhos', headers: { cookie: operador }, payload: { nome: 'x', url: 'http://1.2.3.4:8080', usuario: 'u', senha: 's' } })).statusCode).toBe(403);
  });

  it('outro site não consegue mudar nada, e só aceita JSON', async () => {
    const outra = await app.inject({ method: 'POST', url: '/api/bloqueios', headers: { cookie: admin, origin: 'http://evil.example', host: 'localhost' }, payload: { telefones: ['51999991234'], motivo: 'x' } });
    expect(outra.statusCode).toBe(403);
    const form = await app.inject({ method: 'POST', url: '/api/bloqueios', headers: { cookie: admin, 'content-type': 'application/x-www-form-urlencoded' }, payload: 'a=1' });
    expect([415, 400]).toContain(form.statusCode);
  });

  it('login: 10 senhas erradas do mesmo IP bloqueiam por um tempo (vale para todas as réplicas)', async () => {
    for (let i = 0; i < 10; i++) expect((await app.inject({ method: 'POST', url: '/api/login', payload: { email: 'x@teste.local', senha: 'errada' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/login', payload: { email: 'admin@teste.local', senha: 'senha-admin-1' } })).statusCode).toBe(429);
    expect(await prisma.tentativaLogin.count()).toBe(10);
  });

  it('painel traz janela, worker, revisão e a cota de cada chip', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/painel', headers: { cookie: operador } });
    const p = r.json();
    expect(p.janela).toMatchObject({ inicio: '08:00', fim: '20:00' });
    expect(p.worker).toMatchObject({ vivo: false });
    expect(p.revisao).toEqual({ falhas: 0, incertas: 0 });
    expect(p.chips[0]).toMatchObject({ cota: 167, cotaAtingida: false, sinal: { nivel: 'ONLINE', barras: 3 } });
  });

  it('revisão: reenviar uma incerta volta para a fila; confirmar que saiu fecha', async () => {
    const [a, b] = await Promise.all([
      prisma.mensagem.create({ data: { telefone: '+5511999990001', texto: 'a', status: 'INCERTA', tentativas: 1 } }),
      prisma.mensagem.create({ data: { telefone: '+5511999990002', texto: 'b', status: 'INCERTA', tentativas: 1 } }),
    ]);
    const lista = (await app.inject({ method: 'GET', url: '/api/revisao?status=INCERTA', headers: { cookie: operador } })).json();
    expect(lista.total).toBe(2);
    expect(lista.data[0].telefone).toMatch(/\*\*\*\*/);
    expect((await app.inject({ method: 'POST', url: `/api/mensagens/${a.id}/reprocessar`, headers: { cookie: operador }, payload: {} })).statusCode).toBe(202);
    expect((await app.inject({ method: 'POST', url: `/api/mensagens/${b.id}/marcar-enviada`, headers: { cookie: operador }, payload: {} })).statusCode).toBe(200);
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('PENDENTE');
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('SEM_CONFIRMACAO');
  });

  it('chip: admin muda a cota do dia', async () => {
    const chip = await prisma.chip.findFirstOrThrow();
    const r = await app.inject({ method: 'PATCH', url: `/api/chips/${chip.id}`, headers: { cookie: admin }, payload: { cotaDiaria: 50 } });
    expect(r.json()).toMatchObject({ cotaDiaria: 50, cotaEfetiva: 50 });
  });
});

describe('API /v1 dos times', () => {
  async function criarTime(cotaDiaria = 1000): Promise<string> {
    const r = await app.inject({ method: 'POST', url: '/api/times', headers: { cookie: admin }, payload: { nome: 'CRM', cotaDiaria, prioridade: 3 } });
    expect(r.statusCode).toBe(201);
    return r.json().chave as string;
  }

  it('sem chave: 401; a documentação é pública', async () => {
    expect((await app.inject({ method: 'POST', url: '/v1/mensagens', payload: { telefone: '51999991234', texto: 'oi' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/v1/openapi.json' })).json().openapi).toBe('3.1.0');
    const docs = await app.inject({ method: 'GET', url: '/v1/docs' });
    expect(docs.statusCode).toBe(200);
    expect(docs.body).toContain('/v1/mensagens');
    expect(docs.body).toContain('X-SMS-Assinatura');
  });

  it('envia com Idempotency-Key: o mesmo pedido duas vezes vira UMA mensagem', async () => {
    const chave = await criarTime();
    const pedido = { method: 'POST' as const, url: '/v1/mensagens', headers: { 'x-api-key': chave, 'idempotency-key': 'cobranca-42' }, payload: { telefone: '(51) 99999-1234', texto: 'Ola {nome}', nome: 'Ana' } };
    const r1 = await app.inject(pedido);
    const r2 = await app.inject(pedido);
    expect(r1.statusCode).toBe(202);
    expect(r2.statusCode).toBe(200);
    expect(r2.json().id).toBe(r1.json().id);
    const m = await prisma.mensagem.findUniqueOrThrow({ where: { id: r1.json().id } });
    expect(m).toMatchObject({ texto: 'Ola Ana', prioridade: 3, telefone: '+5551999991234' });
    const consulta = await app.inject({ method: 'GET', url: `/v1/mensagens/${m.id}`, headers: { 'x-api-key': chave } });
    expect(consulta.json()).toMatchObject({ id: m.id, status: 'PENDENTE', rotulo: 'Na fila' });
  });

  it('cota do dia do time e telefone bloqueado são recusados', async () => {
    const chave = await criarTime(1);
    await app.inject({ method: 'POST', url: '/api/bloqueios', headers: { cookie: admin }, payload: { telefones: ['51988887777'], motivo: 'Pediu para sair' } });
    expect((await app.inject({ method: 'POST', url: '/v1/mensagens', headers: { 'x-api-key': chave }, payload: { telefone: '51988887777', texto: 'oi' } })).json().codigo).toBe('TELEFONE_BLOQUEADO');
    expect((await app.inject({ method: 'POST', url: '/v1/mensagens', headers: { 'x-api-key': chave }, payload: { telefone: '51999991234', texto: 'oi' } })).statusCode).toBe(202);
    const r = await app.inject({ method: 'POST', url: '/v1/mensagens', headers: { 'x-api-key': chave }, payload: { telefone: '51999991235', texto: 'oi' } });
    expect(r.statusCode).toBe(429);
    expect(r.json().codigo).toBe('COTA_DO_TIME');
  });

  it('um time não enxerga mensagem de outro; chave trocada para de funcionar', async () => {
    const chave = await criarTime();
    const m = await prisma.mensagem.create({ data: { telefone: '+5511999990001', texto: 'x' } });
    expect((await app.inject({ method: 'GET', url: `/v1/mensagens/${m.id}`, headers: { 'x-api-key': chave } })).statusCode).toBe(404);
    const time = await prisma.time.findFirstOrThrow();
    await app.inject({ method: 'POST', url: `/api/times/${time.id}/nova-chave`, headers: { cookie: admin }, payload: {} });
    expect((await app.inject({ method: 'GET', url: `/v1/mensagens/${m.id}`, headers: { 'x-api-key': chave } })).statusCode).toBe(401);
  });

  it('disparo em lote pela API', async () => {
    const chave = await criarTime();
    const r = await app.inject({ method: 'POST', url: '/v1/disparos', headers: { 'x-api-key': chave }, payload: { nome: 'Lote', contatos: [{ telefone: '51999991234', nome: 'A' }, { telefone: '51999991235' }], mensagens: ['Ola {nome}'] } });
    expect(r.statusCode).toBe(202);
    expect(r.json()).toMatchObject({ total: 2, time: 'CRM', criadoPor: null });
  });
});

describe('API /v1: métricas e lista do time', () => {
  async function timeComChave(): Promise<{ chave: string; id: number }> {
    const r = await app.inject({ method: 'POST', url: '/api/times', headers: { cookie: admin }, payload: { nome: 'Cobrança', cotaDiaria: 100, prioridade: 0 } });
    return { chave: r.json().chave as string, id: r.json().time.id as number };
  }

  it('métricas: conta por status, taxa de entrega, tempo médio, por dia e cota de hoje; só do próprio time', async () => {
    const { chave, id } = await timeComChave();
    const agora = Date.now();
    await prisma.mensagem.createMany({
      data: [
        { telefone: '+5511999990001', texto: 'a', timeId: id, status: 'ENTREGUE', entregueEm: new Date(agora + 20_000) },
        { telefone: '+5511999990002', texto: 'b', timeId: id, status: 'ENTREGUE', entregueEm: new Date(agora + 40_000) },
        { telefone: '+5511999990003', texto: 'c', timeId: id, status: 'FALHOU' },
        { telefone: '+5511999990004', texto: 'd', timeId: id, status: 'PENDENTE' },
        { telefone: '+5511999990005', texto: 'e', status: 'ENTREGUE' }, // de fora do time: não conta
      ],
    });
    const r = await app.inject({ method: 'GET', url: '/v1/metricas', headers: { 'x-api-key': chave } });
    expect(r.statusCode).toBe(200);
    const m = r.json();
    expect(m.resumo).toMatchObject({ total: 4, entregues: 2, falhas: 1, naFila: 1 });
    expect(m.taxaEntrega).toBeCloseTo(66.7, 1);
    expect(m.tempoMedioEntregaSegundos).toBeGreaterThan(20);
    expect(m.porDia).toHaveLength(1);
    expect(m.porStatus.FALHOU).toEqual({ quantidade: 1, rotulo: 'Falhou' });
    expect(m.cotaHoje).toEqual({ usadas: 4, cota: 100, restante: 96 });
  });

  it('lista: filtra por status, pagina e não mostra mensagem de outro time', async () => {
    const { chave, id } = await timeComChave();
    await prisma.mensagem.createMany({
      data: [
        { telefone: '+5511999990001', texto: 'a', timeId: id, status: 'FALHOU', detalhe: 'recusada pela operadora' },
        { telefone: '+5511999990002', texto: 'b', timeId: id, status: 'ENTREGUE' },
        { telefone: '+5511999990003', texto: 'c', status: 'FALHOU' },
      ],
    });
    const r = await app.inject({ method: 'GET', url: '/v1/mensagens?status=FALHOU&size=10', headers: { 'x-api-key': chave } });
    expect(r.json()).toMatchObject({ total: 1, page: 1, size: 10 });
    expect(r.json().data[0]).toMatchObject({ status: 'FALHOU', detalhe: 'recusada pela operadora' });
    expect((await app.inject({ method: 'GET', url: '/v1/metricas?de=2026-01-31&ate=2026-01-01', headers: { 'x-api-key': chave } })).json().codigo).toBe('PERIODO_INVALIDO');
    expect((await app.inject({ method: 'GET', url: '/v1/metricas?de=ontem', headers: { 'x-api-key': chave } })).statusCode).toBe(422);
  });
});

describe('alertas na tela', () => {
  it('lista só ERRO e AVISO importantes das últimas 24 h, o mais novo primeiro', async () => {
    const { registrarEvento } = await import('../src/servicos/eventos.js');
    await registrarEvento({ tipo: 'login', nivel: 'INFO', texto: 'entrou' });
    await registrarEvento({ tipo: 'disparo', nivel: 'AVISO', texto: 'cancelado' }); // aviso comum: não é alerta
    await registrarEvento({ tipo: 'aparelho', nivel: 'AVISO', texto: 'Celular 1 não respondeu' });
    await registrarEvento({ tipo: 'chip', nivel: 'ERRO', texto: 'Chip 1 saiu da roleta' });
    const r = await app.inject({ method: 'GET', url: '/api/alertas', headers: { cookie: operador } });
    expect(r.json().data.map((a: { texto: string }) => a.texto)).toEqual(['Chip 1 saiu da roleta', 'Celular 1 não respondeu']);
    expect((await app.inject({ method: 'GET', url: '/api/alertas' })).statusCode).toBe(401);
  });
});
