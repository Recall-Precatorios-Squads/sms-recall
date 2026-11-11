// Respostas dos contatos: ligação com a mensagem enviada, repetida, avulsa, métrica, aviso ao time e o ciclo simulado.
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { detalheDisparo } from '../src/servicos/disparos.js';
import { lerRespostas, metricaResposta, registrarRespostas } from '../src/servicos/respostas.js';
import { cicloDeEnvio } from '../src/worker/fila.js';
import { MEIO_DIA, cenario, criarDisparoDireto, esperar } from './apoio.js';

let c: Awaited<ReturnType<typeof cenario>>;
beforeEach(async () => {
  c = await cenario();
});

const MIN = 60_000;
const recebida = (id: string, telefone: string, em: Date, texto = 'quero saber mais') => ({ idExterno: id, telefone, simNumero: 1, texto, recebidaEm: em });

/** Mensagem que já saiu pelo chip 1 em `aceitaEm`. */
async function enviada(telefone: string, aceitaEm: Date, extra: Partial<Prisma.MensagemUncheckedCreateInput> = {}) {
  return prisma.mensagem.create({ data: { telefone, texto: 'oi', status: 'ENTREGUE', chipId: c.chips[0]!.id, aceitaEm, entregueEm: aceitaEm, ...extra } });
}

describe('respostas', () => {
  it('liga a resposta à última mensagem enviada para o telefone, ignora repetida e não grava SMS que não é resposta', async () => {
    const agora = Date.now();
    const d = await criarDisparoDireto(c.usuario.id, []);
    await enviada('+5551999990001', new Date(agora - 3 * 60 * MIN), { disparoId: d.id }); // antiga
    const nova = await enviada('+5551999990001', new Date(agora - 30 * MIN), { disparoId: d.id });
    // remetente chega no formato do app (+55...) e no formato sem +: os dois casam
    const n = await registrarRespostas(c.ap.id, [recebida('r1', '+5551999990001', new Date(agora - 20 * MIN)), recebida('r2', '51 99999-0001', new Date(agora - 10 * MIN)), recebida('r3', '+5511988887777', new Date(agora)), recebida('r4', 'VIVO', new Date(agora), 'promoção')]);
    expect(n).toBe(2);
    const lista = await prisma.resposta.findMany({ orderBy: { id: 'asc' } });
    expect(lista.map((r) => r.mensagemId)).toEqual([nova.id, nova.id]);
    expect(lista[0]).toMatchObject({ disparoId: d.id, chipId: c.chips[0]!.id, telefone: '+5551999990001' });
    expect(await registrarRespostas(c.ap.id, [recebida('r1', '+5551999990001', new Date(agora - 20 * MIN))])).toBe(0);
    expect(await prisma.resposta.count()).toBe(2);
  });

  it('não liga resposta a mensagem que falhou, nem a mensagem de mais de 7 dias, nem a uma enviada depois', async () => {
    const agora = Date.now();
    await enviada('+5551999990002', new Date(agora - 8 * 86_400_000));
    await enviada('+5551999990002', new Date(agora - MIN), { status: 'FALHOU' });
    await enviada('+5551999990002', new Date(agora + MIN));
    await registrarRespostas(c.ap.id, [recebida('r1', '+5551999990002', new Date(agora))]);
    expect(await prisma.resposta.count()).toBe(0);
  });

  it('métrica: respondidas ÷ que saíram sem falha e o tempo típico até a 1ª resposta', async () => {
    const t0 = Date.now() - 2 * 60 * MIN;
    const d = await criarDisparoDireto(c.usuario.id, []);
    await enviada('+5551999990011', new Date(t0), { disparoId: d.id });
    await enviada('+5551999990012', new Date(t0), { disparoId: d.id });
    await enviada('+5551999990013', new Date(t0), { disparoId: d.id });
    await enviada('+5551999990014', new Date(t0), { disparoId: d.id });
    await prisma.mensagem.create({ data: { disparoId: d.id, telefone: '+5551999990015', texto: 'x', status: 'FALHOU' } }); // fora da base
    await registrarRespostas(c.ap.id, [
      recebida('a', '+5551999990011', new Date(t0 + 2 * MIN)),
      recebida('b', '+5551999990011', new Date(t0 + 50 * MIN)), // 2ª resposta do mesmo contato: conta uma vez, tempo pela 1ª
      recebida('c', '+5551999990012', new Date(t0 + 10 * MIN)),
    ]);
    const m = await metricaResposta(Prisma.sql`m.disparo_id = ${d.id}`);
    expect(m).toEqual({ respondidas: 2, base: 4, taxaResposta: 50, tempoMedianoRespostaSegundos: 360, tempoMedioRespostaSegundos: 360 });
    const det = await detalheDisparo(d.id);
    expect(det!.respostas.respondidas).toBe(2);
    expect(det!.mensagens[0]!.respostas.map((r) => r.texto)).toHaveLength(2);
  });

  it('time com webhook recebe o aviso mensagem.respondida na outbox', async () => {
    const time = await prisma.time.create({ data: { nome: 'CRM', chaveHash: 'h', chavePrefixo: 'sms_x', webhookUrl: 'http://127.0.0.1:9/w' } });
    const m = await enviada('+5551999990021', new Date(Date.now() - MIN), { timeId: time.id });
    await registrarRespostas(c.ap.id, [recebida('r', '+5551999990021', new Date())]);
    const aviso = await prisma.aviso.findFirstOrThrow();
    expect(aviso).toMatchObject({ mensagemId: m.id, timeId: time.id, statusMensagem: 'RESPONDIDA' });
    expect(aviso.respostaId).not.toBeNull();
  });

  it('ciclo simulado: envia, o contato responde e o worker lê do celular', async () => {
    const d = await criarDisparoDireto(c.usuario.id, ['+5551999990037', '+5551999990038'], { minMs: 1, maxMs: 1 });
    expect(await cicloDeEnvio(MEIO_DIA)).toBe(2);
    expect(await lerRespostas()).toBe(0); // ainda não deu o tempo da resposta simulada
    await esperar(4_300);
    expect(await lerRespostas()).toBe(1); // só o número terminado em 7 responde no ensaio
    expect(await lerRespostas()).toBe(0); // lida de novo: não duplica
    const det = await detalheDisparo(d.id);
    expect(det!.respostas).toMatchObject({ respondidas: 1, base: 2, taxaResposta: 50 });
  });
});
