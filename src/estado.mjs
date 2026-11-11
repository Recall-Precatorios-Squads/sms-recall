// O estado do MVP: mensagens, disparos, a fila do que ainda não saiu, a roleta e os logs.
// Fica em memória e é gravado em data/estado.json (no máximo 1 vez por segundo), para sobreviver
// a um reinício. A versão de produção guarda no Postgres.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const mensagens = new Map();
export const disparos = new Map();
/** Só o que ainda NÃO saiu: telefone completo e texto, necessários para retomar. Apagado ao enviar. */
export const pendentes = new Map();
export const roleta = { ponteiro: 0 };

export const ROTULOS = {
  CRIADA: 'Na fila do serviço',
  ENVIANDO: 'Enviando ao celular',
  INCERTA: 'Incerta: confira no celular',
  ACEITA: 'Aceita pelo celular',
  Pending: 'Na fila do celular',
  Processed: 'Processada pelo celular',
  Sent: 'Enviada',
  Delivered: 'Entregue',
  Failed: 'Falhou',
  ERRO: 'Erro ao enviar',
  CANCELADA: 'Cancelada',
};
// INCERTA é final de propósito: o serviço caiu enquanto enviava e não sabe se saiu. Não reenviar
// é a regra — um SMS a menos se corrige; um SMS em dobro para o cliente, não.
export const FINAIS = new Set(['Delivered', 'Failed', 'ERRO', 'CANCELADA', 'INCERTA']);
export const ENTREGUES = new Set(['Delivered']);
export const FALHAS = new Set(['Failed', 'ERRO']);

/** Log técnico, em JSON, no console. Nunca leva texto, nome, telefone completo nem credencial. */
export function log(evento, dados) {
  console.log(JSON.stringify({ em: new Date().toISOString(), evento, ...dados }));
}

// ── Log de eventos para a tela (em português, os últimos 1.000) ──
export const eventos = [];
const MAX_EVENTOS = 1000;
let seqEvento = 0;

/**
 * Registra um evento legível na tela de Logs.
 * nivel: "info" | "aviso" | "erro". Só telefone mascarado; nunca o texto da mensagem.
 */
export function evento(tipo, nivel, texto, extra = {}) {
  const e = { id: ++seqEvento, em: new Date().toISOString(), tipo, nivel, texto, chip: extra.chip ?? null, chipRotulo: extra.chipRotulo ?? null, disparoId: extra.disparoId ?? null };
  eventos.push(e);
  if (eventos.length > MAX_EVENTOS) eventos.splice(0, eventos.length - MAX_EVENTOS);
  log(`evento.${tipo}`, { nivel, chip: e.chip, disparoId: e.disparoId });
  agendarGravacao();
  return e;
}

// ── Gravação em disco ──
let arquivoEstado = null;
let timerGravacao = null;

/** Liga a gravação e carrega o que já estava salvo. Devolve quantas mensagens e disparos voltaram. */
export function iniciarPersistencia(arquivo) {
  arquivoEstado = arquivo;
  mkdirSync(dirname(arquivo), { recursive: true });
  let dados = null;
  try {
    dados = JSON.parse(readFileSync(arquivo, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') log('estado.arquivo_ilegivel', { erro: e.message });
    return { mensagens: 0, disparos: 0 };
  }
  for (const m of dados.mensagens ?? []) mensagens.set(m.id, m);
  for (const d of dados.disparos ?? []) disparos.set(d.id, d);
  for (const [id, p] of dados.pendentes ?? []) pendentes.set(id, p);
  for (const e of dados.eventos ?? []) eventos.push(e);
  seqEvento = eventos.at(-1)?.id ?? 0;
  roleta.ponteiro = Number(dados.roleta?.ponteiro ?? 0);
  return { mensagens: mensagens.size, disparos: disparos.size };
}

export function agendarGravacao() {
  if (!arquivoEstado || timerGravacao) return;
  timerGravacao = setTimeout(() => {
    timerGravacao = null;
    gravarAgora();
  }, 1_000);
  timerGravacao.unref?.();
}

/** Grava já (atômico: arquivo temporário + rename). Usado também na saída do processo. */
export function gravarAgora() {
  if (!arquivoEstado) return;
  try {
    const dados = {
      gravadoEm: new Date().toISOString(),
      roleta,
      mensagens: [...mensagens.values()].map(({ consultadoEm, ...m }) => m),
      disparos: [...disparos.values()],
      pendentes: [...pendentes.entries()],
      eventos,
    };
    const tmp = `${arquivoEstado}.tmp`;
    writeFileSync(tmp, JSON.stringify(dados), { encoding: 'utf8', mode: 0o600 });
    renameSync(tmp, arquivoEstado);
  } catch (e) {
    log('estado.gravacao_falhou', { erro: e.message });
  }
}

export function registrar(msg, status, detalhe) {
  const ultimo = msg.historico.at(-1);
  if (ultimo && ultimo.status === status) return; // status repetido não duplica
  if (FINAIS.has(msg.status) && !FINAIS.has(status)) return; // status atrasado não desfaz um final
  msg.status = status;
  msg.historico.push({ status, rotulo: ROTULOS[status] ?? status, em: new Date().toISOString(), detalhe });
  log('sms.status', { id: msg.id, status, chip: msg.chipChave });
  agendarGravacao();
  const ctx = { chip: msg.chipChave, chipRotulo: msg.chipRotulo, disparoId: msg.disparoId };
  const pelo = msg.chipRotulo ? ` pelo ${msg.chipRotulo}` : '';
  if (status === 'ACEITA') evento('envio', 'info', `Mensagem para ${msg.telefone} aceita${pelo}.`, ctx);
  else if (status === 'Sent') evento('envio', 'info', `Mensagem para ${msg.telefone} enviada${pelo}.`, ctx);
  else if (status === 'Delivered') evento('entrega', 'info', `Mensagem para ${msg.telefone} entregue${pelo}.`, ctx);
  else if (status === 'Failed' || status === 'ERRO') evento('falha', 'erro', `Falha ao enviar para ${msg.telefone}${pelo}${detalhe ? `: ${detalhe}` : ''}.`, ctx);
  else if (status === 'CANCELADA') evento('cancelamento', 'aviso', `Mensagem para ${msg.telefone} cancelada antes de sair.`, ctx);
  else if (status === 'INCERTA') evento('incerta', 'aviso', `Mensagem para ${msg.telefone}${pelo} ficou incerta: o serviço caiu enquanto enviava. Confira no celular se saiu; ela não será reenviada.`, ctx);
}

export function dto(msg) {
  return {
    id: msg.id,
    telefone: msg.telefone,
    nome: msg.nome ?? null,
    segmentos: msg.segmentos,
    alfabeto: msg.alfabeto,
    criadaEm: msg.criadaEm,
    status: msg.status,
    rotulo: ROTULOS[msg.status] ?? msg.status,
    final: FINAIS.has(msg.status),
    entregue: ENTREGUES.has(msg.status),
    falhou: FALHAS.has(msg.status),
    simulada: msg.simulada,
    chipChave: msg.chipChave ?? null,
    chipRotulo: msg.chipRotulo ?? null,
    disparoId: msg.disparoId ?? null,
    linha: msg.linha ?? null,
    indiceTexto: msg.indiceTexto ?? null,
    detalhe: msg.historico.at(-1)?.detalhe ?? null,
    historico: msg.historico,
  };
}

/** Início do dia de hoje no fuso de São Paulo, em ISO, para as contas "de hoje". */
export function inicioDeHoje() {
  const agora = new Date();
  const sp = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const diff = agora.getTime() - sp.getTime();
  sp.setHours(0, 0, 0, 0);
  return new Date(sp.getTime() + diff).toISOString();
}
