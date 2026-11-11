// Sessão por cookie: token aleatório no navegador, só o hash dele no banco.
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { config } from '../config.js';

export const COOKIE = 'sms_sessao';
const hash = (t: string) => createHash('sha256').update(String(t)).digest('hex');

export async function criarSessao(usuarioId: number) {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(Date.now() + config.sessaoHoras * 3_600_000);
  await prisma.sessao.create({ data: { tokenHash: hash(token), usuarioId, expiraEm } });
  return { token, expiraEm };
}

export async function usuarioDaSessao(token: string | undefined) {
  if (!token) return null;
  const s = await prisma.sessao.findUnique({
    where: { tokenHash: hash(token) },
    select: { expiraEm: true, usuario: { select: { id: true, nome: true, email: true, papel: true, ativo: true } } },
  });
  if (!s || s.expiraEm < new Date() || !s.usuario.ativo) return null;
  return s.usuario;
}

export async function encerrarSessao(token: string | undefined) {
  if (token) await prisma.sessao.deleteMany({ where: { tokenHash: hash(token) } });
}

export async function encerrarSessoesDoUsuario(usuarioId: number) {
  await prisma.sessao.deleteMany({ where: { usuarioId } });
}
