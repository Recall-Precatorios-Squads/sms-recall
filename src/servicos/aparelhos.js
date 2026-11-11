// Celulares e chips: cadastro, teste e sincronização com o que o app sms-gate informa.
import { prisma } from '../db.js';
import { cifrar, decifrar } from '../lib/cripto.js';
import * as gate from '../smsgate/adaptador.js';
import { registrarEvento, rotuloChip } from './eventos.js';

const SELECT_APARELHO = {
  id: true, nome: true, url: true, usuario: true, ativo: true, online: true, bateria: true, detalhe: true, ultimoContatoEm: true,
  chips: { select: { id: true, simNumero: true, operadora: true, telefone: true, ativo: true, presente: true, falhasSeguidas: true }, orderBy: { simNumero: 'asc' } },
};

export const listarAparelhos = () => prisma.aparelho.findMany({ select: SELECT_APARELHO, orderBy: { nome: 'asc' } });

/** Credenciais para o adaptador (senha decifrada só em memória, na hora de usar). */
export function credenciais(ap) {
  return { nome: ap.nome, url: ap.url, usuario: ap.usuario, senha: decifrar(ap.senhaCifrada) };
}

export async function criarAparelho({ nome, url, usuario, senha }, usuarioId) {
  const ap = await prisma.aparelho.create({ data: { nome, url, usuario, senhaCifrada: cifrar(senha) }, select: { id: true } });
  await registrarEvento({ tipo: 'aparelho', texto: `Celular "${nome}" cadastrado.`, usuarioId });
  await sincronizarAparelho(ap.id);
  return prisma.aparelho.findUnique({ where: { id: ap.id }, select: SELECT_APARELHO });
}

export async function editarAparelho(id, dados, usuarioId) {
  const data = {};
  for (const k of ['nome', 'url', 'usuario', 'ativo']) if (dados[k] !== undefined) data[k] = dados[k];
  if (dados.senha) data.senhaCifrada = cifrar(dados.senha);
  const ap = await prisma.aparelho.update({ where: { id }, data, select: { nome: true } });
  const oQue = dados.ativo === false ? 'desativado (os chips saem da roleta)' : dados.ativo === true ? 'ativado' : 'editado';
  await registrarEvento({ tipo: 'aparelho', texto: `Celular "${ap.nome}" ${oQue}.`, usuarioId });
  if (dados.ativo !== false) await sincronizarAparelho(id);
  return prisma.aparelho.findUnique({ where: { id }, select: SELECT_APARELHO });
}

export async function testarAparelho(id, usuarioId) {
  const ap = await prisma.aparelho.findUnique({ where: { id } });
  if (!ap) return null;
  const r = await gate.testar(credenciais(ap));
  await registrarEvento({ tipo: 'teste', nivel: r.ok ? 'INFO' : 'ERRO', texto: `Teste de conexão: ${r.mensagem}`, usuarioId });
  await sincronizarAparelho(id);
  return r;
}

export async function alternarChip(id, ativo, usuarioId) {
  const chip = await prisma.chip.update({ where: { id }, data: { ativo, ...(ativo ? { falhasSeguidas: 0 } : {}) }, include: { aparelho: { select: { nome: true } } } });
  await registrarEvento({ tipo: 'chip', nivel: ativo ? 'INFO' : 'AVISO', texto: `${rotuloChip(chip)} ${ativo ? 'ativado' : 'desativado'} manualmente.`, chipId: id, usuarioId });
  return { id: chip.id, simNumero: chip.simNumero, operadora: chip.operadora, telefone: chip.telefone, ativo: chip.ativo, presente: chip.presente, falhasSeguidas: chip.falhasSeguidas };
}

/**
 * Vigia de um celular: lê saúde e chips, grava no banco e avisa quando o celular cai ou volta.
 * Celular fora do ar → os chips dele param de receber mensagens (o puxador só usa celular online).
 */
export async function sincronizarAparelho(id) {
  const ap = await prisma.aparelho.findUnique({ where: { id } });
  if (!ap || !ap.ativo) return;
  const cred = credenciais(ap);
  const s = await gate.saude(cred);
  let lista = null;
  if (s.online) {
    try {
      lista = await gate.chips(cred);
    } catch (e) {
      s.detalhe = e.message;
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
  const vistos = new Set();
  for (const c of lista) {
    vistos.add(c.simNumero);
    await prisma.chip.upsert({
      where: { aparelhoId_simNumero: { aparelhoId: id, simNumero: c.simNumero } },
      create: { aparelhoId: id, simNumero: c.simNumero, operadora: c.operadora, telefone: c.telefone, presente: true },
      update: { operadora: c.operadora, telefone: c.telefone, presente: true },
    });
  }
  await prisma.chip.updateMany({ where: { aparelhoId: id, simNumero: { notIn: [...vistos] } }, data: { presente: false } });
}

export async function sincronizarTodos() {
  const ativos = await prisma.aparelho.findMany({ where: { ativo: true }, select: { id: true } });
  await Promise.all(ativos.map((a) => sincronizarAparelho(a.id).catch(() => {})));
}

/** Chips que podem enviar agora (ativos, presentes, celular ativo e online). */
export async function chipsDisponiveis() {
  const chips = await prisma.chip.findMany({
    where: { ativo: true, presente: true, aparelho: { ativo: true, online: true } },
    select: { id: true, simNumero: true, operadora: true, telefone: true, aparelho: { select: { nome: true } } },
    orderBy: [{ aparelhoId: 'asc' }, { simNumero: 'asc' }],
  });
  return chips.map((c) => ({ id: c.id, rotulo: rotuloChip(c), aparelho: c.aparelho.nome, simNumero: c.simNumero, operadora: c.operadora, telefone: c.telefone }));
}
