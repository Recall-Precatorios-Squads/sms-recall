import { randomUUID } from 'node:crypto';
// A fila de mensagens: reservar com SKIP LOCKED, enviar pelo celular, acompanhar a entrega, recuperar órfãs.
// Garantia "no máximo uma vez": a mensagem fica ENVIANDO (gravado e confirmado no banco) ANTES de chamar o
// celular. Se o processo cair depois disso, ela nunca é reenviada sozinha — vira INCERTA.
import type { Aparelho, Chip } from '@prisma/client';
import { config, janelaAberta } from '../config.js';
import { prisma } from '../db.js';
import { log } from '../lib/log.js';
import { inicioDeHoje } from '../lib/tempo.js';
import { mascarar, sortearEspera } from '../lib/texto.js';
import * as gate from '../smsgate/adaptador.js';
import { FALHAS_PARA_PAUSAR_CHIP, credenciais } from '../servicos/aparelhos.js';
export { FALHAS_PARA_PAUSAR_CHIP };
import { registrarEvento, rotuloChip } from '../servicos/eventos.js';
import { atualizarMensagem } from '../servicos/mensagens.js';

export const MAX_TENTATIVAS = 3;
const ESPERA_RETRY_MS = [30_000, 120_000, 480_000];

type ChipComAparelho = Chip & { aparelho: Aparelho };
interface MensagemReservada {
  id: number;
  telefone: string;
  texto: string;
  tentativas: number;
  disparoId: number | null;
}
export interface Reserva {
  mensagem: MensagemReservada;
  chip: ChipComAparelho;
  espera: number;
}

/**
 * Reserva o próximo envio de UM chip, numa transação:
 * 1. trava o chip, se ele está livre, dentro da cota do dia e com o celular online (SKIP LOCKED: outro worker pula);
 * 2. trava a próxima mensagem PENDENTE (maior prioridade primeiro) de um disparo ativo ou avulsa da API;
 * 3. marca a mensagem ENVIANDO e agenda o próximo envio do chip (sorteio entre o mínimo e o máximo).
 */
export async function reservarEnvio(chipId: number): Promise<Reserva | null> {
  const hoje = inicioDeHoje();
  return prisma.$transaction(async (tx) => {
    const chip = await tx.$queryRaw<{ id: number }[]>`
      SELECT c.id FROM chips c JOIN aparelhos a ON a.id = c.aparelho_id
       WHERE c.id = ${chipId} AND c.ativo AND c.presente AND a.ativo AND a.online AND c.proximo_envio_em <= now()
         AND (SELECT count(*) FROM mensagens x WHERE x.chip_id = c.id AND x.enviando_em >= ${hoje}) < COALESCE(c.cota_diaria, ${config.cotaDiariaChip})
       FOR UPDATE OF c SKIP LOCKED`;
    if (!chip.length) return null;
    const msg = await tx.$queryRaw<{ id: number; min: number; max: number }[]>`
      SELECT m.id,
             COALESCE(d.intervalo_min_ms, m.intervalo_min_ms, ${config.intervaloApi.minMs})::int AS "min",
             COALESCE(d.intervalo_max_ms, m.intervalo_max_ms, ${config.intervaloApi.maxMs})::int AS "max"
        FROM mensagens m LEFT JOIN disparos d ON d.id = m.disparo_id
       WHERE m.status = 'PENDENTE' AND (m.disparo_id IS NULL OR d.status = 'ENVIANDO') AND m.proxima_tentativa_em <= now()
       ORDER BY m.prioridade DESC, m.id
       LIMIT 1
       FOR UPDATE OF m SKIP LOCKED`;
    const alvo = msg[0];
    if (!alvo) return null;
    const espera = sortearEspera(Number(alvo.min), Number(alvo.max));
    const mensagem = await tx.mensagem.update({
      where: { id: alvo.id },
      data: { status: 'ENVIANDO', chipId, enviandoEm: new Date(), tentativas: { increment: 1 }, detalhe: null },
      select: { id: true, telefone: true, texto: true, tentativas: true, disparoId: true },
    });
    const c = await tx.chip.update({ where: { id: chipId }, data: { proximoEnvioEm: new Date(Date.now() + espera) }, include: { aparelho: true } });
    return { mensagem, chip: c, espera };
  });
}

/** Chama o celular e grava o resultado. Nunca lança. */
export async function enviarReservada({ mensagem, chip }: Reserva): Promise<void> {
  const rotulo = rotuloChip(chip);
  try {
    // Um id único por TENTATIVA: o app recusa id repetido ("Message with the same ID already exists"),
    // e os ids do banco recomeçam quando ele é zerado; o trecho aleatório evita colisão com o histórico do celular.
    const r = await gate.enviar(credenciais(chip.aparelho), { id: `sms-${mensagem.id}-${mensagem.tentativas}-${randomUUID().slice(0, 8)}`, texto: mensagem.texto, e164: mensagem.telefone, simNumero: chip.simNumero });
    await atualizarMensagem(mensagem.id, { status: r.estado === 'ENTREGUE' ? 'ENTREGUE' : 'ACEITA', idExterno: r.idExterno, aceitaEm: new Date() });
    log('sms.aceito', { mensagemId: mensagem.id, chipId: chip.id, para: mascarar(mensagem.telefone) });
  } catch (e) {
    const motivo = e instanceof Error ? e.message : 'erro desconhecido';
    if (e instanceof gate.ErroGate && e.tipo === 'RECUSADO') return falhou(mensagem, chip, `o celular recusou: ${motivo}`);
    // Sem resposta (ou senha recusada no meio): pode ter saído. Não reenvia.
    await atualizarMensagem(mensagem.id, { status: 'INCERTA', detalhe: `sem resposta do ${rotulo} (${motivo}); confira no celular se saiu` });
    await contarFalhaDoChip(chip);
    await registrarEvento({ tipo: 'envio', nivel: 'AVISO', texto: `Mensagem ${mensagem.id} ficou INCERTA: ${rotulo} ${motivo}. Ela não será reenviada sozinha (veja Revisão).`, chipId: chip.id, disparoId: mensagem.disparoId });
  }
}

/** O SMS comprovadamente NÃO saiu: tenta de novo (por qualquer chip livre) com espera crescente, até MAX_TENTATIVAS. */
async function falhou(mensagem: { id: number; tentativas: number; disparoId: number | null }, chip: { id: number }, motivo: string): Promise<void> {
  const { tentativas } = mensagem;
  const disparo = mensagem.disparoId ? await prisma.disparo.findUnique({ where: { id: mensagem.disparoId }, select: { status: true } }) : null;
  if (disparo?.status === 'CANCELADO') {
    await atualizarMensagem(mensagem.id, { status: 'CANCELADA', detalhe: `falhou (${motivo}) e o disparo foi cancelado; não será tentada de novo` });
  } else if (tentativas < MAX_TENTATIVAS) {
    const espera = ESPERA_RETRY_MS[Math.min(tentativas - 1, ESPERA_RETRY_MS.length - 1)] ?? 480_000;
    await prisma.$transaction([
      prisma.mensagem.update({
        where: { id: mensagem.id },
        data: { status: 'PENDENTE', chipId: null, idExterno: null, proximaTentativaEm: new Date(Date.now() + espera), detalhe: `tentativa ${tentativas} falhou (${motivo}); nova tentativa em ${Math.round(espera / 1000)} s` },
      }),
      // A falha pode chegar depois de o disparo ser fechado (o relatório vem depois do envio): reabre para a nova tentativa sair.
      prisma.disparo.updateMany({ where: { id: mensagem.disparoId ?? -1, status: 'CONCLUIDO' }, data: { status: 'ENVIANDO', terminadoEm: null } }),
    ]);
  } else {
    await atualizarMensagem(mensagem.id, { status: 'FALHOU', detalhe: `falhou ${tentativas} vez(es); última: ${motivo}` });
  }
  await contarFalhaDoChip(chip);
}

async function contarFalhaDoChip(chip: { id: number }): Promise<void> {
  const c = await prisma.chip.update({ where: { id: chip.id }, data: { falhasSeguidas: { increment: 1 } }, include: { aparelho: { select: { nome: true } } } });
  if (c.falhasSeguidas === FALHAS_PARA_PAUSAR_CHIP && c.ativo) {
    await prisma.chip.update({ where: { id: c.id }, data: { ativo: false } });
    await registrarEvento({
      tipo: 'chip',
      nivel: 'ERRO',
      texto: `${rotuloChip(c)} saiu da roleta depois de ${FALHAS_PARA_PAUSAR_CHIP} falhas seguidas (pode estar bloqueado ou sem crédito). Confira o chip e reative em Aparelhos e chips.`,
      chipId: c.id,
    });
  }
}

/** Um ciclo do puxador: fora da janela não faz nada; dentro, para cada chip livre reserva e envia em paralelo. */
export async function cicloDeEnvio(agora = new Date()): Promise<number> {
  if (!janelaAberta(agora)) return 0;
  const livres = await prisma.$queryRaw<{ id: number }[]>`
    SELECT c.id FROM chips c JOIN aparelhos a ON a.id = c.aparelho_id
     WHERE c.ativo AND c.presente AND a.ativo AND a.online AND c.proximo_envio_em <= now()
     ORDER BY c.proximo_envio_em`;
  if (!livres.length) return 0;
  const reservas: Reserva[] = [];
  for (const { id } of livres) {
    const r = await reservarEnvio(id);
    if (r) reservas.push(r);
  }
  await Promise.all(reservas.map(enviarReservada));
  return reservas.length;
}

/** Acompanhador: pergunta ao celular o status das mensagens aceitas. */
export async function acompanharEntregas({ limite = 200 } = {}): Promise<void> {
  const lista = await prisma.mensagem.findMany({
    where: { status: { in: ['ACEITA', 'ENVIADA'] }, idExterno: { not: null } },
    select: { id: true, idExterno: true, tentativas: true, disparoId: true, aceitaEm: true, chip: { include: { aparelho: true } } },
    orderBy: { atualizadoEm: 'asc' },
    take: limite,
  });
  for (const m of lista) {
    if (!m.chip || !m.idExterno) continue;
    if (m.aceitaEm && Date.now() - m.aceitaEm.getTime() > 24 * 3_600_000) {
      await atualizarMensagem(m.id, { status: 'SEM_CONFIRMACAO', detalhe: 'a operadora não mandou relatório de entrega em 24 h' });
      continue;
    }
    let r: Awaited<ReturnType<typeof gate.consultar>>;
    try {
      r = await gate.consultar(credenciais(m.chip.aparelho), m.idExterno);
    } catch {
      continue; // celular fora: tenta de novo no próximo ciclo
    }
    if (r.estado === 'ENTREGUE') {
      await atualizarMensagem(m.id, { status: 'ENTREGUE', entregueEm: new Date(), detalhe: null });
      await prisma.chip.update({ where: { id: m.chip.id }, data: { falhasSeguidas: 0 } });
    } else if (r.estado === 'ENVIADA') {
      await prisma.mensagem.updateMany({ where: { id: m.id, status: 'ACEITA' }, data: { status: 'ENVIADA' } });
    } else if (r.estado === 'FALHOU') {
      // O celular informou que não conseguiu enviar: é seguro tentar de novo.
      await falhou(m, m.chip, r.motivo ?? 'o celular informou falha no envio');
    }
  }
}

/** Ceifador: ENVIANDO sem resposta por mais de 2 min (processo caiu no meio) vira INCERTA. */
export async function recuperarOrfas(): Promise<number> {
  const presas = await prisma.mensagem.findMany({ where: { status: 'ENVIANDO', enviandoEm: { lt: new Date(Date.now() - 2 * 60_000) } }, select: { id: true } });
  for (const m of presas) await atualizarMensagem(m.id, { status: 'INCERTA', detalhe: 'o serviço parou enquanto enviava esta mensagem; confira no celular se saiu' });
  if (presas.length)
    await registrarEvento({ tipo: 'envio', nivel: 'AVISO', texto: `${presas.length} mensagem(ns) ficaram INCERTAS porque o serviço parou no meio do envio. Elas não serão reenviadas sozinhas (veja Revisão).` });
  return presas.length;
}

/** Fecha os disparos que não têm mais nada para sair. */
export async function concluirDisparos(): Promise<void> {
  const ativos = await prisma.disparo.findMany({ where: { status: 'ENVIANDO' }, select: { id: true, nome: true } });
  for (const d of ativos) {
    const restantes = await prisma.mensagem.count({ where: { disparoId: d.id, status: { in: ['PENDENTE', 'RESERVADA', 'ENVIANDO'] } } });
    if (restantes) continue;
    const { count } = await prisma.disparo.updateMany({ where: { id: d.id, status: 'ENVIANDO' }, data: { status: 'CONCLUIDO', terminadoEm: new Date() } });
    if (count) await registrarEvento({ tipo: 'disparo', texto: `Disparo "${d.nome}": todas as mensagens saíram para os celulares. Acompanhe as entregas.`, disparoId: d.id });
  }
}
