// Configuração lida do ambiente. Em produção o compose injeta o .env.
import { createHash } from 'node:crypto';
import { hostname } from 'node:os';

const e = process.env;
const num = (v: string | undefined, padrao: number): number => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : padrao);

/** "08:00-20:00" → início e fim em minutos desde 0h. */
function lerJanela(v: string | undefined): { inicio: string; fim: string; inicioMin: number; fimMin: number } {
  const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec((v || '08:00-20:00').trim());
  if (!m) throw new Error('JANELA_ENVIO inválida: use o formato 08:00-20:00');
  return { inicio: `${m[1]}:${m[2]}`, fim: `${m[3]}:${m[4]}`, inicioMin: Number(m[1]) * 60 + Number(m[2]), fimMin: Number(m[3]) * 60 + Number(m[4]) };
}

export const config = {
  porta: num(e.PORT, 3000),
  host: e.HOST ?? '127.0.0.1',
  appSecret: e.APP_SECRET ?? '',
  admin: { email: e.ADMIN_EMAIL ?? '', nome: e.ADMIN_NOME || 'Administrador', senha: e.ADMIN_SENHA ?? '' },
  fuso: e.TZ_TELA || 'America/Sao_Paulo',
  // Endereço que já vem preenchido em "Adicionar celular" (o IP do celular na Wi-Fi da empresa).
  celularUrlPadrao: e.CELULAR_URL_PADRAO ?? '',
  // SMSGATE_SIMULADO=1: nenhum SMS sai; os celulares são imitados (ensaio e testes).
  simulado: e.SMSGATE_SIMULADO === '1',
  sessaoHoras: num(e.SESSAO_HORAS, 12),
  // Fora da janela nada sai: as mensagens esperam na fila.
  janela: lerJanela(e.JANELA_ENVIO),
  // Limite por chip por dia (o chip pode ter o próprio, na tela Aparelhos e chips).
  cotaDiariaChip: num(e.COTA_DIARIA_CHIP, 167),
  // Intervalo por chip das mensagens que chegam pela API /v1 (o disparo da tela escolhe o dele).
  intervaloApi: { minMs: num(e.INTERVALO_API_MIN_SEGUNDOS, 45) * 1000, maxMs: num(e.INTERVALO_API_MAX_SEGUNDOS, 80) * 1000 },
  alertas: {
    telegramToken: e.TELEGRAM_BOT_TOKEN ?? '',
    telegramChatId: e.TELEGRAM_CHAT_ID ?? '',
    // Webhook genérico (Slack, Google Chat, Teams...): recebe POST {"text": "..."}.
    webhookUrl: e.ALERTA_WEBHOOK_URL ?? '',
  },
  // Pasta dos backups vista pelo worker (avisa se o backup do dia não rodou). Vazio = não confere.
  pastaBackups: e.PASTA_BACKUPS ?? '',
  worker: {
    id: e.WORKER_ID || hostname(),
    tickMs: num(e.WORKER_TICK_MS, 1000),
    acompanharMs: num(e.WORKER_ACOMPANHAR_MS, 15_000),
    vigiarMs: num(e.WORKER_VIGIAR_MS, 30_000),
    ceifarMs: num(e.WORKER_CEIFAR_MS, 60_000),
    notificarMs: num(e.WORKER_NOTIFICAR_MS, 5_000),
  },
};

export function validarConfig(): void {
  if (!config.appSecret || config.appSecret.length < 32) throw new Error('APP_SECRET ausente ou curto (mínimo 32 caracteres). Veja o .env.example.');
}

/** Chave de 32 bytes derivada do APP_SECRET (cifra das senhas dos celulares). */
export function chaveCifra(): Buffer {
  return createHash('sha256').update(`cifra:${config.appSecret}`).digest();
}

/** Minutos desde 0h no fuso da tela. */
export function minutoDoDia(agora = new Date()): number {
  const [h = 0, m = 0] = new Intl.DateTimeFormat('en-GB', { timeZone: config.fuso, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(agora).split(':').map(Number);
  return h * 60 + m;
}

export function janelaAberta(agora = new Date()): boolean {
  const { inicioMin, fimMin } = config.janela;
  const m = minutoDoDia(agora);
  return inicioMin <= fimMin ? m >= inicioMin && m < fimMin : m >= inicioMin || m < fimMin;
}
