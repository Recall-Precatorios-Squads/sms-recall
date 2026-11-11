// Configuração editável pela tela: valida e grava o .env.
// Segredo nunca volta para a tela inteiro: só "preenchido" e os 4 últimos caracteres.

import { writeFile, rename } from 'node:fs/promises';

export const CAMPOS = [
  { chave: 'SMSGATE_MODE', grupo: 'geral', rotulo: 'Modo do sms-gate', opcoes: ['local', 'cloud'], dica: 'Local: cada celular é um servidor (pelo cabo ou Wi-Fi). Nuvem: pelo servidor do sms-gate.' },
  { chave: 'SMSGATE_URL', grupo: 'a1', rotulo: 'Endereço', tipo: 'http', dica: 'Pelo cabo: http://127.0.0.1:8080 · Pelo Wi-Fi: http://<ip-do-celular>:8080' },
  { chave: 'SMSGATE_USER', grupo: 'a1', rotulo: 'Usuário', dica: 'Aparece no app, na seção do servidor.' },
  { chave: 'SMSGATE_PASSWORD', grupo: 'a1', rotulo: 'Senha', segredo: true, dica: 'Aparece no app, na seção do servidor.' },
  { chave: 'SMSGATE_2_URL', grupo: 'a2', rotulo: 'Endereço', tipo: 'http', dica: 'Pelo cabo: http://127.0.0.1:8081. Deixe vazio se houver um celular só.' },
  { chave: 'SMSGATE_2_USER', grupo: 'a2', rotulo: 'Usuário', dica: 'O usuário do app no segundo celular.' },
  { chave: 'SMSGATE_2_PASSWORD', grupo: 'a2', rotulo: 'Senha', segredo: true, dica: 'A senha do app no segundo celular.' },
];

const POR_CHAVE = new Map(CAMPOS.map((c) => [c.chave, c]));
// Variáveis que o .env pode ter e que a tela não edita: são preservadas ao gravar.
const PRESERVAR = ['PORT', 'HOST', 'SMSGATE_SEND_PATH', 'SMSGATE_STATUS_PATH', 'ADB_PATH', 'ADB_PORTAS'];

export function valoresParaTela(env) {
  return CAMPOS.map((c) => {
    const v = env[c.chave] ?? '';
    const base = { chave: c.chave, grupo: c.grupo, rotulo: c.rotulo, dica: c.dica, segredo: Boolean(c.segredo), opcoes: c.opcoes ?? null, preenchido: v !== '' };
    if (c.segredo) return { ...base, final: v ? v.slice(-4) : null };
    return { ...base, valor: v || (c.opcoes ? c.opcoes[0] : '') };
  });
}

/**
 * Valida o que veio da tela.
 * Segredo vazio = manter o atual. Campo comum vazio = apagar.
 * Recusa quebra de linha, aspas e barra invertida: não deixam injetar outra variável no .env.
 */
export function validar(entrada, env) {
  const erros = {};
  const novo = {};
  if (!entrada || typeof entrada !== 'object') return { erros: { _: 'Corpo inválido.' }, novo, final: {} };
  for (const [chave, bruto] of Object.entries(entrada)) {
    const campo = POR_CHAVE.get(chave);
    if (!campo) continue;
    if (typeof bruto !== 'string') {
      erros[chave] = 'Valor inválido.';
      continue;
    }
    const v = bruto.trim();
    if (campo.segredo && v === '') continue;
    if (/[\r\n\0"\\]/.test(v)) {
      erros[chave] = 'Não use quebra de linha, aspas ou barra invertida.';
      continue;
    }
    if (v.length > 500) {
      erros[chave] = 'Valor longo demais.';
      continue;
    }
    if (campo.opcoes && !campo.opcoes.includes(v)) {
      erros[chave] = `Use ${campo.opcoes.join(' ou ')}.`;
      continue;
    }
    if (v && campo.tipo === 'http' && !/^https?:\/\/[^\s/]+/.test(v)) {
      erros[chave] = 'Precisa começar com http:// ou https://';
      continue;
    }
    novo[chave] = campo.tipo === 'http' ? v.replace(/\/+$/, '') : v;
  }
  const atual = {};
  for (const k of [...PRESERVAR, ...CAMPOS.map((c) => c.chave)]) if (env[k]) atual[k] = env[k];
  return { erros, novo, final: { ...atual, ...novo } };
}

/** Grava o .env de forma atômica (arquivo temporário + rename). Só as chaves conhecidas. */
export async function gravarEnv(caminho, valores) {
  const titulos = { geral: '# sms-gate', a1: '# Celular 1', a2: '# Celular 2' };
  const linhas = ['# Gerado pela tela de Configurações do serviço de SMS.', '# Pode editar à mão, mas reinicie o servidor depois.', ''];
  for (const k of PRESERVAR) if (valores[k]) linhas.push(`${k}="${valores[k]}"`);
  let grupo = null;
  for (const c of CAMPOS) {
    if (c.grupo !== grupo) {
      grupo = c.grupo;
      linhas.push('', titulos[grupo]);
    }
    linhas.push(`${c.chave}="${valores[c.chave] ?? ''}"`);
  }
  const tmp = `${caminho}.tmp`;
  await writeFile(tmp, linhas.join('\n') + '\n', { encoding: 'utf8', mode: 0o600 });
  await rename(tmp, caminho);
}
