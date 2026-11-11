// Funções puras: telefone, máscara, segmentos de SMS e modelo de texto (portadas do MVP).

/**
 * Normaliza um telefone brasileiro.
 * Aceita "(11) 99999-1234", "11999991234", "5511999991234", "+55 11 99999-1234" ou 5511999991234 (número).
 * Devolve { digitos: "5511999991234", e164: "+5511999991234" } ou null.
 */
export function normalizarTelefone(entrada) {
  if (typeof entrada === 'number' && Number.isFinite(entrada)) entrada = entrada.toFixed(0);
  if (typeof entrada !== 'string') return null;
  let d = entrada.replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  // 55 + DDD (11 a 99) + número: celular com 9 dígitos começando em 9, ou fixo com 8 dígitos começando em 2 a 5
  if (!/^55[1-9][1-9](9\d{8}|[2-5]\d{7})$/.test(d)) return null;
  return { digitos: d, e164: `+${d}` };
}

/** "+5511999991234" → "+55 11 9****-1234". Telefone é dado pessoal: só o mascarado vai para log e tela. */
export function mascarar(e164) {
  const d = String(e164).replace(/\D/g, '');
  if (d.length < 12) return '***';
  const ddd = d.slice(2, 4);
  const resto = d.slice(4);
  return `+55 ${ddd} ${resto[0]}****-${resto.slice(-4)}`;
}

const GSM_BASICO = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);
const GSM_EXTENSAO = new Set('^{}\\[~]|€');

/**
 * Quantos segmentos (SMS cobrados) um texto ocupa.
 * GSM-7: 160 caracteres em 1 SMS; 153 por parte quando é longo.
 * UCS-2 (basta 1 caractere fora do GSM-7, como "ã"): 70 em 1 SMS; 67 por parte.
 */
export function contarSegmentos(texto) {
  const s = String(texto ?? '');
  let gsm = true;
  let tamanhoGsm = 0;
  const foraDoGsm = new Set();
  for (const ch of s) {
    if (GSM_BASICO.has(ch)) tamanhoGsm += 1;
    else if (GSM_EXTENSAO.has(ch)) tamanhoGsm += 2;
    else {
      gsm = false;
      foraDoGsm.add(ch);
    }
  }
  if (gsm) {
    const segmentos = tamanhoGsm === 0 ? 0 : tamanhoGsm <= 160 ? 1 : Math.ceil(tamanhoGsm / 153);
    return { alfabeto: 'GSM-7', caracteres: tamanhoGsm, segmentos, foraDoGsm: [] };
  }
  const tamanho = s.length;
  const segmentos = tamanho <= 70 ? 1 : Math.ceil(tamanho / 67);
  return { alfabeto: 'UCS-2', caracteres: tamanho, segmentos, foraDoGsm: [...foraDoGsm] };
}

/** Troca {nome} pelo nome do contato. Sem nome, a variável some e os espaços duplicados são limpos. */
export function aplicarModelo(modelo, { nome } = {}) {
  const n = typeof nome === 'string' ? nome.trim() : '';
  return String(modelo)
    .replace(/\{\s*nome\s*\}/gi, n)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

/** Sorteia uma espera entre o mínimo e o máximo (inclusive). */
export function sortearEspera(min, max, aleatorio = Math.random) {
  return Math.round(min + aleatorio() * (max - min));
}
