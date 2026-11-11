// Bloqueios (quem não recebe mais SMS) e Times (quem usa a API /v1 com a própria chave).
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { inicioDeHoje } from '../lib/tempo.js';
import { mascarar, normalizarTelefone } from '../lib/texto.js';
import { registrarEvento } from './eventos.js';
import { ErroNegocio, atualizarMensagem } from './mensagens.js';

type Pessoa = { id: number; nome: string };

// ── Bloqueios ──

export async function listarBloqueios({ page, size, busca }: { page: number; size: number; busca?: string }) {
  const digitos = (busca ?? '').replace(/\D/g, '');
  const where = digitos ? { telefone: { endsWith: digitos } } : {};
  const [total, lista] = await Promise.all([
    prisma.bloqueio.count({ where }),
    prisma.bloqueio.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * size, take: size, include: { criadoPor: { select: { nome: true } } } }),
  ]);
  return { data: lista.map((b) => ({ id: b.id, telefone: mascarar(b.telefone), motivo: b.motivo, criadoPor: b.criadoPor?.nome ?? null, criadoEm: b.criadoEm })), page, size, total };
}

/** Bloqueia os telefones e cancela o que deles ainda estava na fila. */
export async function bloquear(telefones: string[], motivo: string, quem: Pessoa) {
  const invalidos: string[] = [];
  const e164 = new Set<string>();
  for (const t of telefones) {
    const n = normalizarTelefone(t);
    if (n) e164.add(n.e164);
    else if (t.trim()) invalidos.push(t.trim().slice(0, 30));
  }
  const existentes = new Set((await prisma.bloqueio.findMany({ where: { telefone: { in: [...e164] } }, select: { telefone: true } })).map((b) => b.telefone));
  const novos = [...e164].filter((t) => !existentes.has(t));
  let canceladas = 0;
  await prisma.$transaction(async (tx) => {
    if (novos.length) await tx.bloqueio.createMany({ data: novos.map((telefone) => ({ telefone, motivo, criadoPorId: quem.id })) });
    const naFila = await tx.mensagem.findMany({ where: { telefone: { in: novos }, status: 'PENDENTE' }, select: { id: true } });
    for (const m of naFila) await atualizarMensagem(m.id, { status: 'CANCELADA', detalhe: 'telefone bloqueado' }, tx);
    canceladas = naFila.length;
    if (novos.length) await registrarEvento({ tipo: 'bloqueio', texto: `${quem.nome} bloqueou ${novos.length} telefone(s) (${motivo})${canceladas ? `; ${canceladas} mensagem(ns) na fila foram canceladas` : ''}.`, usuarioId: quem.id }, tx);
  });
  return { adicionados: novos.length, jaExistiam: existentes.size, invalidos, canceladas };
}

export async function desbloquear(id: number, quem: Pessoa) {
  const b = await prisma.bloqueio.delete({ where: { id } });
  await registrarEvento({ tipo: 'bloqueio', nivel: 'AVISO', texto: `${quem.nome} tirou ${mascarar(b.telefone)} da lista de bloqueio.`, usuarioId: quem.id });
}

// ── Times ──

export const hashChave = (chave: string): string => createHash('sha256').update(chave).digest('hex');

function novaChave(): { chave: string; hash: string; prefixo: string } {
  const chave = `sms_${randomBytes(24).toString('base64url')}`;
  return { chave, hash: hashChave(chave), prefixo: chave.slice(0, 8) };
}

const SELECT_TIME = { id: true, nome: true, chavePrefixo: true, cotaDiaria: true, prioridade: true, ativo: true, webhookUrl: true, criadoEm: true } as const;

export async function listarTimes() {
  const [lista, hoje] = await Promise.all([
    prisma.time.findMany({ select: SELECT_TIME, orderBy: { nome: 'asc' } }),
    prisma.mensagem.groupBy({ by: ['timeId'], where: { criadoEm: { gte: inicioDeHoje() }, timeId: { not: null } }, _count: { _all: true } }),
  ]);
  return lista.map((t) => ({ ...t, hoje: hoje.find((h) => h.timeId === t.id)?._count._all ?? 0 }));
}

export async function criarTime(dados: { nome: string; cotaDiaria: number; prioridade: number; webhookUrl?: string | null }, quem: Pessoa) {
  const k = novaChave();
  const time = await prisma.time.create({ data: { nome: dados.nome, cotaDiaria: dados.cotaDiaria, prioridade: dados.prioridade, webhookUrl: dados.webhookUrl || null, chaveHash: k.hash, chavePrefixo: k.prefixo }, select: SELECT_TIME });
  await registrarEvento({ tipo: 'time', texto: `${quem.nome} criou o time "${time.nome}" para a API (cota ${time.cotaDiaria}/dia, prioridade ${time.prioridade}).`, usuarioId: quem.id });
  return { time: { ...time, hoje: 0 }, chave: k.chave };
}

export async function editarTime(id: number, dados: { nome?: string; cotaDiaria?: number; prioridade?: number; ativo?: boolean; webhookUrl?: string | null }, quem: Pessoa) {
  const time = await prisma.time.update({ where: { id }, data: { ...dados, ...(dados.webhookUrl !== undefined ? { webhookUrl: dados.webhookUrl || null } : {}) }, select: SELECT_TIME });
  await registrarEvento({ tipo: 'time', nivel: dados.ativo === false ? 'AVISO' : 'INFO', texto: `${quem.nome} editou o time "${time.nome}"${dados.ativo === false ? ' (desativado: a chave para de funcionar)' : ''}.`, usuarioId: quem.id });
  return time;
}

export async function trocarChave(id: number, quem: Pessoa) {
  const k = novaChave();
  const time = await prisma.time.update({ where: { id }, data: { chaveHash: k.hash, chavePrefixo: k.prefixo }, select: { nome: true } });
  await registrarEvento({ tipo: 'time', nivel: 'AVISO', texto: `${quem.nome} gerou uma chave nova para o time "${time.nome}". A anterior parou de funcionar.`, usuarioId: quem.id });
  return { chave: k.chave };
}

/** Time da chave (só ativo). */
export async function timePorChave(chave: string | undefined) {
  if (!chave) return null;
  const t = await prisma.time.findUnique({ where: { chaveHash: hashChave(chave) }, select: { id: true, nome: true, prioridade: true, cotaDiaria: true, ativo: true } });
  return t && t.ativo ? t : null;
}

/** Confere a cota do dia do time antes de aceitar `quantas` mensagens novas. */
export async function conferirCotaDoTime(time: { id: number; cotaDiaria: number }, quantas: number) {
  const usadas = await prisma.mensagem.count({ where: { timeId: time.id, criadoEm: { gte: inicioDeHoje() } } });
  if (usadas + quantas > time.cotaDiaria) throw new ErroNegocio(429, 'COTA_DO_TIME', `Cota do dia do time atingida (${usadas} de ${time.cotaDiaria}).`, { usadas, cota: time.cotaDiaria });
}
