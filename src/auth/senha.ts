// Hash de senha com scrypt (node:crypto), formato "scrypt$<sal>$<hash>".
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = (await scrypt(String(senha), sal, 64)) as Buffer;
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

export async function conferir(senha: string, guardado: string | null | undefined): Promise<boolean> {
  const [tipo, sal, hash] = String(guardado ?? '').split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64');
  const calculado = (await scrypt(String(senha), Buffer.from(sal, "base64"), esperado.length)) as Buffer;
  return timingSafeEqual(esperado, calculado);
}
