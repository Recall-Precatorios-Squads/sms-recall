// Adaptador do app sms-gate (SMS Gateway for Android) em modo Local Server: cada celular é um servidor HTTP
// na rede (http://<ip-do-celular>:8080), com Basic Auth. É a ÚNICA peça que conhece o formato do app.
// Com SMSGATE_SIMULADO=1 nada sai: os celulares são imitados (ensaio e testes).
import { config } from '../config.js';
import { mascarar } from '../lib/texto.js';

export interface Credenciais {
  nome: string;
  url: string;
  usuario: string;
  senha: string;
}
export type EstadoEnvio = 'ACEITA' | 'ENVIADA' | 'ENTREGUE' | 'FALHOU';
export interface ChipInformado {
  simNumero: number;
  operadora: string;
  telefone: string | null;
}
/** SMS que chegou no celular (resposta do contato). `telefone` é o remetente como o app informou. */
export interface Recebida {
  idExterno: string;
  telefone: string;
  simNumero: number | null;
  texto: string;
  recebidaEm: Date;
}
export interface Saude {
  online: boolean;
  bateria?: number | null;
  carregando?: boolean | null;
  internet?: boolean | null;
  detalhe?: string | null;
}

/**
 * Erro do celular.
 * RECUSADO     → o celular respondeu e NÃO aceitou (seguro tentar de novo, por outro chip).
 * INCERTO      → sem resposta (timeout/rede): o SMS PODE ter saído. Nunca reenviar sozinho.
 * AUTENTICACAO → usuário ou senha recusados.
 */
export class ErroGate extends Error {
  constructor(
    public readonly tipo: 'RECUSADO' | 'INCERTO' | 'AUTENTICACAO',
    mensagem: string,
    public readonly status: number | null = null,
  ) {
    super(mensagem);
  }
}

// O app devolve JSON sem schema publicado: lemos campo a campo, com cuidado.
type Json = Record<string, any>;

const auth = (ap: Credenciais): string => 'Basic ' + Buffer.from(`${ap.usuario}:${ap.senha}`).toString('base64');
const base = (ap: Credenciais): string => String(ap.url).replace(/\/+$/, '');

async function lerJson(res: Response): Promise<Json> {
  const txt = await res.text();
  try {
    return txt ? (JSON.parse(txt) as Json) : {};
  } catch {
    return {};
  }
}

function motivoRede(e: unknown): string {
  return e instanceof Error && e.name === 'TimeoutError' ? 'não respondeu a tempo' : 'não encontrado na rede';
}

async function chamar(ap: Credenciais, caminho: string, opcoes: { metodo?: string; corpo?: unknown; timeout?: number } = {}): Promise<{ res: Response; json: Json }> {
  const { metodo = 'GET', corpo, timeout = 5_000 } = opcoes;
  let res: Response;
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
const simuladas = new Map<string, { em: number; falhar: boolean; e164: string; simNumero: number }>();
/** No ensaio, números terminados em 7 respondem 4 s depois do envio. */
const RESPONDE_NO_ENSAIO = /7$/;

/** Mapeia o estado do app para o nosso. */
export function mapearEstado(estado: unknown): EstadoEnvio | null {
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
export async function saude(ap: Credenciais): Promise<Saude> {
  if (config.simulado) return { online: true, bateria: 80, carregando: true, internet: true, detalhe: 'simulado' };
  try {
    const { res, json } = await chamar(ap, '/health');
    // O app responde HTTP 500 quando algum check está "fail" (ex.: houve SMS com falha na operadora),
    // mas o celular está no ar e enviando. Com corpo de health válido, o celular está ONLINE; o 500 vira aviso.
    const temHealth = typeof json.status === 'string' && typeof json.checks === 'object' && json.checks !== null;
    if (!res.ok && !temHealth) return { online: false, detalhe: `respondeu HTTP ${res.status}` };
    const c = (json.checks ?? {}) as Json;
    const avisos = Object.entries(c)
      .filter(([, v]) => (v as Json)?.status && (v as Json).status !== 'pass')
      .map(([nome, v]) => `${nome}=${(v as Json).observedValue ?? (v as Json).status}`);
    return {
      online: true,
      bateria: c['battery:level']?.observedValue ?? null,
      carregando: c['battery:charging'] ? c['battery:charging'].observedValue > 0 : null,
      internet: c['connection:status'] ? c['connection:status'].observedValue === 1 : null,
      detalhe: avisos.length ? `${json.status}: ${avisos.join(', ')}` : String(json.status),
    };
  } catch (e) {
    return { online: false, detalhe: e instanceof Error ? e.message : 'sem resposta' };
  }
}

/** Chips que o celular informa (telefone já mascarado). */
export async function chips(ap: Credenciais): Promise<ChipInformado[]> {
  if (config.simulado)
    return [
      { simNumero: 1, operadora: 'VIVO (simulado)', telefone: '+55 11 9****-0001' },
      { simNumero: 2, operadora: 'TIM (simulado)', telefone: '+55 11 9****-0002' },
    ];
  const { res, json } = await chamar(ap, '/device');
  if (!res.ok) throw new ErroGate('RECUSADO', `respondeu HTTP ${res.status}`, res.status);
  const lista: ChipInformado[] = [];
  const aparelhos: Json[] = Array.isArray(json) ? json : [json];
  for (const d of aparelhos) {
    for (const s of Array.isArray(d?.simCards) ? (d.simCards as Json[]) : []) {
      const n = Number(s.simNumber);
      if (!Number.isInteger(n) || n < 1 || n > 4) continue;
      lista.push({ simNumero: n, operadora: s.carrierName || 'operadora desconhecida', telefone: s.phoneNumber ? mascarar(String(s.phoneNumber)) : null });
    }
  }
  return lista;
}

/** Envia um SMS pelo chip `simNumero`. */
export async function enviar(ap: Credenciais, msg: { id: string; texto: string; e164: string; simNumero: number }): Promise<{ idExterno: string; estado: EstadoEnvio }> {
  if (config.simulado) {
    // Igual ao app real: id repetido é recusado.
    if (simuladas.has(msg.id)) throw new ErroGate('RECUSADO', 'Message with the same ID already exists', 400);
    const falhar = /^\+?5511900000/.test(msg.e164); // números +55 11 90000-xxxx falham no ensaio
    simuladas.set(msg.id, { em: Date.now(), falhar, e164: msg.e164, simNumero: msg.simNumero });
    return { idExterno: msg.id, estado: 'ACEITA' };
  }
  const { res, json } = await chamar(ap, '/message', {
    metodo: 'POST',
    timeout: 15_000,
    corpo: { id: msg.id, textMessage: { text: msg.texto }, phoneNumbers: [msg.e164], withDeliveryReport: true, simNumber: msg.simNumero },
  });
  if (!res.ok) throw new ErroGate('RECUSADO', String(json.message ?? json.error ?? `respondeu HTTP ${res.status}`), res.status);
  return { idExterno: String(json.id ?? msg.id), estado: mapearEstado(json.state) ?? 'ACEITA' };
}

/** Consulta o status de um SMS (estado já no nosso vocabulário, ou null). */
export async function consultar(ap: Credenciais, idExterno: string): Promise<{ estado: EstadoEnvio | null; motivo: string | null }> {
  if (config.simulado) {
    const s = simuladas.get(idExterno);
    if (!s) return { estado: 'ENTREGUE', motivo: null }; // worker reiniciou no meio do ensaio
    const passou = Date.now() - s.em;
    if (s.falhar && passou > 1_000) return { estado: 'FALHOU', motivo: 'falha simulada' };
    return { estado: passou > 3_000 ? 'ENTREGUE' : passou > 1_500 ? 'ENVIADA' : 'ACEITA', motivo: null };
  }
  const { res, json } = await chamar(ap, `/message/${encodeURIComponent(idExterno)}`);
  if (!res.ok) throw new ErroGate('RECUSADO', `respondeu HTTP ${res.status}`, res.status);
  const motivo = json.recipients?.[0]?.error ?? json.reason ?? null;
  return { estado: mapearEstado(json.state), motivo: motivo ? String(motivo) : null };
}

/**
 * SMS recebidos pelo celular desde `desde` (GET /inbox, só no modo Local Server).
 * Devolve null quando o app não tem essa leitura (versão antiga): quem chama avisa uma vez e segue.
 */
export async function caixaDeEntrada(ap: Credenciais, desde: Date, limite = 500): Promise<Recebida[] | null> {
  if (config.simulado) {
    const agora = Date.now();
    return [...simuladas.entries()]
      .filter(([, s]) => !s.falhar && RESPONDE_NO_ENSAIO.test(s.e164) && agora - s.em > 4_000 && s.em + 4_000 >= desde.getTime())
      .map(([id, s]) => ({ idExterno: `resp-${id}`, telefone: s.e164, simNumero: s.simNumero, texto: 'Tenho interesse, pode me ligar?', recebidaEm: new Date(s.em + 4_000) }));
  }
  const lista: Recebida[] = [];
  for (let offset = 0; offset < 5 * limite; offset += limite) {
    const q = new URLSearchParams({ type: 'SMS', limit: String(limite), offset: String(offset), from: desde.toISOString() });
    const { res, json } = await chamar(ap, `/inbox?${q}`, { timeout: 10_000 });
    if (res.status === 404 || res.status === 405) return null;
    if (!res.ok) throw new ErroGate('RECUSADO', `respondeu HTTP ${res.status}`, res.status);
    const itens: Json[] = Array.isArray(json) ? json : [];
    for (const i of itens) {
      const em = new Date(String(i.createdAt ?? ''));
      if (!i.id || !i.sender || Number.isNaN(em.getTime())) continue;
      const sim = Number(i.simNumber);
      lista.push({ idExterno: String(i.id), telefone: String(i.sender), simNumero: Number.isInteger(sim) && sim >= 1 ? sim : null, texto: String(i.contentPreview ?? i.text ?? ''), recebidaEm: em });
    }
    if (itens.length < limite) break;
  }
  return lista;
}

/** Teste só de leitura: saúde + chips. Não envia SMS. */
export async function testar(ap: Credenciais): Promise<{ ok: boolean; mensagem: string }> {
  const s = await saude(ap);
  if (!s.online) return { ok: false, mensagem: `${ap.nome}: ${s.detalhe ?? 'não respondeu'}.` };
  try {
    const lista = await chips(ap);
    const txt = lista.length ? lista.map((c) => `chip ${c.simNumero} ${c.operadora}${c.telefone ? ` (${c.telefone})` : ''}`).join(', ') : 'nenhum chip informado';
    return { ok: true, mensagem: `${ap.nome}: conectado${s.bateria != null ? `, bateria ${s.bateria}%` : ''}. ${txt}.` };
  } catch (e) {
    return { ok: false, mensagem: `${ap.nome}: ${e instanceof Error ? e.message : 'erro'}.` };
  }
}
