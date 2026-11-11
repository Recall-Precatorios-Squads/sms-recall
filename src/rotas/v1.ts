// API /v1 para outros sistemas e times (CRM...). Autenticação por chave do time (X-Api-Key).
// Envio é assíncrono: responde 202 com o id; o status sai por consulta ou pelo webhook do time.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { aplicarModelo, normalizarTelefone } from '../lib/texto.js';
import { conferirCotaDoTime, timePorChave } from '../servicos/cadastros.js';
import { LIMITES, cancelarDisparo, criarDisparo, resumoDisparo } from '../servicos/disparos.js';
import { registrarEvento } from '../servicos/eventos.js';
import { ErroNegocio, ROTULOS, bloqueadosEntre } from '../servicos/mensagens.js';
import { paginaDocs } from './docs.js';
import { openapi } from './openapi.js';

type Time = NonNullable<Awaited<ReturnType<typeof timePorChave>>>;
declare module 'fastify' {
  interface FastifyRequest {
    time: Time | null;
  }
}

const erro = (reply: FastifyReply, status: number, codigo: string, mensagem: string, detalhes: Record<string, unknown> = {}) => reply.code(status).send({ codigo, mensagem, detalhes });

const esquemaMensagem = z.object({
  telefone: z.union([z.string().max(40), z.number()]),
  texto: z.string().trim().min(1, 'texto vazio').max(LIMITES.caracteres, `texto passa de ${LIMITES.caracteres} caracteres`),
  nome: z.string().max(80).optional().nullable(),
});
const esquemaDisparo = z.object({
  nome: z.string().max(80).optional(),
  contatos: z.array(z.object({ telefone: z.union([z.string().max(40), z.number()]), nome: z.string().max(200).optional().nullable(), mensagem: z.string().max(2000).optional().nullable() })).min(1).max(LIMITES.contatos),
  mensagens: z.array(z.string().max(LIMITES.caracteres)).max(LIMITES.modelos).default([]),
  intervaloMinSegundos: z.number().min(LIMITES.intervaloMin).max(LIMITES.intervaloMax).default(45),
  intervaloMaxSegundos: z.number().min(LIMITES.intervaloMin).max(LIMITES.intervaloMax).default(80),
});
const chaveIdempotencia = z.string().trim().min(1).max(100);

function dtoMensagem(m: { id: number; status: keyof typeof ROTULOS; chaveIdempotencia: string | null; disparoId: number | null; criadoEm: Date; atualizadoEm: Date; entregueEm: Date | null; detalhe: string | null }) {
  return { id: m.id, status: m.status, rotulo: ROTULOS[m.status], chaveIdempotencia: m.chaveIdempotencia, disparoId: m.disparoId, criadoEm: m.criadoEm, atualizadoEm: m.atualizadoEm, entregueEm: m.entregueEm, detalhe: m.detalhe };
}
const SELECT_MSG = { id: true, status: true, chaveIdempotencia: true, disparoId: true, criadoEm: true, atualizadoEm: true, entregueEm: true, detalhe: true } as const;

export async function rotasV1(app: FastifyInstance): Promise<void> {
  app.decorateRequest('time', null);
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url.startsWith('/v1/openapi.json') || req.url.startsWith('/v1/docs')) return;
    const chave = req.headers['x-api-key'];
    req.time = await timePorChave(typeof chave === 'string' ? chave : undefined);
    if (!req.time) return erro(reply, 401, 'CHAVE_INVALIDA', 'Envie a chave do time no header X-Api-Key.');
  });

  app.get('/v1/openapi.json', async () => openapi);
  app.get('/v1/docs', async (req, reply) => reply.type('text/html; charset=utf-8').send(paginaDocs()));

  /** Uma mensagem. Com Idempotency-Key, repetir o pedido devolve a mesma mensagem (nunca cria outra). */
  app.post('/v1/mensagens', async (req, reply) => {
    const time = req.time as Time;
    const d = esquemaMensagem.safeParse(req.body ?? {});
    if (!d.success) return erro(reply, 422, 'DADOS_INVALIDOS', d.error.issues[0]?.message ?? 'Dados inválidos.');
    const ch = req.headers['idempotency-key'];
    const chave = ch === undefined ? null : chaveIdempotencia.safeParse(ch).success ? String(ch).trim() : undefined;
    if (chave === undefined) return erro(reply, 422, 'IDEMPOTENCY_KEY_INVALIDA', 'Idempotency-Key deve ter de 1 a 100 caracteres.');
    if (chave) {
      const existente = await prisma.mensagem.findUnique({ where: { timeId_chaveIdempotencia: { timeId: time.id, chaveIdempotencia: chave } }, select: SELECT_MSG });
      if (existente) return reply.code(200).send(dtoMensagem(existente));
    }
    const tel = normalizarTelefone(d.data.telefone);
    if (!tel) return erro(reply, 422, 'TELEFONE_INVALIDO', 'Telefone inválido. Use DDD + número (ex.: 51999991234).');
    if ((await bloqueadosEntre([tel.e164])).size) return erro(reply, 422, 'TELEFONE_BLOQUEADO', 'Este telefone está na lista de bloqueio.');
    await conferirCotaDoTime(time, 1);
    const texto = aplicarModelo(d.data.texto, { nome: d.data.nome ?? '' });
    try {
      const m = await prisma.mensagem.create({
        data: { telefone: tel.e164, nome: d.data.nome ?? null, texto, timeId: time.id, prioridade: time.prioridade, chaveIdempotencia: chave, intervaloMinMs: config.intervaloApi.minMs, intervaloMaxMs: config.intervaloApi.maxMs },
        select: SELECT_MSG,
      });
      return reply.code(202).send(dtoMensagem(m));
    } catch (e) {
      // Dois pedidos iguais ao mesmo tempo: o UNIQUE (time, chave) segura; devolve a que ficou.
      if (chave && (e as { code?: string }).code === 'P2002') {
        const m = await prisma.mensagem.findUnique({ where: { timeId_chaveIdempotencia: { timeId: time.id, chaveIdempotencia: chave } }, select: SELECT_MSG });
        if (m) return reply.code(200).send(dtoMensagem(m));
      }
      throw e;
    }
  });

  app.get('/v1/mensagens/:id', async (req, reply) => {
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    if (!id.success) return erro(reply, 404, 'NAO_ENCONTRADA', 'Mensagem não encontrada.');
    const m = await prisma.mensagem.findFirst({ where: { id: id.data, timeId: (req.time as Time).id }, select: SELECT_MSG });
    return m ? dtoMensagem(m) : erro(reply, 404, 'NAO_ENCONTRADA', 'Mensagem não encontrada.');
  });

  app.post('/v1/disparos', async (req, reply) => {
    const time = req.time as Time;
    const d = esquemaDisparo.safeParse(req.body ?? {});
    if (!d.success) return erro(reply, 422, 'DADOS_INVALIDOS', d.error.issues[0]?.message ?? 'Dados inválidos.');
    await conferirCotaDoTime(time, d.data.contatos.length);
    const r = await criarDisparo(d.data, { time });
    return reply.code(202).send(r);
  });

  app.get('/v1/disparos/:id', async (req, reply) => {
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    const r = id.success ? await resumoDisparo(id.data, (req.time as Time).id) : null;
    return r ?? erro(reply, 404, 'NAO_ENCONTRADO', 'Disparo não encontrado.');
  });

  app.post('/v1/disparos/:id/cancelar', async (req, reply) => {
    const time = req.time as Time;
    const id = z.coerce.number().int().positive().safeParse((req.params as { id: string }).id);
    if (!id.success) return erro(reply, 404, 'NAO_ENCONTRADO', 'Disparo não encontrado.');
    const r = await cancelarDisparo(id.data, { id: null, nome: `API · ${time.nome}` }, time.id);
    await registrarEvento({ tipo: 'api', texto: `O time "${time.nome}" cancelou o disparo ${id.data} pela API.`, disparoId: id.data });
    return reply.code(202).send(r);
  });
}

export { ErroNegocio };
