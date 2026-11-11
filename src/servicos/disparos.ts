// Disparos por planilha (tela) ou por lote (API /v1): validação, bloqueio, criação na fila, cancelamento e resumo.
import type { StatusMensagem } from '@prisma/client';
import { prisma } from '../db.js';
import { aplicarModelo, contarSegmentos, mascarar, normalizarTelefone } from '../lib/texto.js';
import { chipsDisponiveis } from './aparelhos.js';
import { registrarEvento, rotuloChip } from './eventos.js';
import { ErroNegocio, FINAIS, ROTULOS, atualizarMensagem, bloqueadosEntre } from './mensagens.js';

export { ErroNegocio, ROTULOS, FINAIS };

export const LIMITES = { contatos: 500, modelos: 20, caracteres: 640, intervaloMin: 1, intervaloMax: 600 };

export interface DadosDisparo {
  nome?: string;
  contatos: { linha?: number; telefone: string | number; nome?: string | null; mensagem?: string | null }[];
  mensagens: string[];
  intervaloMinSegundos: number;
  intervaloMaxSegundos: number;
}

/** Quem pediu: uma pessoa pela tela, ou um time pela API. */
export type Origem = { usuario: { id: number; nome: string } } | { time: { id: number; nome: string; prioridade: number } };

interface Item {
  linha: number;
  telefone: string;
  nome: string | null;
  texto: string;
  indiceAbordagem: number | null;
}

/** Cada contato recebe a mensagem própria da linha ou o próximo texto da roleta (com {nome}). Telefone bloqueado fica de fora. */
export async function criarDisparo(dados: DadosDisparo, origem: Origem) {
  const modelos = dados.mensagens.map((m) => m.trim()).filter(Boolean);
  if (dados.intervaloMinSegundos > dados.intervaloMaxSegundos) throw new ErroNegocio(422, 'INTERVALO_INVALIDO', 'O intervalo mínimo não pode ser maior que o máximo.');

  const vistos = new Set<string>();
  const itens: Item[] = [];
  const problemas: { linha: number; motivo: string }[] = [];
  let duplicados = 0;
  let iModelo = 0;
  dados.contatos.forEach((c, i) => {
    const linha = c.linha ?? i + 2;
    const tel = normalizarTelefone(c.telefone);
    if (!tel) return void problemas.push({ linha, motivo: 'telefone inválido' });
    if (vistos.has(tel.digitos)) return void (duplicados += 1);
    vistos.add(tel.digitos);
    const nome = (c.nome ?? '').trim().slice(0, 80);
    const propria = (c.mensagem ?? '').trim() || null;
    if (!propria && !modelos.length) return void problemas.push({ linha, motivo: 'sem mensagem (nem na planilha, nem na roleta)' });
    const indice = propria ? null : (iModelo++ % modelos.length) + 1;
    const texto = aplicarModelo(propria ?? modelos[(indice ?? 1) - 1] ?? '', { nome });
    if (!texto) return void problemas.push({ linha, motivo: 'mensagem vazia' });
    if (texto.length > LIMITES.caracteres) return void problemas.push({ linha, motivo: `mensagem passa de ${LIMITES.caracteres} caracteres` });
    itens.push({ linha, telefone: tel.e164, nome: nome || null, texto, indiceAbordagem: indice });
  });
  if (problemas.length) throw new ErroNegocio(422, 'PLANILHA_COM_ERROS', `${problemas.length} linha(s) com problema. Corrija e tente de novo.`, { problemas: problemas.slice(0, 50) });

  const bloqueados = await bloqueadosEntre(itens.map((i) => i.telefone));
  const validos = itens.filter((i) => !bloqueados.has(i.telefone));
  if (!validos.length) throw new ErroNegocio(422, 'SEM_CONTATOS', bloqueados.size ? 'Todos os contatos estão na lista de bloqueio.' : 'Nenhum contato válido depois de tirar os repetidos.');

  const chips = await chipsDisponiveis();
  if (!chips.length) throw new ErroNegocio(503, 'CHIPS_INDISPONIVEIS', 'Nenhum chip disponível. Veja a tela Aparelhos e chips.');

  const quem = 'usuario' in origem ? origem.usuario.nome : `API · ${origem.time.nome}`;
  const nome = dados.nome?.trim() ? dados.nome.trim().slice(0, 80) : `Disparo de ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
  const disparo = await prisma.$transaction(async (tx) => {
    const d = await tx.disparo.create({
      data: {
        nome,
        criadoPorId: 'usuario' in origem ? origem.usuario.id : null,
        timeId: 'time' in origem ? origem.time.id : null,
        intervaloMinMs: Math.round(dados.intervaloMinSegundos * 1000),
        intervaloMaxMs: Math.round(dados.intervaloMaxSegundos * 1000),
        total: validos.length,
        abordagens: modelos.length,
        duplicados,
        bloqueados: bloqueados.size,
      },
      select: { id: true },
    });
    const prioridade = 'time' in origem ? origem.time.prioridade : 0;
    const timeId = 'time' in origem ? origem.time.id : null;
    await tx.mensagem.createMany({ data: validos.map((it) => ({ ...it, disparoId: d.id, prioridade, timeId })) });
    const sms = validos.reduce((t, it) => t + contarSegmentos(it.texto).segmentos, 0);
    await registrarEvento(
      {
        tipo: 'disparo',
        texto: `Disparo "${nome}" criado por ${quem}: ${validos.length} contato(s)${bloqueados.size ? `, ${bloqueados.size} bloqueado(s) fora` : ''}, ${modelos.length} abordagem(ns), ~${sms} SMS cobrados, ${chips.length} chip(s) disponíveis, cada chip espera ${dados.intervaloMinSegundos} a ${dados.intervaloMaxSegundos} s entre envios.`,
        disparoId: d.id,
        usuarioId: 'usuario' in origem ? origem.usuario.id : null,
      },
      tx,
    );
    return d;
  });
  return resumoDisparo(disparo.id);
}

export async function cancelarDisparo(id: number, quem: { id: number | null; nome: string }, timeId: number | null = null) {
  const d = await prisma.disparo.findUnique({ where: { id }, select: { status: true, nome: true, timeId: true } });
  if (!d || (timeId !== null && d.timeId !== timeId)) throw new ErroNegocio(404, 'NAO_ENCONTRADO', 'Disparo não encontrado.');
  if (d.status !== 'ENVIANDO') throw new ErroNegocio(409, 'JA_TERMINOU', 'Este disparo já terminou.');
  await prisma.$transaction(async (tx) => {
    // Só o que ainda não saiu. O que está ENVIANDO/ACEITA já está com o celular e segue o curso.
    const pendentes = await tx.mensagem.findMany({ where: { disparoId: id, status: 'PENDENTE' }, select: { id: true } });
    for (const m of pendentes) await atualizarMensagem(m.id, { status: 'CANCELADA', detalhe: `cancelada por ${quem.nome}` }, tx);
    await tx.disparo.update({ where: { id }, data: { status: 'CANCELADO', terminadoEm: new Date() } });
    await registrarEvento({ tipo: 'disparo', nivel: 'AVISO', texto: `Disparo "${d.nome}" cancelado por ${quem.nome}: ${pendentes.length} mensagem(ns) que ainda não tinham saído foram canceladas.`, disparoId: id, usuarioId: quem.id }, tx);
  });
  return { mensagem: 'Disparo cancelado: as mensagens que ainda não saíram não serão enviadas.' };
}

export type Grupo = { status: StatusMensagem; _count: { _all: number } };

export function contagemDe(grupos: Grupo[]) {
  const c = { total: 0, naFila: 0, enviando: 0, aguardando: 0, entregues: 0, falhas: 0, canceladas: 0, incertas: 0 };
  for (const g of grupos) {
    const n = g._count._all;
    c.total += n;
    if (g.status === 'PENDENTE' || g.status === 'RESERVADA') c.naFila += n;
    else if (g.status === 'ENVIANDO') c.enviando += n;
    else if (g.status === 'ACEITA' || g.status === 'ENVIADA') c.aguardando += n;
    else if (g.status === 'ENTREGUE' || g.status === 'SEM_CONFIRMACAO') c.entregues += n;
    else if (g.status === 'FALHOU') c.falhas += n;
    else if (g.status === 'CANCELADA') c.canceladas += n;
    else if (g.status === 'INCERTA') c.incertas += n;
  }
  return c;
}

const SELECT_RESUMO = {
  id: true,
  nome: true,
  status: true,
  criadoEm: true,
  terminadoEm: true,
  intervaloMinMs: true,
  intervaloMaxMs: true,
  total: true,
  abordagens: true,
  duplicados: true,
  bloqueados: true,
  criadoPor: { select: { id: true, nome: true } },
  time: { select: { nome: true } },
} as const;

type LinhaResumo = { time: { nome: string } | null } & Record<string, unknown>;
const comTime = <T extends LinhaResumo>(d: T) => ({ ...d, time: d.time?.nome ?? null });

export async function resumoDisparo(id: number, timeId: number | null = null) {
  const d = await prisma.disparo.findUnique({ where: { id }, select: { ...SELECT_RESUMO, timeId: true } });
  if (!d || (timeId !== null && d.timeId !== timeId)) return null;
  const grupos = await prisma.mensagem.groupBy({ by: ['status'], where: { disparoId: id }, _count: { _all: true } });
  const { timeId: _t, ...resto } = d;
  return { ...comTime(resto), contagem: contagemDe(grupos) };
}

export async function listarDisparos({ page, size }: { page: number; size: number }) {
  const [total, lista] = await Promise.all([prisma.disparo.count(), prisma.disparo.findMany({ select: SELECT_RESUMO, orderBy: { id: 'desc' }, skip: (page - 1) * size, take: size })]);
  const ids = lista.map((d) => d.id);
  const grupos = ids.length ? await prisma.mensagem.groupBy({ by: ['disparoId', 'status'], where: { disparoId: { in: ids } }, _count: { _all: true } }) : [];
  const data = lista.map((d) => ({ ...comTime(d), contagem: contagemDe(grupos.filter((g) => g.disparoId === d.id)) }));
  return { data, page, size, total };
}

export async function detalheDisparo(id: number) {
  const resumo = await resumoDisparo(id);
  if (!resumo) return null;
  const msgs = await prisma.mensagem.findMany({
    where: { disparoId: id },
    select: { id: true, linha: true, nome: true, telefone: true, texto: true, status: true, detalhe: true, atualizadoEm: true, entregueEm: true, chip: { select: { simNumero: true, operadora: true, aparelho: { select: { nome: true } } } } },
    orderBy: { id: 'asc' },
  });
  return {
    ...resumo,
    mensagens: msgs.map((m) => ({
      id: m.id,
      linha: m.linha,
      nome: m.nome,
      telefone: mascarar(m.telefone),
      texto: m.texto,
      chip: rotuloChip(m.chip),
      status: m.status,
      rotulo: ROTULOS[m.status],
      detalhe: m.detalhe,
      atualizadoEm: m.atualizadoEm,
      entregueEm: m.entregueEm,
      final: FINAIS.has(m.status),
      entregue: m.status === 'ENTREGUE' || m.status === 'SEM_CONFIRMACAO',
      falhou: m.status === 'FALHOU' || m.status === 'INCERTA',
    })),
  };
}
