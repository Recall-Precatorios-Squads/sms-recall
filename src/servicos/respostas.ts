// Respostas dos contatos: o worker lê o inbox de cada celular, liga cada SMS recebido à última mensagem
// enviada para aquele telefone e daí saem as métricas (quantos responderam, taxa, tempo até responder).
// O texto da resposta é dado do contato: vai para a tela e para o webhook do time dono, nunca para o log.
// Só entra o SMS que responde a uma mensagem nossa: código de banco, promoção da operadora e mensagem pessoal
// que chegam no chip são ignorados e nunca gravados.
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { log } from '../lib/log.js';
import { mascarar, normalizarTelefone } from '../lib/texto.js';
import * as gate from '../smsgate/adaptador.js';
import { credenciais } from './aparelhos.js';
import { registrarEvento } from './eventos.js';

/** Resposta conta para a mensagem enviada até 7 dias antes. */
export const JANELA_RESPOSTA_MS = 7 * 86_400_000;
/** Primeira leitura de um celular: os últimos 3 dias. Depois, desde a última resposta lida (com folga de 10 min). */
const PRIMEIRA_LEITURA_MS = 3 * 86_400_000;
const FOLGA_MS = 10 * 60_000;

/** Status em que a mensagem saiu do celular sem falha: é a base da taxa de resposta. */
export const SAIRAM_SEM_FALHA = ['ACEITA', 'ENVIADA', 'ENTREGUE', 'SEM_CONFIRMACAO'] as const;

/** Celulares cujo app não tem GET /inbox: avisa uma vez por processo, não a cada minuto. */
const semCaixa = new Set<number>();
/** Até quando cada celular já foi lido (neste processo). Reinício: volta para a última resposta gravada. */
const lidoAte = new Map<number, Date>();

/**
 * Grava as respostas novas de um celular. Repetida (mesmo id do app) é ignorada; SMS que não responde a
 * nenhuma mensagem enviada (remetente sem telefone válido ou sem envio nos 7 dias anteriores) não é gravado.
 */
export async function registrarRespostas(aparelhoId: number, recebidas: gate.Recebida[]): Promise<number> {
  if (!recebidas.length) return 0;
  const ja = await prisma.resposta.findMany({ where: { aparelhoId, idExterno: { in: recebidas.map((r) => r.idExterno) } }, select: { idExterno: true } });
  const vistas = new Set(ja.map((r) => r.idExterno));
  const chips = await prisma.chip.findMany({ where: { aparelhoId }, select: { id: true, simNumero: true } });
  let novas = 0;
  for (const r of recebidas) {
    if (vistas.has(r.idExterno)) continue;
    vistas.add(r.idExterno);
    const tel = normalizarTelefone(r.telefone);
    if (!tel) continue;
    const telefone = tel.e164;
    const chipId = chips.find((c) => c.simNumero === r.simNumero)?.id ?? null;
    const mensagem = await mensagemRespondida(telefone, r.recebidaEm, chipId);
    if (!mensagem) continue;
    try {
      await prisma.$transaction(async (tx) => {
        const resposta = await tx.resposta.create({
          data: { aparelhoId, chipId, idExterno: r.idExterno, telefone, texto: r.texto.slice(0, 2_000), recebidaEm: r.recebidaEm, mensagemId: mensagem.id, disparoId: mensagem.disparoId, timeId: mensagem.timeId },
        });
        // Aviso ao time dono da mensagem (outbox): o worker entrega o evento mensagem.respondida no webhook.
        if (mensagem.timeId && mensagem.time?.webhookUrl && mensagem.time.ativo)
          await tx.aviso.create({ data: { mensagemId: mensagem.id, timeId: mensagem.timeId, statusMensagem: 'RESPONDIDA', respostaId: resposta.id } });
      });
      novas += 1;
    } catch (e) {
      // Dois workers lendo o mesmo celular: o UNIQUE (aparelho, id do app) segura a repetida.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }
  if (novas) log('respostas.lidas', { aparelhoId, novas });
  return novas;
}

/** A última mensagem que saiu para esse telefone antes da resposta (mesmo chip primeiro). */
async function mensagemRespondida(telefone: string, recebidaEm: Date, chipId: number | null) {
  const onde = { telefone, status: { in: [...SAIRAM_SEM_FALHA] }, aceitaEm: { lte: recebidaEm, gte: new Date(recebidaEm.getTime() - JANELA_RESPOSTA_MS) } };
  const select = { id: true, disparoId: true, timeId: true, time: { select: { webhookUrl: true, ativo: true } } } as const;
  const doChip = chipId ? await prisma.mensagem.findFirst({ where: { ...onde, chipId }, select, orderBy: { aceitaEm: 'desc' } }) : null;
  return doChip ?? prisma.mensagem.findFirst({ where: onde, select, orderBy: { aceitaEm: 'desc' } });
}

/** Laço do worker: lê o inbox de cada celular ativo e online. */
export async function lerRespostas(): Promise<number> {
  const aparelhos = await prisma.aparelho.findMany({ where: { ativo: true, online: true } });
  let total = 0;
  for (const ap of aparelhos) {
    if (semCaixa.has(ap.id)) continue;
    const inicio = new Date();
    let ponto = lidoAte.get(ap.id);
    if (!ponto) ponto = (await prisma.resposta.aggregate({ where: { aparelhoId: ap.id }, _max: { recebidaEm: true } }))._max.recebidaEm ?? new Date(inicio.getTime() - PRIMEIRA_LEITURA_MS + FOLGA_MS);
    // A folga cobre relógio do celular diferente do servidor; o UNIQUE descarta o que for lido de novo.
    const desde = new Date(ponto.getTime() - FOLGA_MS);
    try {
      const recebidas = await gate.caixaDeEntrada(credenciais(ap), desde);
      if (recebidas === null) {
        semCaixa.add(ap.id);
        await registrarEvento({
          tipo: 'aparelho',
          nivel: 'AVISO',
          texto: `O app do ${ap.nome} não deixa ler as respostas (GET /inbox). Atualize o SMS Gateway no celular e dê a permissão de receber SMS; depois reinicie o worker.`,
        });
        continue;
      }
      total += await registrarRespostas(ap.id, recebidas);
      lidoAte.set(ap.id, inicio);
    } catch (e) {
      log('respostas.erro', { aparelho: ap.nome, erro: e instanceof Error ? e.message : String(e) }, 'error');
    }
  }
  return total;
}

export interface MetricaResposta {
  /** Mensagens (sem falha) que receberam pelo menos uma resposta. */
  respondidas: number;
  /** Base da taxa: mensagens que saíram do celular sem falha. */
  base: number;
  /** respondidas ÷ base, em %, com 1 casa. null sem base. */
  taxaResposta: number | null;
  /** Tempo típico entre a mensagem sair e a 1ª resposta chegar (mediana, em segundos). */
  tempoMedianoRespostaSegundos: number | null;
  tempoMedioRespostaSegundos: number | null;
}

/** Métrica de resposta das mensagens que casam com `filtro` (SQL sobre a tabela mensagens, alias m). */
export async function metricaResposta(filtro: Prisma.Sql): Promise<MetricaResposta> {
  const [l] = await prisma.$queryRaw<{ base: number; respondidas: number; mediana: number | null; media: number | null }[]>`
    WITH alvo AS (
      SELECT m.id, m.aceita_em FROM mensagens m
       WHERE ${filtro} AND m.status::text IN (${Prisma.join([...SAIRAM_SEM_FALHA])})
    ), primeira AS (
      SELECT r.mensagem_id, min(r.recebida_em) AS em FROM respostas r JOIN alvo a ON a.id = r.mensagem_id GROUP BY 1
    )
    SELECT (SELECT count(*) FROM alvo)::int AS base,
           count(p.mensagem_id)::int AS respondidas,
           round(percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (p.em - a.aceita_em))))::int AS mediana,
           round(avg(extract(epoch FROM (p.em - a.aceita_em))))::int AS media
      FROM primeira p JOIN alvo a ON a.id = p.mensagem_id`;
  const base = l?.base ?? 0;
  const respondidas = l?.respondidas ?? 0;
  return {
    respondidas,
    base,
    taxaResposta: base ? Math.round((respondidas / base) * 1000) / 10 : null,
    tempoMedianoRespostaSegundos: l?.mediana ?? null,
    tempoMedioRespostaSegundos: l?.media ?? null,
  };
}

/** Quantas mensagens responderam, por disparo (lista de disparos). */
export async function respondidasPorDisparo(ids: number[]): Promise<Map<number, number>> {
  if (!ids.length) return new Map();
  const linhas = await prisma.$queryRaw<{ disparo_id: number; n: number }[]>`
    SELECT disparo_id, count(DISTINCT mensagem_id)::int AS n FROM respostas WHERE disparo_id IN (${Prisma.join(ids)}) GROUP BY 1`;
  return new Map(linhas.map((l) => [l.disparo_id, l.n]));
}

/** Respostas de um disparo, agrupadas por mensagem (mais antiga primeiro). */
export async function respostasDoDisparo(disparoId: number): Promise<Map<number, { texto: string; recebidaEm: Date }[]>> {
  const lista = await prisma.resposta.findMany({ where: { disparoId }, select: { mensagemId: true, texto: true, recebidaEm: true }, orderBy: { recebidaEm: 'asc' } });
  const mapa = new Map<number, { texto: string; recebidaEm: Date }[]>();
  for (const r of lista) {
    if (r.mensagemId === null) continue;
    const l = mapa.get(r.mensagemId) ?? [];
    l.push({ texto: r.texto, recebidaEm: r.recebidaEm });
    mapa.set(r.mensagemId, l);
  }
  return mapa;
}

/** Respostas recentes (tela): telefone mascarado, de onde veio e a qual disparo pertence. */
export async function ultimasRespostas(limite = 10) {
  const lista = await prisma.resposta.findMany({
    orderBy: { recebidaEm: 'desc' },
    take: limite,
    select: { id: true, telefone: true, texto: true, recebidaEm: true, disparoId: true, disparo: { select: { nome: true } }, mensagem: { select: { nome: true } } },
  });
  return lista.map((r) => ({ id: r.id, telefone: mascarar(r.telefone), nome: r.mensagem?.nome ?? null, texto: r.texto, recebidaEm: r.recebidaEm, disparoId: r.disparoId, disparo: r.disparo?.nome ?? null }));
}
