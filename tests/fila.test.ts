// Fila com Postgres de verdade e celulares simulados: sem envio em dobro, ritmo e cota por chip, janela,
// prioridade, órfãs, nova tentativa, cancelamento, bloqueio e as outboxes de aviso e alerta.
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { bloquear } from '../src/servicos/cadastros.js';
import { cancelarDisparo, criarDisparo } from '../src/servicos/disparos.js';
import { registrarEvento } from '../src/servicos/eventos.js';
import { acompanharEntregas, cicloDeEnvio, concluirDisparos, recuperarOrfas, reservarEnvio } from '../src/worker/fila.js';
import { MEIO_DIA, NOITE, cenario, criarDisparoDireto, esperar } from './apoio.js';

let c: Awaited<ReturnType<typeof cenario>>;
beforeEach(async () => {
  c = await cenario();
});

describe('fila', () => {
  it('dois workers no mesmo chip: só um reserva', async () => {
    await criarDisparoDireto(c.usuario.id, ['+5511999990001', '+5511999990002', '+5511999990003']);
    const [a, b] = await Promise.all([reservarEnvio(c.chips[0]!.id), reservarEnvio(c.chips[0]!.id)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await prisma.mensagem.count({ where: { status: 'ENVIANDO' } })).toBe(1);
  });

  it('ciclos em paralelo nunca mandam a mesma mensagem duas vezes e respeitam o ritmo por chip', async () => {
    await criarDisparoDireto(c.usuario.id, Array.from({ length: 6 }, (_, i) => `+55119999900${10 + i}`));
    await Promise.all([cicloDeEnvio(MEIO_DIA), cicloDeEnvio(MEIO_DIA), cicloDeEnvio(MEIO_DIA)]);
    const saidas = await prisma.mensagem.findMany({ where: { status: { not: 'PENDENTE' } } });
    expect(saidas).toHaveLength(2); // 2 chips, cada um espera 60 s depois do próprio envio
    expect(new Set(saidas.map((m) => m.chipId)).size).toBe(2);
    expect(saidas.every((m) => m.tentativas === 1)).toBe(true);
    const chip = await prisma.chip.findUniqueOrThrow({ where: { id: c.chips[0]!.id } });
    expect(chip.proximoEnvioEm.getTime()).toBeGreaterThan(Date.now() + 55_000);
    expect(await cicloDeEnvio(MEIO_DIA)).toBe(0);
  });

  it('fora da janela de envio nada sai', async () => {
    await criarDisparoDireto(c.usuario.id, ['+5511999990001']);
    expect(await cicloDeEnvio(NOITE)).toBe(0);
    expect(await cicloDeEnvio(MEIO_DIA)).toBe(1);
  });

  it('chip na cota do dia não envia mais', async () => {
    await prisma.chip.updateMany({ data: { cotaDiaria: 1 } });
    await criarDisparoDireto(c.usuario.id, ['+5511999990001', '+5511999990002', '+5511999990003'], { minMs: 1, maxMs: 1 });
    await cicloDeEnvio(MEIO_DIA);
    await esperar(20);
    expect(await cicloDeEnvio(MEIO_DIA)).toBe(0);
    expect(await prisma.mensagem.count({ where: { status: 'PENDENTE' } })).toBe(1);
  });

  it('mensagem de maior prioridade sai primeiro', async () => {
    await criarDisparoDireto(c.usuario.id, ['+5511999990001']);
    const urgente = await prisma.mensagem.create({ data: { telefone: '+5511999990009', texto: 'urgente', prioridade: 5 } });
    const r = await reservarEnvio(c.chips[0]!.id);
    expect(r?.mensagem.id).toBe(urgente.id);
  });

  it('chip desativado ou celular fora do ar não envia', async () => {
    await criarDisparoDireto(c.usuario.id, ['+5511999990001']);
    await prisma.aparelho.updateMany({ data: { online: false } });
    expect(await cicloDeEnvio(MEIO_DIA)).toBe(0);
  });

  it('mensagem presa em ENVIANDO (processo caiu) vira INCERTA e não é reenviada', async () => {
    const d = await criarDisparoDireto(c.usuario.id, ['+5511999990001']);
    await prisma.mensagem.updateMany({ where: { disparoId: d.id }, data: { status: 'ENVIANDO', enviandoEm: new Date(Date.now() - 3 * 60_000), tentativas: 1 } });
    expect(await recuperarOrfas()).toBe(1);
    await cicloDeEnvio(MEIO_DIA);
    const m = await prisma.mensagem.findFirstOrThrow();
    expect(m.status).toBe('INCERTA');
    expect(m.tentativas).toBe(1);
  });

  it('falha informada pelo celular volta para a fila e reabre o disparo já fechado', async () => {
    const d = await criarDisparoDireto(c.usuario.id, ['+5511900000123'], { minMs: 1, maxMs: 1 }); // o simulador faz falhar
    await cicloDeEnvio(MEIO_DIA);
    await concluirDisparos();
    expect((await prisma.disparo.findUniqueOrThrow({ where: { id: d.id } })).status).toBe('CONCLUIDO');
    await esperar(1_200);
    await acompanharEntregas();
    const m = await prisma.mensagem.findFirstOrThrow();
    expect(m.status).toBe('PENDENTE');
    expect(m.chipId).toBeNull();
    expect((await prisma.disparo.findUniqueOrThrow({ where: { id: d.id } })).status).toBe('ENVIANDO');
  });

  it('entrega confirmada vira ENTREGUE e, se a mensagem é de um time com webhook, gera aviso na outbox', async () => {
    const time = await prisma.time.create({ data: { nome: 'CRM', chaveHash: 'h', chavePrefixo: 'sms_xxxx', webhookUrl: 'http://127.0.0.1:9/aviso' } });
    await prisma.mensagem.create({ data: { telefone: '+5511999990001', texto: 'oi', timeId: time.id, intervaloMinMs: 1, intervaloMaxMs: 1 } });
    await cicloDeEnvio(MEIO_DIA);
    await esperar(3_200);
    await acompanharEntregas();
    expect((await prisma.mensagem.findFirstOrThrow()).status).toBe('ENTREGUE');
    const avisos = await prisma.aviso.findMany();
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.statusMensagem).toBe('ENTREGUE');
  });

  it('cancelar tira da fila só o que não saiu', async () => {
    const d = await criarDisparoDireto(c.usuario.id, ['+5511999990001', '+5511999990002', '+5511999990003']);
    await reservarEnvio(c.chips[0]!.id);
    await cancelarDisparo(d.id, c.usuario);
    const st = (await prisma.mensagem.findMany({ orderBy: { id: 'asc' } })).map((m) => m.status);
    expect(st).toEqual(['ENVIANDO', 'CANCELADA', 'CANCELADA']);
    expect(await cicloDeEnvio(MEIO_DIA)).toBe(0);
  });

  it('telefone bloqueado: sai do disparo novo e o que estava na fila é cancelado', async () => {
    await criarDisparoDireto(c.usuario.id, ['+5551992249103']);
    const r = await bloquear(['(51) 99224-9103', 'abc'], 'Pediu para sair', c.usuario);
    expect(r).toMatchObject({ adicionados: 1, invalidos: ['abc'], canceladas: 1 });
    const d = await criarDisparo({ contatos: [{ telefone: '51992249103' }, { telefone: '51999291479' }], mensagens: ['Ola'], intervaloMinSegundos: 45, intervaloMaxSegundos: 80 }, { usuario: c.usuario });
    expect(d?.total).toBe(1);
    expect(d?.bloqueados).toBe(1);
  });

  it('evento de erro entra na outbox de alertas na mesma gravação', async () => {
    await registrarEvento({ tipo: 'chip', nivel: 'ERRO', texto: 'chip pausado' });
    await registrarEvento({ tipo: 'login', nivel: 'INFO', texto: 'entrou' });
    expect(await prisma.alerta.count()).toBe(1);
  });
});
