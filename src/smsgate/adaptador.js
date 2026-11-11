// Adaptador do app sms-gate (SMS Gateway for Android) em modo Local Server: cada celular é um servidor HTTP
// na rede (http://<ip-do-celular>:8080), com Basic Auth. É a ÚNICA peça que conhece o formato do app.
// Com SMSGATE_SIMULADO=1 nada sai: os celulares são imitados (ensaio e testes).
import { config } from '../config.js';
import { mascarar } from '../lib/texto.js';

/**
 * Erro do celular.
 * tipo 'RECUSADO'  → o celular respondeu e NÃO aceitou (seguro tentar de novo, por outro chip).
 * tipo 'INCERTO'   → sem resposta (timeout/rede): o SMS PODE ter saído. Nunca reenviar sozinho.
 * tipo 'AUTENTICACAO' → usuário ou senha recusados.
 */
export class ErroGate extends Error {
  constructor(tipo, mensagem, status = null) {
    super(mensagem);
    this.tipo = tipo;
    this.status = status;
  }
}

const auth = (ap) => 'Basic ' + Buffer.from(`${ap.usuario}:${ap.senha}`).toString('base64');
const base = (ap) => String(ap.url).replace(/\/+$/, '');

async function lerJson(res) {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return {};
  }
}

function motivoRede(e) {
  return e?.name === 'TimeoutError' ? 'não respondeu a tempo' : 'não encontrado na rede';
}

async function chamar(ap, caminho, { metodo = 'GET', corpo, timeout = 5_000 } = {}) {
  let res;
  try {
    res = await fetch(base(ap) + caminho, {
      method: metodo,
      headers: { Authorization: auth(ap), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
  } catch (e) {
    throw new ErroGate('INCERTO', motivoRede(e));
  }
  const json = await lerJson(res);
  if (res.status === 401 || res.status === 403) throw new ErroGate('AUTENTICACAO', 'usuário ou senha do app recusados', res.status);
  return { res, json };
}

// ── Simulação ──
const simuladas = new Map(); // idExterno → { em, falhar }

/** Mapeia o estado do app para o nosso. */
export function mapearEstado(estado) {
  switch (estado) {
    case 'Delivered':
      return 'ENTREGUE';
    case 'Sent':
      return 'ENVIADA';
    case 'Failed':
      return 'FALHOU';
    case 'Pending':
    case 'Processed':
      return 'ACEITA';
    default:
      return null;
  }
}

/** Saúde do celular: online, bateria, carregando, internet. */
export async function saude(ap) {
  if (config.simulado) return { online: true, bateria: 80, carregando: true, internet: true, detalhe: 'simulado' };
  try {
    const { res, json } = await chamar(ap, '/health');
    if (!res.ok) return { online: false, detalhe: `respondeu HTTP ${res.status}` };
    const c = json.checks ?? {};
    return {
      online: true,
      bateria: c['battery:level']?.observedValue ?? null,
      carregando: c['battery:charging'] ? c['battery:charging'].observedValue > 0 : null,
      internet: c['connection:status'] ? c['connection:status'].observedValue === 1 : null,
      detalhe: json.status ?? null,
    };
  } catch (e) {
    return { online: false, detalhe: e.message };
  }
}

/** Chips que o celular informa: [{ simNumero, operadora, telefone (mascarado) }]. */
export async function chips(ap) {
  if (config.simulado)
    return [
      { simNumero: 1, operadora: 'VIVO (simulado)', telefone: '+55 11 9****-0001' },
      { simNumero: 2, operadora: 'TIM (simulado)', telefone: '+55 11 9****-0002' },
    ];
  const { res, json } = await chamar(ap, '/device');
  if (!res.ok) throw new ErroGate('RECUSADO', `respondeu HTTP ${res.status}`, res.status);
  const lista = [];
  for (const d of Array.isArray(json) ? json : [json]) {
    for (const s of Array.isArray(d?.simCards) ? d.simCards : []) {
      const n = Number(s.simNumber);
      if (!Number.isInteger(n) || n < 1 || n > 4) continue;
      lista.push({ simNumero: n, operadora: s.carrierName || 'operadora desconhecida', telefone: s.phoneNumber ? mascarar(s.phoneNumber) : null });
    }
  }
  return lista;
}

/** Envia um SMS pelo chip `simNumero`. Devolve { idExterno, estado }. */
export async function enviar(ap, { id, texto, e164, simNumero }) {
  if (config.simulado) {
    const falhar = /^\+?5511900000/.test(e164); // números +55 11 90000-xxxx falham no ensaio
    simuladas.set(String(id), { em: Date.now(), falhar });
    return { idExterno: String(id), estado: 'ACEITA' };
  }
  const { res, json } = await chamar(ap, '/message', {
    metodo: 'POST',
    timeout: 15_000,
    corpo: { id: String(id), textMessage: { text: texto }, phoneNumbers: [e164], withDeliveryReport: true, simNumber: simNumero },
  });
  if (!res.ok) throw new ErroGate('RECUSADO', json?.message ?? json?.error ?? `respondeu HTTP ${res.status}`, res.status);
  return { idExterno: String(json.id ?? id), estado: mapearEstado(json.state) ?? 'ACEITA' };
}

/** Consulta o status de um SMS. Devolve { estado, motivo } (estado já no nosso vocabulário, ou null). */
export async function consultar(ap, idExterno) {
  if (config.simulado) {
    const s = simuladas.get(String(idExterno));
    if (!s) return { estado: 'ENTREGUE', motivo: null }; // worker reiniciou no meio do ensaio
    const passou = Date.now() - s.em;
    if (s.falhar && passou > 1_000) return { estado: 'FALHOU', motivo: 'falha simulada' };
    return { estado: passou > 3_000 ? 'ENTREGUE' : passou > 1_500 ? 'ENVIADA' : 'ACEITA', motivo: null };
  }
  const { res, json } = await chamar(ap, `/message/${encodeURIComponent(idExterno)}`);
  if (!res.ok) throw new ErroGate('RECUSADO', `respondeu HTTP ${res.status}`, res.status);
  return { estado: mapearEstado(json.state), motivo: json.recipients?.[0]?.error ?? json.reason ?? null };
}

/** Teste só de leitura: saúde + chips. Não envia SMS. */
export async function testar(ap) {
  const s = await saude(ap);
  if (!s.online) return { ok: false, mensagem: `${ap.nome}: ${s.detalhe ?? 'não respondeu'}.` };
  try {
    const lista = await chips(ap);
    const txt = lista.length ? lista.map((c) => `chip ${c.simNumero} ${c.operadora}${c.telefone ? ` (${c.telefone})` : ''}`).join(', ') : 'nenhum chip informado';
    return { ok: true, mensagem: `${ap.nome}: conectado${s.bateria != null ? `, bateria ${s.bateria}%` : ''}. ${txt}.` };
  } catch (e) {
    return { ok: false, mensagem: `${ap.nome}: ${e.message}.` };
  }
}
