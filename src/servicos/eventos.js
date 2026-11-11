// Trilha de eventos (imutável: só insere). Texto já sem telefone completo e sem conteúdo de mensagem.
import { prisma } from '../db.js';
import { log } from '../lib/log.js';

export async function registrarEvento({ tipo, nivel = 'INFO', texto, disparoId = null, chipId = null, usuarioId = null }, db = prisma) {
  log(`evento.${tipo}`, { nivel, texto, disparoId, chipId, usuarioId });
  return db.evento.create({ data: { tipo, nivel, texto, disparoId, chipId, usuarioId } });
}

export function rotuloChip(chip) {
  if (!chip) return null;
  return `${chip.aparelho?.nome ?? 'Celular'} · Chip ${chip.simNumero}${chip.operadora ? ` · ${chip.operadora}` : ''}`;
}
