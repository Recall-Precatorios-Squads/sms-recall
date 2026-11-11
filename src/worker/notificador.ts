// Entrega das duas outboxes: alertas para a TI (Telegram e/ou webhook) e avisos de status para os times.
// Regra: erro 4xx do destino não é repetido (é configuração errada, repetir só multiplica o efeito);
// rede fora ou 5xx tenta de novo com espera crescente, até 5 vezes.
import { createHmac } from 'node:crypto';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { log } from '../lib/log.js';
import { ROTULOS } from '../servicos/mensagens.js';

const MAX = 5;
const ESPERAS = [30_000, 120_000, 600_000, 1_800_000, 3_600_000];

class ErroDestino extends Error {
  constructor(
    mensagem: string,
    public readonly definitivo: boolean,
  ) {
    super(mensagem);
  }
}

async function postar(url: string, corpo: unknown, headers: Record<string, string> = {}): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    throw new ErroDestino(e instanceof Error && e.name === 'TimeoutError' ? 'não respondeu em 10 s' : 'não encontrado', false);
  }
  if (res.ok) return;
  throw new ErroDestino(`respondeu HTTP ${res.status}`, res.status >= 400 && res.status < 500 && res.status !== 429);
}

export const canaisDeAlerta = (): string[] => [config.alertas.telegramToken && config.alertas.telegramChatId ? 'telegram' : '', config.alertas.webhookUrl ? 'webhook' : ''].filter(Boolean);

async function mandarAlerta(texto: string): Promise<void> {
  const { telegramToken, telegramChatId, webhookUrl } = config.alertas;
  if (telegramToken && telegramChatId) await postar(`https://api.telegram.org/bot${telegramToken}/sendMessage`, { chat_id: telegramChatId, text: texto, disable_web_page_preview: true });
  if (webhookUrl) await postar(webhookUrl, { text: texto });
}

function proximo(tentativas: number): Date {
  return new Date(Date.now() + (ESPERAS[Math.min(tentativas, ESPERAS.length - 1)] ?? 3_600_000));
}

/** Ids vencidos de uma outbox, pelo relógio do BANCO (o mesmo que preencheu proxima_tentativa_em). */
async function vencidos(tabela: 'alertas' | 'avisos', limite: number): Promise<number[]> {
  const linhas = tabela === 'alertas'
    ? await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM alertas WHERE status = 'PENDENTE' AND proxima_tentativa_em <= now() ORDER BY id LIMIT ${limite}`
    : await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM avisos WHERE status = 'PENDENTE' AND proxima_tentativa_em <= now() ORDER BY id LIMIT ${limite}`;
  return linhas.map((l) => l.id);
}

/** Alertas pendentes → canal da TI. Sem canal configurado, o alerta fica registrado como não enviado (aparece nos logs). */
export async function enviarAlertas(): Promise<number> {
  const ids = await vencidos('alertas', 20);
  if (!ids.length) return 0;
  const lista = await prisma.alerta.findMany({ where: { id: { in: ids } }, include: { evento: true }, orderBy: { id: 'asc' } });
  if (!lista.length) return 0;
  if (!canaisDeAlerta().length) {
    await prisma.alerta.updateMany({ where: { id: { in: lista.map((a) => a.id) } }, data: { status: 'FALHOU', erro: 'nenhum canal de alerta configurado (TELEGRAM_* ou ALERTA_WEBHOOK_URL)' } });
    return 0;
  }
  let enviados = 0;
  for (const a of lista) {
    const icone = a.evento.nivel === 'ERRO' ? '[ERRO]' : '[AVISO]';
    try {
      await mandarAlerta(`${icone} Serviço de SMS: ${a.evento.texto}`);
      await prisma.alerta.update({ where: { id: a.id }, data: { status: 'ENVIADO', enviadoEm: new Date(), tentativas: { increment: 1 }, erro: null } });
      enviados += 1;
    } catch (e) {
      const erro = e instanceof Error ? e.message : 'erro';
      const fim = (e instanceof ErroDestino && e.definitivo) || a.tentativas + 1 >= MAX;
      await prisma.alerta.update({ where: { id: a.id }, data: { tentativas: { increment: 1 }, erro, ...(fim ? { status: 'FALHOU' } : { proximaTentativaEm: proximo(a.tentativas) }) } });
      log('alerta.falhou', { alertaId: a.id, erro, definitivo: fim }, 'error');
    }
  }
  return enviados;
}

/**
 * Assinatura do aviso: HMAC-SHA256 do corpo, com chave = SHA-256 (hex) da chave de API do time.
 * O time confere com a própria chave, sem precisarmos guardar outro segredo.
 */
export function assinar(corpo: string, chaveHashHex: string): string {
  return createHmac('sha256', chaveHashHex).update(corpo).digest('hex');
}

/** Avisos pendentes → webhook de cada time. */
export async function enviarAvisos(): Promise<number> {
  const ids = await vencidos('avisos', 50);
  if (!ids.length) return 0;
  const lista = await prisma.aviso.findMany({
    where: { id: { in: ids } },
    include: { time: { select: { webhookUrl: true, chaveHash: true, ativo: true } }, mensagem: { select: { id: true, chaveIdempotencia: true, disparoId: true, entregueEm: true, detalhe: true } } },
    orderBy: { id: 'asc' },
  });
  let enviados = 0;
  for (const a of lista) {
    if (!a.time.webhookUrl || !a.time.ativo) {
      await prisma.aviso.update({ where: { id: a.id }, data: { status: 'FALHOU', erro: 'time sem webhook ou desativado' } });
      continue;
    }
    const status = a.statusMensagem as keyof typeof ROTULOS;
    const corpo = JSON.stringify({
      evento: 'mensagem.status',
      id: a.mensagem.id,
      chaveIdempotencia: a.mensagem.chaveIdempotencia,
      disparoId: a.mensagem.disparoId,
      status,
      rotulo: ROTULOS[status] ?? status,
      entregueEm: a.mensagem.entregueEm,
      avisoId: a.id,
    });
    try {
      let res: Response;
      try {
        res = await fetch(a.time.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SMS-Assinatura': assinar(corpo, a.time.chaveHash), 'X-SMS-Aviso-Id': String(a.id) }, body: corpo, signal: AbortSignal.timeout(10_000) });
      } catch (e) {
        throw new ErroDestino(e instanceof Error && e.name === 'TimeoutError' ? 'não respondeu em 10 s' : 'não encontrado', false);
      }
      if (!res.ok) throw new ErroDestino(`respondeu HTTP ${res.status}`, res.status >= 400 && res.status < 500 && res.status !== 429);
      await prisma.aviso.update({ where: { id: a.id }, data: { status: 'ENVIADO', enviadoEm: new Date(), tentativas: { increment: 1 }, erro: null } });
      enviados += 1;
    } catch (e) {
      const erro = e instanceof Error ? e.message : 'erro';
      const fim = (e instanceof ErroDestino && e.definitivo) || a.tentativas + 1 >= MAX;
      await prisma.aviso.update({ where: { id: a.id }, data: { tentativas: { increment: 1 }, erro, ...(fim ? { status: 'FALHOU' } : { proximaTentativaEm: proximo(a.tentativas) }) } });
    }
  }
  return enviados;
}
