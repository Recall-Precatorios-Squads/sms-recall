// Apoio dos testes: banco limpo, usuário, celular simulado com 2 chips.
import { prisma } from '../src/db.js';
import { cifrar } from '../src/lib/cripto.js';

/** 12:00 em São Paulo (dentro da janela 08:00-20:00) e 23:00 (fora). */
export const MEIO_DIA = new Date('2026-11-11T15:00:00Z');
export const NOITE = new Date('2026-11-12T02:00:00Z');

export async function limpar(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE respostas, avisos, alertas, eventos, mensagens, disparos, chips, aparelhos, sessoes, bloqueios, times, tentativas_login, batidas_worker, usuarios RESTART IDENTITY CASCADE',
  );
}

export async function cenario() {
  await limpar();
  const usuario = await prisma.usuario.create({ data: { email: 'op@teste.local', nome: 'Op', senhaHash: 'x' } });
  const ap = await prisma.aparelho.create({ data: { nome: 'Celular 1', url: 'http://x', usuario: 'u', senhaCifrada: cifrar('s'), online: true } });
  const chips = await Promise.all([1, 2].map((n) => prisma.chip.create({ data: { aparelhoId: ap.id, simNumero: n } })));
  return { usuario, ap, chips };
}

export async function criarDisparoDireto(usuarioId: number, telefones: string[], { minMs = 60_000, maxMs = 60_000 } = {}) {
  const d = await prisma.disparo.create({ data: { nome: 'teste', criadoPorId: usuarioId, intervaloMinMs: minMs, intervaloMaxMs: maxMs, total: telefones.length } });
  await prisma.mensagem.createMany({ data: telefones.map((t, i) => ({ disparoId: d.id, telefone: t, texto: `msg ${i}` })) });
  return d;
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
