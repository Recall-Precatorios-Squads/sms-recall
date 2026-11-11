// Configuração lida do ambiente. Em produção o compose injeta o .env.
import { createHash } from 'node:crypto';

const e = process.env;

export const config = {
  porta: Number(e.PORT ?? 3000),
  host: e.HOST ?? '127.0.0.1',
  appSecret: e.APP_SECRET ?? '',
  admin: { email: e.ADMIN_EMAIL ?? '', nome: e.ADMIN_NOME || 'Administrador', senha: e.ADMIN_SENHA ?? '' },
  fuso: e.TZ_TELA || 'America/Sao_Paulo',
  // Endereço que já vem preenchido em "Adicionar celular" (o IP do celular na Wi-Fi da empresa).
  celularUrlPadrao: e.CELULAR_URL_PADRAO ?? '',
  // SMSGATE_SIMULADO=1: nenhum SMS sai; os celulares são imitados (ensaio e testes).
  simulado: e.SMSGATE_SIMULADO === '1',
  sessaoHoras: Number(e.SESSAO_HORAS ?? 12),
  worker: {
    tickMs: Number(e.WORKER_TICK_MS ?? 1000),
    acompanharMs: Number(e.WORKER_ACOMPANHAR_MS ?? 15_000),
    vigiarMs: Number(e.WORKER_VIGIAR_MS ?? 30_000),
    ceifarMs: Number(e.WORKER_CEIFAR_MS ?? 60_000),
  },
};

export function validarConfig() {
  if (!config.appSecret || config.appSecret.length < 32) throw new Error('APP_SECRET ausente ou curto (mínimo 32 caracteres). Veja o .env.example.');
}

/** Chave de 32 bytes derivada do APP_SECRET (cifra das senhas dos celulares). */
export function chaveCifra() {
  return createHash('sha256').update(`cifra:${config.appSecret}`).digest();
}
