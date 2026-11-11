// Adaptador do sms-gate (app SMS Gateway for Android), modo Local: cada celular é um servidor HTTP.
// Pelo cabo USB, o ADB redireciona as portas do PC para os celulares (8080 → celular 1, 8081 → celular 2).

import { mascarar } from './lib.mjs';
import { FINAIS, agendarGravacao, evento, log, registrar, roleta } from './estado.mjs';

export const modo = { simular: false };
export const cfg = { aparelhos: [], envio: '/message', status: '/message/:id', modo: 'local' };

/** Lê os celulares configurados no ambiente (.env ou tela de Configurações). */
export function aplicarEnv(e = process.env) {
  const m = (e.SMSGATE_MODE ?? 'local').toLowerCase() === 'cloud' ? 'cloud' : 'local';
  cfg.modo = m;
  cfg.envio = e.SMSGATE_SEND_PATH || (m === 'cloud' ? '/messages' : '/message');
  cfg.status = e.SMSGATE_STATUS_PATH || (m === 'cloud' ? '/messages/:id' : '/message/:id');
  cfg.aparelhos = [
    { id: 'a1', nome: 'Celular 1', base: e.SMSGATE_URL, usuario: e.SMSGATE_USER, senha: e.SMSGATE_PASSWORD },
    { id: 'a2', nome: 'Celular 2', base: e.SMSGATE_2_URL, usuario: e.SMSGATE_2_USER, senha: e.SMSGATE_2_PASSWORD },
  ]
    .map((a) => ({ ...a, base: (a.base ?? '').replace(/\/$/, ''), usuario: a.usuario ?? '', senha: a.senha ?? '' }))
    .filter((a) => a.base && a.usuario && a.senha);
}

export function configurado() {
  return modo.simular || cfg.aparelhos.length > 0;
}

export class ErroProvedor extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export async function lerJson(res) {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return { bruto: txt.slice(0, 300) };
  }
}

function resumoErro(corpo) {
  return corpo?.message ?? corpo?.error ?? 'erro sem detalhe';
}

export function aparelhoPorId(id) {
  return cfg.aparelhos.find((a) => a.id === id) ?? null;
}

function authGate(ap) {
  return 'Basic ' + Buffer.from(`${ap.usuario}:${ap.senha}`).toString('base64');
}

export function rotuloChip(c) {
  return `${c.aparelho} · Chip ${c.chip} · ${c.operadora}`;
}

// ── Chips ──

const CHIPS_SIMULADOS = [
  { chave: 'a1:1', aparelhoId: 'a1', aparelho: 'Celular 1', chip: 1, operadora: 'VIVO (simulado)', telefone: '+55 11 9****-0001' },
  { chave: 'a2:1', aparelhoId: 'a2', aparelho: 'Celular 2', chip: 1, operadora: 'TIM (simulado)', telefone: '+55 11 9****-0002' },
];

let cacheChips = { chave: '', em: 0, valor: null };
const situacaoAparelho = new Map(); // id → 'ok' | 'fora' (para avisar só quando muda)

function marcarSituacao(ap, ok, motivo) {
  const antes = situacaoAparelho.get(ap.id);
  const agora = ok ? 'ok' : 'fora';
  situacaoAparelho.set(ap.id, agora);
  if (antes === agora) return;
  if (agora === 'fora') evento('aparelho', 'aviso', `${ap.nome} não respondeu (${motivo}). Os chips dele saíram da roleta.`);
  else if (antes === 'fora') evento('aparelho', 'info', `${ap.nome} voltou a responder. Os chips dele voltaram para a roleta.`);
}

/** Os chips de TODOS os celulares. Um celular fora do ar não derruba a lista dos outros. */
export async function chipsDoGate({ forcar = false } = {}) {
  if (modo.simular) return { chips: CHIPS_SIMULADOS, erros: [] };
  const chaveCache = cfg.aparelhos.map((a) => `${a.id}|${a.base}|${a.usuario}`).join(';');
  if (!forcar && cacheChips.valor && cacheChips.chave === chaveCache && Date.now() - cacheChips.em < 30_000) return cacheChips.valor;
  const caminho = cfg.modo === 'cloud' ? '/devices' : '/device';
  const chips = [];
  const erros = [];
  for (const ap of cfg.aparelhos) {
    try {
      const res = await fetch(`${ap.base}${caminho}`, { headers: { Authorization: authGate(ap) }, signal: AbortSignal.timeout(5_000) });
      if (!res.ok) {
        const motivo = res.status === 401 || res.status === 403 ? 'usuário ou senha recusados' : `HTTP ${res.status}`;
        erros.push({ aparelhoId: ap.id, aparelho: ap.nome, motivo });
        marcarSituacao(ap, false, motivo);
        continue;
      }
      marcarSituacao(ap, true);
      const corpo = await lerJson(res);
      for (const d of Array.isArray(corpo) ? corpo : []) {
        for (const s of Array.isArray(d.simCards) ? d.simCards : []) {
          const n = Number(s.simNumber);
          if (![1, 2, 3].includes(n)) continue;
          chips.push({
            chave: `${ap.id}:${n}`,
            aparelhoId: ap.id,
            aparelho: ap.nome,
            chip: n,
            operadora: s.carrierName || 'operadora desconhecida',
            telefone: s.phoneNumber ? mascarar(s.phoneNumber) : 'número não informado',
          });
        }
      }
    } catch (e) {
      const motivo = e.name === 'TimeoutError' ? 'não respondeu em 5 s' : 'não encontrado';
      erros.push({ aparelhoId: ap.id, aparelho: ap.nome, motivo });
      marcarSituacao(ap, false, motivo);
    }
  }
  cacheChips = { chave: chaveCache, em: Date.now(), valor: { chips, erros } };
  return { chips, erros };
}

// Roleta de chips: cada envio vai pelo próximo chip da lista, dando a volta no fim.
// A posição fica no estado gravado, para continuar de onde parou depois de um reinício.
export function proximoChip(chips) {
  const c = chips[roleta.ponteiro % chips.length];
  roleta.ponteiro += 1;
  agendarGravacao();
  return c;
}

// ── Saúde dos celulares (bateria, internet, falhas na última hora) ──

let cacheSaude = { em: 0, valor: null };
export async function saudeAparelhos({ forcar = false } = {}) {
  if (modo.simular)
    return [
      { id: 'a1', nome: 'Celular 1', online: true, bateria: 82, carregando: true, internet: true, falhasUltimaHora: 0, versao: 'simulado' },
      { id: 'a2', nome: 'Celular 2', online: true, bateria: 64, carregando: false, internet: true, falhasUltimaHora: 0, versao: 'simulado' },
    ];
  if (!forcar && cacheSaude.valor && Date.now() - cacheSaude.em < 15_000) return cacheSaude.valor;
  const lista = [];
  for (const ap of cfg.aparelhos) {
    const item = { id: ap.id, nome: ap.nome, endereco: ap.base, online: false, bateria: null, carregando: null, internet: null, falhasUltimaHora: null, versao: null, motivo: null };
    try {
      const res = await fetch(`${ap.base}/health`, { headers: { Authorization: authGate(ap) }, signal: AbortSignal.timeout(5_000) });
      if (res.ok) {
        const h = await lerJson(res);
        const c = h.checks ?? {};
        item.online = true;
        item.versao = h.version ?? null;
        item.bateria = c['battery:level']?.observedValue ?? null;
        item.carregando = c['battery:charging'] ? c['battery:charging'].observedValue > 0 : null;
        item.internet = c['connection:status'] ? c['connection:status'].observedValue === 1 : null;
        item.falhasUltimaHora = c['messages:failed']?.observedValue ?? null;
        item.saude = h.status ?? null;
      } else item.motivo = res.status === 401 || res.status === 403 ? 'usuário ou senha recusados' : `HTTP ${res.status}`;
    } catch (e) {
      item.motivo = e.name === 'TimeoutError' ? 'não respondeu em 5 s' : 'não encontrado';
    }
    marcarSituacao(ap, item.online, item.motivo);
    lista.push(item);
  }
  cacheSaude = { em: Date.now(), valor: lista };
  return lista;
}

// ── Envio e status ──

export async function enviarGate(msg, tel, texto) {
  const ap = aparelhoPorId(msg.aparelhoId);
  if (!ap) throw new ErroProvedor(0, 'o celular escolhido não está mais configurado');
  const res = await fetch(`${ap.base}${cfg.envio}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authGate(ap) },
    body: JSON.stringify({
      id: msg.id,
      textMessage: { text: texto },
      phoneNumbers: [tel.e164],
      withDeliveryReport: true,
      ...(msg.simNumber ? { simNumber: msg.simNumber } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const corpo = await lerJson(res);
  if (!res.ok) throw new ErroProvedor(res.status, resumoErro(corpo));
  msg.idNoProvedor = corpo.id ?? msg.id;
  registrar(msg, 'ACEITA');
  if (corpo.state) registrar(msg, corpo.state);
}

export async function atualizarGate(msg) {
  if (msg.simulada || FINAIS.has(msg.status) || !msg.idNoProvedor) return;
  if (Date.now() - (msg.consultadoEm ?? 0) < 2_000) return; // no máximo 1 consulta a cada 2 s por mensagem
  msg.consultadoEm = Date.now();
  const ap = aparelhoPorId(msg.aparelhoId);
  if (!ap) return;
  try {
    const caminho = cfg.status.replace(':id', encodeURIComponent(msg.idNoProvedor));
    const res = await fetch(`${ap.base}${caminho}`, { headers: { Authorization: authGate(ap) }, signal: AbortSignal.timeout(5_000) });
    const corpo = await lerJson(res);
    if (!res.ok) return falhaConsulta(msg, ap, `HTTP ${res.status}`);
    msg.falhasConsulta = 0;
    const motivo = corpo.recipients?.[0]?.error ?? corpo.reason;
    if (corpo.state) registrar(msg, corpo.state, motivo ?? undefined);
  } catch (e) {
    falhaConsulta(msg, ap, e.name === 'TimeoutError' ? 'não respondeu em 5 s' : 'não encontrado');
  }
}

// Avisa nos Logs uma vez só, quando o status de uma mensagem não pode ser consultado (celular fora).
function falhaConsulta(msg, ap, motivo) {
  msg.falhasConsulta = (msg.falhasConsulta ?? 0) + 1;
  log('sms.consulta_falhou', { id: msg.id, motivo, vezes: msg.falhasConsulta });
  if (msg.falhasConsulta === 3)
    evento('consulta', 'aviso', `Não consigo consultar o status da mensagem para ${msg.telefone} no ${ap.nome} (${motivo}). Ela pode já ter saído; o status volta quando o celular responder.`, {
      chip: msg.chipChave,
      chipRotulo: msg.chipRotulo,
      disparoId: msg.disparoId,
    });
}

/** Modo simulado: imita o celular para ensaiar a tela sem gastar SMS. */
export function simular(msg) {
  const passos = [
    [300, 'ACEITA'],
    [900, 'Pending'],
    [1_800, 'Sent'],
    [3_000, 'Delivered'],
  ];
  for (const [ms, status] of passos) setTimeout(() => registrar(msg, status), ms);
}

/** Teste SÓ DE LEITURA: em cada celular, consulta uma mensagem que não existe (404 = senha aceita). */
export async function testarAparelhos() {
  if (modo.simular) return { ok: true, mensagem: 'Modo simulado: os dois celulares de exemplo estão "conectados".' };
  if (!cfg.aparelhos.length) return { ok: false, mensagem: 'Nenhum celular configurado. Preencha em Configurações.' };
  const partes = [];
  let algumOk = false;
  for (const ap of cfg.aparelhos) {
    try {
      const caminho = cfg.status.replace(':id', 'teste-de-conexao');
      const r = await fetch(`${ap.base}${caminho}`, { headers: { Authorization: authGate(ap) }, signal: AbortSignal.timeout(5_000) });
      if (r.status === 401 || r.status === 403) partes.push(`${ap.nome}: usuário ou senha recusados`);
      else if (r.status === 404 || r.ok) {
        algumOk = true;
        partes.push(`${ap.nome}: conectado`);
      } else partes.push(`${ap.nome}: respondeu HTTP ${r.status}`);
    } catch (e) {
      partes.push(`${ap.nome}: ${e.name === 'TimeoutError' ? 'não respondeu em 5 s' : `não encontrado em ${ap.base}`}`);
    }
  }
  const { chips } = await chipsDoGate({ forcar: true });
  const lista = chips.length ? ` Chips: ${chips.map((c) => `${rotuloChip(c)} · ${c.telefone}`).join('; ')}.` : ' Nenhum chip encontrado.';
  const r = { ok: algumOk, mensagem: `${partes.join(' · ')}.${lista}` };
  evento('teste', algumOk ? 'info' : 'erro', `Teste de conexão: ${partes.join(' · ')}.`);
  return r;
}
