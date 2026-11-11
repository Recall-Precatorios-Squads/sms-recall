// Estados da mensagem e a única função que muda o status: assim o aviso ao time (outbox) nunca é esquecido.
import type { Prisma, StatusMensagem } from '@prisma/client';
import { prisma } from '../db.js';
import { mascarar } from '../lib/texto.js';
import { type Db, registrarEvento, rotuloChip } from './eventos.js';

export class ErroNegocio extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
    public readonly detalhes: Record<string, unknown> = {},
  ) {
    super(mensagem);
  }
}

export const ROTULOS: Record<StatusMensagem, string> = {
  PENDENTE: 'Na fila',
  RESERVADA: 'Reservada',
  ENVIANDO: 'Enviando',
  ACEITA: 'Aceita pelo celular',
  ENVIADA: 'Enviada',
  ENTREGUE: 'Entregue',
  FALHOU: 'Falhou',
  INCERTA: 'Incerta (confira no celular)',
  CANCELADA: 'Cancelada',
  SEM_CONFIRMACAO: 'Sem confirmação',
};
export const FINAIS: ReadonlySet<StatusMensagem> = new Set<StatusMensagem>(['ENTREGUE', 'FALHOU', 'INCERTA', 'CANCELADA', 'SEM_CONFIRMACAO']);

/**
 * Atualiza uma mensagem. Se ela é de um time com webhook e chegou a um estado final,
 * grava o aviso na outbox na mesma transação (o worker entrega depois, com nova tentativa).
 */
export async function atualizarMensagem(id: number, data: Prisma.MensagemUncheckedUpdateInput, db?: Db) {
  const executar = async (tx: Db) => {
    const m = await tx.mensagem.update({ where: { id }, data, select: { id: true, status: true, timeId: true, time: { select: { webhookUrl: true, ativo: true } } } });
    if (m.timeId && m.time?.webhookUrl && m.time.ativo && FINAIS.has(m.status)) await tx.aviso.create({ data: { mensagemId: m.id, timeId: m.timeId, statusMensagem: m.status } });
    return m;
  };
  return db ? executar(db) : prisma.$transaction((tx) => executar(tx));
}

/** Telefones bloqueados entre os informados (E.164). */
export async function bloqueadosEntre(telefones: string[]): Promise<Set<string>> {
  if (!telefones.length) return new Set();
  const lista = await prisma.bloqueio.findMany({ where: { telefone: { in: telefones } }, select: { telefone: true } });
  return new Set(lista.map((b) => b.telefone));
}

// ── Revisão (a "DLQ" na tela): falhas e incertas ──

export async function listarRevisao(status: 'FALHOU' | 'INCERTA', page: number, size: number) {
  const where = { status };
  const [total, lista] = await Promise.all([
    prisma.mensagem.count({ where }),
    prisma.mensagem.findMany({
      where,
      orderBy: { atualizadoEm: 'desc' },
      skip: (page - 1) * size,
      take: size,
      select: {
        id: true, disparoId: true, telefone: true, nome: true, texto: true, status: true, detalhe: true, tentativas: true, atualizadoEm: true,
        disparo: { select: { nome: true } },
        time: { select: { nome: true } },
        chip: { select: { simNumero: true, operadora: true, aparelho: { select: { nome: true } } } },
      },
    }),
  ]);
  return {
    data: lista.map((m) => ({
      id: m.id, disparoId: m.disparoId, disparo: m.disparo?.nome ?? null, time: m.time?.nome ?? null, telefone: mascarar(m.telefone), nome: m.nome, texto: m.texto,
      chip: rotuloChip(m.chip), status: m.status, rotulo: ROTULOS[m.status], detalhe: m.detalhe, tentativas: m.tentativas, atualizadoEm: m.atualizadoEm,
    })),
    page,
    size,
    total,
  };
}

/** Coloca de volta na fila uma mensagem que falhou ou ficou incerta (decisão de uma pessoa). */
export async function reprocessar(id: number, usuario: { id: number; nome: string }) {
  const m = await prisma.mensagem.findUnique({ where: { id }, select: { status: true, disparoId: true, telefone: true } });
  if (!m) throw new ErroNegocio(404, 'NAO_ENCONTRADO', 'Mensagem não encontrada.');
  if (m.status !== 'FALHOU' && m.status !== 'INCERTA') throw new ErroNegocio(409, 'NAO_REPROCESSAVEL', 'Só mensagens que falharam ou ficaram incertas podem ser reenviadas.');
  const bloq = await bloqueadosEntre([m.telefone]);
  if (bloq.size) throw new ErroNegocio(422, 'TELEFONE_BLOQUEADO', 'Este telefone está na lista de bloqueio.');
  await prisma.$transaction(async (tx) => {
    await tx.mensagem.update({ where: { id }, data: { status: 'PENDENTE', chipId: null, idExterno: null, tentativas: 0, proximaTentativaEm: new Date(), detalhe: `reenvio pedido por ${usuario.nome}` } });
    if (m.disparoId) await tx.disparo.updateMany({ where: { id: m.disparoId, status: 'CONCLUIDO' }, data: { status: 'ENVIANDO', terminadoEm: null } });
    await registrarEvento({ tipo: 'revisao', texto: `${usuario.nome} mandou reenviar a mensagem ${id} (${m.status === 'INCERTA' ? 'estava incerta' : 'tinha falhado'}) para ${mascarar(m.telefone)}.`, disparoId: m.disparoId, usuarioId: usuario.id }, tx);
  });
  return { mensagem: 'Mensagem de volta na fila.' };
}

/** A pessoa conferiu no celular que a mensagem incerta saiu. */
export async function marcarEnviada(id: number, usuario: { id: number; nome: string }) {
  const m = await prisma.mensagem.findUnique({ where: { id }, select: { status: true, disparoId: true } });
  if (!m) throw new ErroNegocio(404, 'NAO_ENCONTRADO', 'Mensagem não encontrada.');
  if (m.status !== 'INCERTA') throw new ErroNegocio(409, 'NAO_INCERTA', 'Só mensagens incertas podem ser confirmadas como enviadas.');
  await prisma.$transaction(async (tx) => {
    await atualizarMensagem(id, { status: 'SEM_CONFIRMACAO', detalhe: `${usuario.nome} conferiu no celular que saiu` }, tx);
    await registrarEvento({ tipo: 'revisao', texto: `${usuario.nome} confirmou que a mensagem ${id} saiu.`, disparoId: m.disparoId, usuarioId: usuario.id }, tx);
  });
  return { mensagem: 'Mensagem marcada como enviada.' };
}
