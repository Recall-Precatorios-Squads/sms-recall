// Disparos por planilha: validação, criação das mensagens na fila, cancelamento e resumo.
import { prisma } from '../db.js';
import { aplicarModelo, contarSegmentos, mascarar, normalizarTelefone } from '../lib/texto.js';
import { chipsDisponiveis } from './aparelhos.js';
import { registrarEvento, rotuloChip } from './eventos.js';

export const LIMITES = { contatos: 500, modelos: 20, caracteres: 640, intervaloMin: 1, intervaloMax: 600 };

export const ROTULOS = {
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
export const FINAIS = new Set(['ENTREGUE', 'FALHOU', 'INCERTA', 'CANCELADA', 'SEM_CONFIRMACAO']);

class ErroNegocio extends Error {
  constructor(status, codigo, mensagem, detalhes = {}) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}
export { ErroNegocio };

/**
 * dados: { nome?, contatos:[{linha?, telefone, nome?, mensagem?}], mensagens:[modelo], intervaloMinSegundos, intervaloMaxSegundos }
 * Cada contato recebe a mensagem própria da linha ou o próximo texto da roleta (com {nome}).
 */
export async function criarDisparo(dados, usuario) {
  const modelos = dados.mensagens.map((m) => m.trim()).filter(Boolean);
  if (dados.intervaloMinSegundos > dados.intervaloMaxSegundos) throw new ErroNegocio(422, 'INTERVALO_INVALIDO', 'O intervalo mínimo não pode ser maior que o máximo.');

  const vistos = new Set();
  const itens = [];
  const problemas = [];
  let duplicados = 0;
  let iModelo = 0;
  dados.contatos.forEach((c, i) => {
    const linha = c.linha ?? i + 2;
    const tel = normalizarTelefone(typeof c.telefone === 'number' ? c.telefone : String(c.telefone ?? ''));
    if (!tel) return problemas.push({ linha, motivo: 'telefone inválido' });
    if (vistos.has(tel.digitos)) return (duplicados += 1);
    vistos.add(tel.digitos);
    const nome = (c.nome ?? '').trim().slice(0, 80);
    const propria = (c.mensagem ?? '').trim() || null;
    if (!propria && !modelos.length) return problemas.push({ linha, motivo: 'sem mensagem (nem na planilha, nem na roleta)' });
    const indice = propria ? null : (iModelo++ % modelos.length) + 1;
    const texto = aplicarModelo(propria ?? modelos[indice - 1], { nome });
    if (!texto) return problemas.push({ linha, motivo: 'mensagem vazia' });
    if (texto.length > LIMITES.caracteres) return problemas.push({ linha, motivo: `mensagem passa de ${LIMITES.caracteres} caracteres` });
    itens.push({ linha, telefone: tel.e164, nome: nome || null, texto, indiceAbordagem: indice });
  });
  if (problemas.length) throw new ErroNegocio(422, 'PLANILHA_COM_ERROS', `${problemas.length} linha(s) com problema. Corrija e tente de novo.`, { problemas: problemas.slice(0, 50) });
  if (!itens.length) throw new ErroNegocio(422, 'SEM_CONTATOS', 'Nenhum contato válido depois de tirar os repetidos.');

  const chips = await chipsDisponiveis();
  if (!chips.length) throw new ErroNegocio(503, 'CHIPS_INDISPONIVEIS', 'Nenhum chip disponível. Veja a tela Aparelhos e chips.');

  const nome = dados.nome?.trim() ? dados.nome.trim().slice(0, 80) : `Disparo de ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
  const disparo = await prisma.$transaction(async (tx) => {
    const d = await tx.disparo.create({
      data: {
        nome,
        criadoPorId: usuario.id,
        intervaloMinMs: Math.round(dados.intervaloMinSegundos * 1000),
        intervaloMaxMs: Math.round(dados.intervaloMaxSegundos * 1000),
        total: itens.length,
        abordagens: modelos.length,
        duplicados,
      },
      select: { id: true },
    });
    await tx.mensagem.createMany({ data: itens.map((it) => ({ ...it, disparoId: d.id })) });
    const sms = itens.reduce((t, it) => t + contarSegmentos(it.texto).segmentos, 0);
    await registrarEvento(
      {
        tipo: 'disparo',
        texto: `Disparo "${nome}" criado por ${usuario.nome}: ${itens.length} contato(s), ${modelos.length} abordagem(ns), ~${sms} SMS cobrados, ${chips.length} chip(s) disponíveis, cada chip espera ${dados.intervaloMinSegundos} a ${dados.intervaloMaxSegundos} s entre envios.`,
        disparoId: d.id,
        usuarioId: usuario.id,
      },
      tx,
    );
    return d;
  });
  return resumoDisparo(disparo.id);
}

export async function cancelarDisparo(id, usuario) {
  const d = await prisma.disparo.findUnique({ where: { id }, select: { status: true, nome: true } });
  if (!d) throw new ErroNegocio(404, 'NAO_ENCONTRADO', 'Disparo não encontrado.');
  if (d.status !== 'ENVIANDO') throw new ErroNegocio(409, 'JA_TERMINOU', 'Este disparo já terminou.');
  await prisma.$transaction(async (tx) => {
    // Só o que ainda não saiu. O que está ENVIANDO/ACEITA já está com o celular e segue o curso.
    const { count } = await tx.mensagem.updateMany({ where: { disparoId: id, status: 'PENDENTE' }, data: { status: 'CANCELADA', detalhe: `cancelada por ${usuario.nome}` } });
    await tx.disparo.update({ where: { id }, data: { status: 'CANCELADO', terminadoEm: new Date() } });
    await registrarEvento({ tipo: 'disparo', nivel: 'AVISO', texto: `Disparo "${d.nome}" cancelado por ${usuario.nome}: ${count} mensagem(ns) que ainda não tinham saído foram canceladas.`, disparoId: id, usuarioId: usuario.id }, tx);
  });
  return { mensagem: 'Disparo cancelado: as mensagens que ainda não saíram não serão enviadas.' };
}

function contagemDe(grupos) {
  const c = { total: 0, naFila: 0, enviando: 0, aguardando: 0, entregues: 0, falhas: 0, canceladas: 0, incertas: 0 };
  for (const g of grupos) {
    const n = g._count._all;
    c.total += n;
    if (g.status === 'PENDENTE' || g.status === 'RESERVADA') c.naFila += n;
    else if (g.status === 'ENVIANDO') c.enviando += n;
    else if (g.status === 'ACEITA' || g.status === 'ENVIADA' || g.status === 'SEM_CONFIRMACAO') c.aguardando += n;
    else if (g.status === 'ENTREGUE') c.entregues += n;
    else if (g.status === 'FALHOU') c.falhas += n;
    else if (g.status === 'CANCELADA') c.canceladas += n;
    else if (g.status === 'INCERTA') c.incertas += n;
  }
  return c;
}

const SELECT_RESUMO = {
  id: true, nome: true, status: true, criadoEm: true, terminadoEm: true, intervaloMinMs: true, intervaloMaxMs: true, total: true, abordagens: true, duplicados: true,
  criadoPor: { select: { id: true, nome: true } },
};

export async function resumoDisparo(id) {
  const d = await prisma.disparo.findUnique({ where: { id }, select: SELECT_RESUMO });
  if (!d) return null;
  const grupos = await prisma.mensagem.groupBy({ by: ['status'], where: { disparoId: id }, _count: { _all: true } });
  return { ...d, contagem: contagemDe(grupos) };
}

export async function listarDisparos({ page, size }) {
  const [total, lista] = await Promise.all([
    prisma.disparo.count(),
    prisma.disparo.findMany({ select: SELECT_RESUMO, orderBy: { id: 'desc' }, skip: (page - 1) * size, take: size }),
  ]);
  const ids = lista.map((d) => d.id);
  const grupos = ids.length ? await prisma.mensagem.groupBy({ by: ['disparoId', 'status'], where: { disparoId: { in: ids } }, _count: { _all: true } }) : [];
  const data = lista.map((d) => ({ ...d, contagem: contagemDe(grupos.filter((g) => g.disparoId === d.id)) }));
  return { data, page, size, total };
}

export async function detalheDisparo(id) {
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
      rotulo: ROTULOS[m.status] ?? m.status,
      detalhe: m.detalhe,
      atualizadoEm: m.atualizadoEm,
      entregueEm: m.entregueEm,
      final: FINAIS.has(m.status),
      entregue: m.status === 'ENTREGUE',
      falhou: m.status === 'FALHOU' || m.status === 'INCERTA',
    })),
  };
}
