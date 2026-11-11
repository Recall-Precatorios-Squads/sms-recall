// Senha do app sms-gate guardada cifrada no banco (AES-256-GCM com chave derivada do APP_SECRET).
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chaveCifra } from '../config.js';

export function cifrar(texto) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chaveCifra(), iv);
  const dados = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), dados.toString('base64')].join(':');
}

export function decifrar(valor) {
  const [versao, iv, tag, dados] = String(valor).split(':');
  if (versao !== 'v1') throw new Error('formato de cifra desconhecido');
  const d = createDecipheriv('aes-256-gcm', chaveCifra(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(dados, 'base64')), d.final()]).toString('utf8');
}
