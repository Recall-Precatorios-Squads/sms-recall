// Envio avulso e disparo por planilha: roleta de chips, roleta de mensagens, intervalo, cancelamento.

import { randomUUID } from 'node:crypto';
import { aplicarModelo, contarSegmentos, mascarar, normalizarTelefone } from './lib.mjs';
import { FALHAS, FINAIS, ENTREGUES, agendarGravacao, disparos, dto, evento, gravarAgora, inicioDeHoje, log, mensagens, pendentes, registrar } from './estado.mjs';
import { ErroProvedor, atualizarGate, chipsDoGate, configurado, enviarGate, modo, proximoChip, rotuloChip, simular } from './smsgate.mjs';

export const LIMITES = { contatos: 500, modelos: 20, caracteres: 640, intervaloMin: 1, intervaloMax: 600 };
const INTERVALO_PADRAO_MS = Number(process.env.DISPARO_INTERVALO_MS ?? 3_000);

// ── Peças comuns ──

function validarTexto(bruto) {
  const texto = typeof bruto === 'string' ? bruto.trim() : '';
  if (!texto) return { erro: ['TEXTO_VAZIO', 'Escreva a mensagem.'] };
  if (texto.length > LIMITES.caracteres) return { erro: ['TEXTO_LONGO', `A mensagem passa de ${LIMITES.caracteres} caracteres.`] };
  return { texto };
}

/** "roleta" (ou vazio) = próximo chip da roleta; "a1:2" = Celular 1, chip 2, conferido nos celulares. */
async function resolverChip(escolha) {
  const sel = escolha === undefined || escolha === null || escolha === '' ? 'roleta' : String(escolha);
  if (sel !== 'roleta' && !/^a[12]:[123]$/.test(sel)) return { erro: [422, 'CHIP_INVALIDO', 'Escolha um chip da lista ou a roleta.'] };
  const { chips } = await chipsDoGate();
  if (!chips.length) return { erro: [502, 'CHIPS_INDISPONIVEIS', 'Nenhum chip disponível nos celulares. Veja a tela Aparelhos e chips.'] };
  if (sel === 'roleta') return { chip: proximoChip(chips) };
  const c = chips.find((x) => x.chave === sel);
  if (!c) return { erro: [422, 'CHIP_AUSENTE', 'Esse chip não está nos celulares agora.'] };
  return { chip: c };
}

function criarMensagem(tel, texto, chip, extra = {}) {
  const seg = contarSegmentos(texto);
  const msg = {
    id: randomUUID(),
    telefone: mascarar(tel.e164),
    segmentos: seg.segmentos,
    alfabeto: seg.alfabeto,
    criadaEm: new Date().toISOString(),
    simulada: modo.simular,
    aparelhoId: chip?.aparelhoId ?? null,
    simNumber: chip?.chip ?? null,
    chipChave: chip?.chave ?? null,
    chipRotulo: chip ? rotuloChip(chip) : null,
    status: null,
    idNoProvedor: null,
    historico: [],
    ...extra,
  };
  mensagens.set(msg.id, msg);
  registrar(msg, 'CRIADA');
  return msg;
}

/** Manda para o celular. Nunca lança: devolve { ok } ou { ok: false, motivo }. */
async function despachar(msg, tel, texto) {
  if (modo.simular) {
    simular(msg);
    return { ok: true };
  }
  try {
    await enviarGate(msg, tel, texto);
    return { ok: true };
  } catch (e) {
    const motivo = e instanceof ErroProvedor ? `HTTP ${e.status}: ${e.message}` : e.name === 'TimeoutError' ? 'o celular não respondeu em 10 s' : 'não foi possível falar com o celular';
    registrar(msg, 'ERRO', motivo);
    return { ok: false, motivo };
  }
}

// ── Envio avulso ──

export async function enviarAvulso(corpo) {
  const tel = normalizarTelefone(corpo?.telefone);
  if (!tel) return { status: 422, corpo: { codigo: 'TELEFONE_INVALIDO', mensagem: 'Telefone inválido. Use DDD e número, por exemplo (11) 99999-1234.', detalhes: {} } };
  const t = validarTexto(corpo?.texto);
  if (t.erro) return { status: 422, corpo: { codigo: t.erro[0], mensagem: t.erro[1], detalhes: {} } };
  if (!configurado()) return { status: 503, corpo: { codigo: 'NAO_CONFIGURADO', mensagem: 'Nenhum celular configurado. Preencha em Configurações.', detalhes: {} } };
  const r = await resolverChip(corpo?.chip);
  if (r.erro) return { status: r.erro[0], corpo: { codigo: r.erro[1], mensagem: r.erro[2], detalhes: {} } };
  const msg = criarMensagem(tel, t.texto, r.chip, { origem: 'avulso' });
  const d = await despachar(msg, tel, t.texto);
  if (d.ok) return { status: 202, corpo: dto(msg) };
  return { status: 502, corpo: { codigo: 'ENVIO_FALHOU', mensagem: d.motivo, detalhes: { mensagem: dto(msg) } } };
}

// ── Disparo por planilha ──

function emAndamento() {
  return [...disparos.values()].find((d) => d.status === 'ENVIANDO') ?? null;
}

/**
 * corpo: { nome?, contatos: [{ telefone, nome?, mensagem?, linha? }], mensagens: [modelo, ...], intervaloSegundos? }
 * Cada contato recebe a mensagem da própria linha, se houver; senão, o próximo modelo da roleta, com {nome} trocado.
 */
export async function criarDisparo(corpo) {
  const erro = (status, codigo, mensagem, detalhes = {}) => ({ status, corpo: { codigo, mensagem, detalhes } });
  if (!configurado()) return erro(503, 'NAO_CONFIGURADO', 'Nenhum celular configurado. Preencha em Configurações.');
  const ativo = emAndamento();
  if (ativo) return erro(409, 'DISPARO_EM_ANDAMENTO', 'Já existe um disparo em andamento. Espere terminar ou cancele.', { id: ativo.id });

  const brutos = Array.isArray(corpo?.contatos) ? corpo.contatos : [];
  if (!brutos.length) return erro(422, 'SEM_CONTATOS', 'A planilha não tem nenhum contato válido.');
  if (brutos.length > LIMITES.contatos) return erro(422, 'CONTATOS_DEMAIS', `No MVP, cada disparo vai até ${LIMITES.contatos} contatos.`);

  const modelos = (Array.isArray(corpo?.mensagens) ? corpo.mensagens : []).filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
  if (modelos.length > LIMITES.modelos) return erro(422, 'MODELOS_DEMAIS', `Use até ${LIMITES.modelos} mensagens na roleta.`);

  // Intervalo sorteado a cada mensagem entre o mínimo e o máximo (ex.: 45 a 80 s), para o chip não
  // disparar num ritmo fixo. `intervaloSegundos` sozinho continua aceito: vira mínimo = máximo.
  const vazio = (v) => v === undefined || v === null || v === '';
  const minBruto = !vazio(corpo?.intervaloMinSegundos) ? corpo.intervaloMinSegundos : corpo?.intervaloSegundos;
  const maxBruto = !vazio(corpo?.intervaloMaxSegundos) ? corpo.intervaloMaxSegundos : minBruto;
  let intervaloMinMs = INTERVALO_PADRAO_MS;
  let intervaloMaxMs = INTERVALO_PADRAO_MS;
  if (!vazio(minBruto) || !vazio(maxBruto)) {
    const min = Number(minBruto);
    const max = Number(maxBruto);
    const ok = (s) => Number.isFinite(s) && s >= LIMITES.intervaloMin && s <= LIMITES.intervaloMax;
    if (!ok(min) || !ok(max))
      return erro(422, 'INTERVALO_INVALIDO', `O intervalo vai de ${LIMITES.intervaloMin} a ${LIMITES.intervaloMax} segundos.`);
    if (min > max) return erro(422, 'INTERVALO_INVALIDO', 'O intervalo mínimo não pode ser maior que o máximo.');
    intervaloMinMs = Math.round(min * 1000);
    intervaloMaxMs = Math.round(max * 1000);
  }

  // Valida linha por linha; telefone repetido entra uma vez só.
  const vistos = new Set();
  const itens = [];
  const problemas = [];
  let duplicados = 0;
  let iModelo = 0;
  brutos.forEach((c, i) => {
    const linha = Number.isInteger(c?.linha) ? c.linha : i + 2;
    const tel = normalizarTelefone(typeof c?.telefone === 'number' ? c.telefone : String(c?.telefone ?? ''));
    if (!tel) return problemas.push({ linha, motivo: 'telefone inválido' });
    if (vistos.has(tel.digitos)) {
      duplicados += 1;
      return;
    }
    vistos.add(tel.digitos);
    const nome = typeof c?.nome === 'string' ? c.nome.trim().slice(0, 80) : '';
    const propria = typeof c?.mensagem === 'string' && c.mensagem.trim() ? c.mensagem.trim() : null;
    if (!propria && !modelos.length) return problemas.push({ linha, motivo: 'sem mensagem (nem na planilha, nem na roleta)' });
    const indiceTexto = propria ? null : (iModelo % modelos.length) + 1;
    if (!propria) iModelo += 1;
    const texto = aplicarModelo(propria ?? modelos[indiceTexto - 1], { nome });
    const t = validarTexto(texto);
    if (t.erro) return problemas.push({ linha, motivo: t.erro[1] });
    itens.push({ tel, nome, texto: t.texto, linha, indiceTexto });
  });
  if (problemas.length) return erro(422, 'PLANILHA_COM_ERROS', `${problemas.length} linha(s) com problema. Corrija e tente de novo.`, { problemas: problemas.slice(0, 50) });
  if (!itens.length) return erro(422, 'SEM_CONTATOS', 'Nenhum contato válido depois de tirar os repetidos.');

  const { chips } = await chipsDoGate({ forcar: true });
  if (!chips.length) return erro(502, 'CHIPS_INDISPONIVEIS', 'Nenhum chip disponível nos celulares. Veja a tela Aparelhos e chips.');

  const id = randomUUID();
  const nomeDisparo = typeof corpo?.nome === 'string' && corpo.nome.trim() ? corpo.nome.trim().slice(0, 80) : `Disparo de ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
  const ids = itens.map((it) => {
    const chip = proximoChip(chips);
    const msg = criarMensagem(it.tel, it.texto, chip, { disparoId: id, linha: it.linha, indiceTexto: it.indiceTexto, nome: it.nome || null, origem: 'disparo' });
    // Guarda o necessário para enviar (e retomar depois de um reinício) até a mensagem sair.
    pendentes.set(msg.id, { e164: it.tel.e164, digitos: it.tel.digitos, texto: it.texto });
    return msg.id;
  });
  const d = { id, nome: nomeDisparo, criadoEm: new Date().toISOString(), terminadoEm: null, intervaloMinMs, intervaloMaxMs, status: 'ENVIANDO', cancelado: false, duplicados, chips: chips.length, modelos: modelos.length, ids };
  disparos.set(id, d);
  agendarGravacao();
  evento('disparo', 'info', `Disparo "${d.nome}" iniciado: ${ids.length} contato(s), ${chips.length} chip(s) na roleta, ${modelos.length} texto(s) na roleta, 1 mensagem a cada ${textoIntervalo(d)}.`, { disparoId: id });
  processarDisparo(d);
  return { status: 202, corpo: resumo(d) };
}

/** Faixa do intervalo do disparo. Disparos gravados antes desta versão só têm `intervaloMs` (fixo). */
function faixa(d) {
  const min = d.intervaloMinMs ?? d.intervaloMs ?? INTERVALO_PADRAO_MS;
  const max = d.intervaloMaxMs ?? d.intervaloMs ?? min;
  return { min, max };
}

function textoIntervalo(d) {
  const { min, max } = faixa(d);
  return min === max ? `${min / 1000} s` : `${min / 1000} a ${max / 1000} s (sorteado)`;
}

/** Sorteia a espera antes da próxima mensagem, entre o mínimo e o máximo (inclusive). */
export function sortearEspera(min, max, aleatorio = Math.random) {
  return Math.round(min + aleatorio() * (max - min));
}

/** Espera `ms`, mas sai antes se o disparo for cancelado (com 80 s de espera, cancelar não pode demorar 80 s). */
async function esperar(ms, d) {
  const fim = Date.now() + ms;
  while (!d.cancelado && Date.now() < fim) await new Promise((r) => setTimeout(r, Math.min(500, fim - Date.now())));
}

/**
 * Envia, uma por vez e com o intervalo do disparo, as mensagens que ainda estão na fila do serviço.
 * O que já saiu (aceita pelo celular em diante) nunca é reenviado — é isso que torna a retomada segura.
 */
async function processarDisparo(d, { esperarAntes = false } = {}) {
  let enviadasNestaRodada = 0;
  const { min, max } = faixa(d);
  for (const id of d.ids) {
    if (d.cancelado) break;
    const msg = mensagens.get(id);
    const p = pendentes.get(id);
    if (!msg || msg.status !== 'CRIADA' || !p) continue;
    // Na retomada depois de uma queda, espera também antes da primeira: a última pode ter saído agora há pouco.
    if (enviadasNestaRodada > 0 || esperarAntes) await esperar(sortearEspera(min, max), d);
    if (d.cancelado) break;
    // Marca e grava NA HORA antes de enviar: se o processo cair agora, a retomada sabe que esta
    // pode ter saído e não reenvia (vira INCERTA) — nunca um SMS em dobro.
    registrar(msg, 'ENVIANDO');
    gravarAgora();
    await despachar(msg, { e164: p.e164, digitos: p.digitos }, p.texto);
    pendentes.delete(id); // saiu (ou falhou de vez): o telefone completo e o texto não ficam mais guardados
    enviadasNestaRodada += 1;
    agendarGravacao();
  }
  if (d.cancelado) {
    for (const id of d.ids) {
      const msg = mensagens.get(id);
      if (msg?.status === 'CRIADA') {
        registrar(msg, 'CANCELADA');
        pendentes.delete(id);
      }
    }
    d.status = 'CANCELADO';
    evento('disparo', 'aviso', `Disparo "${d.nome}" cancelado. As mensagens que ainda não tinham saído foram canceladas.`, { disparoId: d.id });
  } else {
    d.status = 'CONCLUIDO';
    evento('disparo', 'info', `Disparo "${d.nome}": todas as ${d.ids.length} mensagem(ns) foram entregues aos celulares. Acompanhe as entregas.`, { disparoId: d.id });
  }
  d.terminadoEm = new Date().toISOString();
  agendarGravacao();
  log('disparo.fim', { disparoId: d.id, status: d.status });
}

/** Ao subir o serviço: continua os disparos que estavam em andamento quando ele caiu. */
export function retomarDisparos() {
  for (const d of disparos.values()) {
    if (d.status !== 'ENVIANDO') continue;
    let naFila = 0;
    for (const id of d.ids) {
      const msg = mensagens.get(id);
      if (!msg) continue;
      if (msg.status === 'CRIADA' && pendentes.has(id)) naFila += 1;
      else if (msg.status === 'CRIADA') registrar(msg, 'ERRO', 'não foi possível retomar esta mensagem depois do reinício');
      else if (msg.status === 'ENVIANDO') {
        registrar(msg, 'INCERTA', 'o serviço caiu enquanto enviava esta mensagem');
        pendentes.delete(id);
      }
      else if (modo.simular && !FINAIS.has(msg.status)) simular(msg); // no ensaio, termina a simulação interrompida
    }
    evento('disparo', 'aviso', `O serviço reiniciou no meio do disparo "${d.nome}". Retomando ${naFila} mensagem(ns) que ainda não tinham saído; as que já saíram não serão reenviadas.`, { disparoId: d.id });
    processarDisparo(d, { esperarAntes: true });
  }
}

export function cancelarDisparo(id) {
  const d = disparos.get(id);
  if (!d) return { status: 404, corpo: { codigo: 'NAO_ENCONTRADO', mensagem: 'Disparo não encontrado.', detalhes: {} } };
  if (d.status !== 'ENVIANDO') return { status: 409, corpo: { codigo: 'JA_TERMINOU', mensagem: 'Este disparo já terminou.', detalhes: {} } };
  d.cancelado = true;
  agendarGravacao();
  return { status: 202, corpo: { mensagem: 'Cancelando: as mensagens que ainda não saíram não serão enviadas.' } };
}

function contar(ids) {
  const lista = ids.map((i) => mensagens.get(i)).filter(Boolean);
  const c = { total: lista.length, naFila: 0, enviadas: 0, entregues: 0, falhas: 0, canceladas: 0, incertas: 0 };
  for (const m of lista) {
    if (m.status === 'CRIADA') c.naFila += 1;
    else if (ENTREGUES.has(m.status)) c.entregues += 1;
    else if (FALHAS.has(m.status)) c.falhas += 1;
    else if (m.status === 'CANCELADA') c.canceladas += 1;
    else if (m.status === 'INCERTA') c.incertas += 1;
    else c.enviadas += 1; // aceita, na fila do celular, enviada — esperando confirmação
  }
  return c;
}

function resumo(d) {
  const { min, max } = faixa(d);
  return { id: d.id, nome: d.nome, criadoEm: d.criadoEm, terminadoEm: d.terminadoEm, status: d.status, intervaloMinMs: min, intervaloMaxMs: max, duplicados: d.duplicados, chips: d.chips, modelos: d.modelos ?? null, contagem: contar(d.ids) };
}

export function listarDisparos() {
  return [...disparos.values()].reverse().map(resumo);
}

export async function detalheDisparo(id) {
  const d = disparos.get(id);
  if (!d) return null;
  // Atualiza o status das que estão em trânsito (até 25 por consulta, as mais antigas primeiro).
  const transito = d.ids
    .map((i) => mensagens.get(i))
    .filter((m) => m && !FINAIS.has(m.status) && m.idNoProvedor)
    .sort((a, b) => (a.consultadoEm ?? 0) - (b.consultadoEm ?? 0))
    .slice(0, 25);
  for (const m of transito) await atualizarGate(m);
  return { ...resumo(d), mensagens: d.ids.map((i) => mensagens.get(i)).filter(Boolean).map(dto) };
}

export function mensagemPorId(id) {
  return mensagens.get(id) ?? null;
}

export function listarAvulsas() {
  return [...mensagens.values()].filter((m) => m.origem === 'avulso').slice(-20).reverse().map(dto);
}

/** Atualização em segundo plano: mantém os números do painel certos mesmo sem a tela aberta. */
export function iniciarAtualizador() {
  return setInterval(async () => {
    const transito = [...mensagens.values()]
      .filter((m) => !FINAIS.has(m.status) && m.idNoProvedor)
      .sort((a, b) => (a.consultadoEm ?? 0) - (b.consultadoEm ?? 0))
      .slice(0, 10);
    for (const m of transito) await atualizarGate(m);
  }, 5_000).unref();
}

// ── Painel: números de hoje, por chip ──

export async function painel() {
  const desde = inicioDeHoje();
  const hoje = [...mensagens.values()].filter((m) => m.criadaEm >= desde);
  const total = contar(hoje.map((m) => m.id));
  const { chips, erros } = await chipsDoGate();
  const porChip = chips.map((c) => {
    const doChip = hoje.filter((m) => m.chipChave === c.chave);
    const k = contar(doChip.map((m) => m.id));
    const ultimo = doChip.at(-1);
    const concluidas = k.entregues + k.falhas;
    return { ...c, rotulo: rotuloChip(c), hoje: k, taxaEntrega: concluidas ? Math.round((k.entregues / concluidas) * 100) : null, ultimoEnvio: ultimo?.criadaEm ?? null };
  });
  const concluidas = total.entregues + total.falhas;
  return {
    simulado: modo.simular,
    hoje: { ...total, taxaEntrega: concluidas ? Math.round((total.entregues / concluidas) * 100) : null },
    chips: porChip,
    errosAparelhos: erros,
    disparoAtivo: emAndamento() ? resumo(emAndamento()) : null,
    ultimosDisparos: listarDisparos().slice(0, 5),
  };
}
