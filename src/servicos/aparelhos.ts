// Celulares e chips: cadastro, teste, cota e sincronização com o que o app sms-gate informa.
import type { Aparelho } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { cifrar, decifrar } from '../lib/cripto.js';
import { inicioDeHoje } from '../lib/tempo.js';
import * as gate from '../smsgate/adaptador.js';
import { registrarEvento, rotuloChip } from './eventos.js';

const SELECT_APARELHO = {
  id: true,
  nome: true,
  url: true,
  usuario: true,
  ativo: true,
  online: true,
  bateria: true,
  detalhe: true,
  ultimoContatoEm: true,
  chips: {
    select: { id: true, simNumero: true, operadora: true, telefone: true, ativo: true, presente: true, falhasSeguidas: true, cotaDiaria: true },
    orderBy: { simNumero: 'asc' as const },
  },
};

/** Quantas mensagens cada chip já começou a enviar hoje (no fuso da tela). */
export async function enviadosHojePorChip(): Promise<Map<number, number>> {
  const grupos = await prisma.mensagem.groupBy({ by: ['chipId'], where: { enviandoEm: { gte: inicioDeHoje() }, chipId: { not: null } }, _count: { _all: true } });
  return new Map(grupos.map((g) => [g.chipId as number, g._count._all]));
}

export const cotaEfetiva = (chip: { cotaDiaria: number | null }): number => chip.cotaDiaria ?? config.cotaDiariaChip;

export async function listarAparelhos() {
  const [lista, hoje] = await Promise.all([prisma.aparelho.findMany({ select: SELECT_APARELHO, orderBy: { nome: 'asc' } }), enviadosHojePorChip()]);
  return lista.map((a) => ({ ...a, chips: a.chips.map((c) => ({ ...c, cotaEfetiva: cotaEfetiva(c), enviadosHoje: hoje.get(c.id) ?? 0 })) }));
}

/** Credenciais para o adaptador (senha decifrada só em memória, na hora de usar). */
export function credenciais(ap: Pick<Aparelho, 'nome' | 'url' | 'usuario' | 'senhaCifrada'>): gate.Credenciais {
  return { nome: ap.nome, url: ap.url, usuario: ap.usuario, senha: decifrar(ap.senhaCifrada) };
}

export async function criarAparelho(dados: { nome: string; url: string; usuario: string; senha: string }, usuarioId: number) {
  const ap = await prisma.aparelho.create({ data: { nome: dados.nome, url: dados.url, usuario: dados.usuario, senhaCifrada: cifrar(dados.senha) }, select: { id: true } });
  await registrarEvento({ tipo: 'aparelho', texto: `Celular "${dados.nome}" cadastrado.`, usuarioId });
  await sincronizarAparelho(ap.id);
  return (await listarAparelhos()).find((a) => a.id === ap.id);
}

export async function editarAparelho(id: number, dados: { nome?: string; url?: string; usuario?: string; senha?: string; ativo?: boolean }, usuarioId: number) {
  const ap = await prisma.aparelho.update({
    where: { id },
    data: {
      ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
      ...(dados.url !== undefined ? { url: dados.url } : {}),
      ...(dados.usuario !== undefined ? { usuario: dados.usuario } : {}),
      ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
      ...(dados.senha ? { senhaCifrada: cifrar(dados.senha) } : {}),
    },
    select: { nome: true },
  });
  const oQue = dados.ativo === false ? 'desativado (os chips saem da roleta)' : dados.ativo === true ? 'ativado' : 'editado';
  await registrarEvento({ tipo: 'aparelho', texto: `Celular "${ap.nome}" ${oQue}.`, usuarioId });
  if (dados.ativo !== false) await sincronizarAparelho(id);
  return (await listarAparelhos()).find((a) => a.id === id);
}

export async function testarAparelho(id: number, usuarioId: number) {
  const ap = await prisma.aparelho.findUnique({ where: { id } });
  if (!ap) return null;
  const r = await gate.testar(credenciais(ap));
  await registrarEvento({ tipo: 'teste', nivel: r.ok ? 'INFO' : 'ERRO', texto: `Teste de conexão: ${r.mensagem}`, usuarioId });
  await sincronizarAparelho(id);
  return r;
}

export async function editarChip(id: number, dados: { ativo?: boolean; cotaDiaria?: number | null }, usuarioId: number) {
  const chip = await prisma.chip.update({
    where: { id },
    data: {
      ...(dados.ativo !== undefined ? { ativo: dados.ativo, ...(dados.ativo ? { falhasSeguidas: 0 } : {}) } : {}),
      ...(dados.cotaDiaria !== undefined ? { cotaDiaria: dados.cotaDiaria } : {}),
    },
    include: { aparelho: { select: { nome: true } } },
  });
  const partes: string[] = [];
  if (dados.ativo !== undefined) partes.push(dados.ativo ? 'ativado' : 'desativado');
  if (dados.cotaDiaria !== undefined) partes.push(`cota do dia ${dados.cotaDiaria === null ? `no padrão (${config.cotaDiariaChip})` : `em ${dados.cotaDiaria}`}`);
  await registrarEvento({ tipo: 'chip', nivel: dados.ativo === false ? 'AVISO' : 'INFO', texto: `${rotuloChip(chip)}: ${partes.join(', ')} manualmente.`, chipId: id, usuarioId });
  const hoje = await enviadosHojePorChip();
  return {
    id: chip.id,
    simNumero: chip.simNumero,
    operadora: chip.operadora,
    telefone: chip.telefone,
    ativo: chip.ativo,
    presente: chip.presente,
    falhasSeguidas: chip.falhasSeguidas,
    cotaDiaria: chip.cotaDiaria,
    cotaEfetiva: cotaEfetiva(chip),
    enviadosHoje: hoje.get(chip.id) ?? 0,
  };
}

/**
 * Vigia de um celular: lê saúde e chips, grava no banco e avisa quando o celular cai ou volta.
 * Celular fora do ar → os chips dele param de receber mensagens (o puxador só usa celular online).
 */
export async function sincronizarAparelho(id: number): Promise<void> {
  const ap = await prisma.aparelho.findUnique({ where: { id } });
  if (!ap || !ap.ativo) return;
  const cred = credenciais(ap);
  const s = await gate.saude(cred);
  let lista: gate.ChipInformado[] | null = null;
  if (s.online) {
    try {
      lista = await gate.chips(cred);
    } catch (e) {
      s.detalhe = e instanceof Error ? e.message : 'erro ao ler os chips';
    }
  }
  await prisma.aparelho.update({
    where: { id },
    data: { online: s.online, bateria: s.bateria ?? null, detalhe: s.detalhe ?? null, ...(s.online ? { ultimoContatoEm: new Date() } : {}) },
  });
  if (ap.online !== s.online)
    await registrarEvento({
      tipo: 'aparelho',
      nivel: s.online ? 'INFO' : 'AVISO',
      texto: s.online ? `Celular "${ap.nome}" respondeu. Os chips dele estão na roleta.` : `Celular "${ap.nome}" não respondeu (${s.detalhe ?? 'sem resposta'}). Os chips dele saíram da roleta.`,
    });
  if (!lista) return;
  const vistos: number[] = [];
  for (const c of lista) {
    vistos.push(c.simNumero);
    await prisma.chip.upsert({
      where: { aparelhoId_simNumero: { aparelhoId: id, simNumero: c.simNumero } },
      create: { aparelhoId: id, simNumero: c.simNumero, operadora: c.operadora, telefone: c.telefone, presente: true },
      update: { operadora: c.operadora, telefone: c.telefone, presente: true },
    });
  }
  await prisma.chip.updateMany({ where: { aparelhoId: id, simNumero: { notIn: vistos } }, data: { presente: false } });
}

export async function sincronizarTodos(): Promise<void> {
  const ativos = await prisma.aparelho.findMany({ where: { ativo: true }, select: { id: true } });
  await Promise.all(ativos.map((a) => sincronizarAparelho(a.id).catch(() => undefined)));
}

/** Chips que podem enviar (ativos, presentes, celular ativo e online). */
export async function chipsDisponiveis() {
  const chips = await prisma.chip.findMany({
    where: { ativo: true, presente: true, aparelho: { ativo: true, online: true } },
    select: { id: true, simNumero: true, operadora: true, telefone: true, aparelho: { select: { nome: true } } },
    orderBy: [{ aparelhoId: 'asc' }, { simNumero: 'asc' }],
  });
  return chips.map((c) => ({ id: c.id, rotulo: rotuloChip(c), aparelho: c.aparelho.nome, simNumero: c.simNumero, operadora: c.operadora, telefone: c.telefone }));
}
