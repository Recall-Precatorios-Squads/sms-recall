// Trilha de eventos (imutável: só insere). Texto já sem telefone completo e sem conteúdo de mensagem.
// Eventos graves também entram na outbox de alertas, NA MESMA TRANSAÇÃO: o worker manda o alerta depois.
import type { NivelEvento, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { log } from '../lib/log.js';

export type Db = Prisma.TransactionClient | typeof prisma;

export interface NovoEvento {
  tipo: string;
  nivel?: NivelEvento;
  texto: string;
  disparoId?: number | null;
  chipId?: number | null;
  usuarioId?: number | null;
}

export interface ChipRotulavel {
  simNumero: number;
  operadora?: string | null;
  aparelho?: { nome: string } | null;
}

/** Quais eventos viram alerta: todo ERRO, e AVISO de celular, chip, envio e backup. */
export function geraAlerta(nivel: NivelEvento, tipo: string): boolean {
  return nivel === 'ERRO' || (nivel === 'AVISO' && ['aparelho', 'chip', 'envio', 'backup', 'worker'].includes(tipo));
}

export async function registrarEvento({ tipo, nivel = 'INFO', texto, disparoId = null, chipId = null, usuarioId = null }: NovoEvento, db: Db = prisma) {
  log(`evento.${tipo}`, { nivel, texto, disparoId, chipId, usuarioId });
  const evento = await db.evento.create({ data: { tipo, nivel, texto, disparoId, chipId, usuarioId } });
  if (geraAlerta(nivel, tipo)) await db.alerta.create({ data: { eventoId: evento.id } });
  return evento;
}

export function rotuloChip(chip: ChipRotulavel | null | undefined): string | null {
  if (!chip) return null;
  return `${chip.aparelho?.nome ?? 'Celular'} · Chip ${chip.simNumero}${chip.operadora ? ` · ${chip.operadora}` : ''}`;
}
