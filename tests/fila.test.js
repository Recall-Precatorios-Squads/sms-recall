// Fila com Postgres de verdade e celulares simulados: sem envio em dobro, ritmo por chip, órfãs, retry e cancelamento.
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { cifrar } from '../src/lib/cripto.js';
import { acompanharEntregas, cicloDeEnvio, concluirDisparos, recuperarOrfas, reservarEnvio } from '../src/worker/fila.js';
import { cancelarDisparo } from '../src/servicos/disparos.js';

let usuario;
let chips;

async function limpar() {
  await prisma.$executeRawUnsafe('TRUNCATE eventos, mensagens, disparos, chips, aparelhos, sessoes, usuarios RESTART IDENTITY CASCADE');
}

async function criarDisparo(telefones, { minMs = 60_000, maxMs = 60_000 } = {}) {
  const d = await prisma.disparo.create({ data: { nome: 'teste', criadoPorId: usuario.id, intervaloMinMs: minMs, intervaloMaxMs: maxMs, total: telefones.length } });
  await prisma.mensagem.createMany({ data: telefones.map((t, i) => ({ disparoId: d.id, telefone: t, texto: `msg ${i}` })) });
  return d;
}

beforeEach(async () => {
  await limpar();
  usuario = await prisma.usuario.create({ data: { email: 'a@a.com', nome: 'Op', senhaHash: 'x' } });
  const ap = await prisma.aparelho.create({ data: { nome: 'Celular 1', url: 'http://x', usuario: 'u', senhaCifrada: cifrar('s'), online: true } });
  chips = await Promise.all([1, 2].map((n) => prisma.chip.create({ data: { aparelhoId: ap.id, simNumero: n } })));
});

describe('fila', () => {
  it('dois workers no mesmo chip: só um reserva', async () => {
    await criarDisparo(['+5511999990001', '+5511999990002', '+5511999990003']);
    const [a, b] = await Promise.all([reservarEnvio(chips[0].id), reservarEnvio(chips[0].id)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await prisma.mensagem.count({ where: { status: 'ENVIANDO' } })).toBe(1);
  });

  it('ciclos em paralelo nunca mandam a mesma mensagem duas vezes e respeitam o ritmo por chip', async () => {
    await criarDisparo(Array.from({ length: 6 }, (_, i) => `+55119999900${10 + i}`));
    await Promise.all([cicloDeEnvio(), cicloDeEnvio(), cicloDeEnvio()]);
    const saidas = await prisma.mensagem.findMany({ where: { status: { not: 'PENDENTE' } } });
    expect(saidas).toHaveLength(2); // 2 chips, cada um espera 60 s depois do próprio envio
    expect(new Set(saidas.map((m) => m.chipId)).size).toBe(2);
    expect(saidas.every((m) => m.tentativas === 1)).toBe(true);
    const c = await prisma.chip.findUnique({ where: { id: chips[0].id } });
    expect(c.proximoEnvioEm.getTime()).toBeGreaterThan(Date.now() + 55_000);
    expect(await cicloDeEnvio()).toBe(0);
  });

  it('chip desativado ou celular fora do ar não envia', async () => {
    await criarDisparo(['+5511999990001']);
    await prisma.aparelho.updateMany({ data: { online: false } });
    expect(await cicloDeEnvio()).toBe(0);
  });

  it('mensagem presa em ENVIANDO (processo caiu) vira INCERTA e não é reenviada', async () => {
    const d = await criarDisparo(['+5511999990001']);
    await prisma.mensagem.updateMany({ where: { disparoId: d.id }, data: { status: 'ENVIANDO', enviandoEm: new Date(Date.now() - 3 * 60_000), tentativas: 1 } });
    expect(await recuperarOrfas()).toBe(1);
    await cicloDeEnvio();
    const m = await prisma.mensagem.findFirst();
    expect(m.status).toBe('INCERTA');
    expect(m.tentativas).toBe(1);
  });

  it('falha informada pelo celular volta para a fila e reabre o disparo já fechado', async () => {
    const d = await criarDisparo(['+5511900000123'], { minMs: 1, maxMs: 1 }); // número que o simulador faz falhar
    await cicloDeEnvio();
    await concluirDisparos();
    expect((await prisma.disparo.findUnique({ where: { id: d.id } })).status).toBe('CONCLUIDO');
    await new Promise((r) => setTimeout(r, 1_200));
    await acompanharEntregas();
    const m = await prisma.mensagem.findFirst();
    expect(m.status).toBe('PENDENTE');
    expect(m.chipId).toBeNull();
    expect((await prisma.disparo.findUnique({ where: { id: d.id } })).status).toBe('ENVIANDO');
  });

  it('entrega confirmada pelo celular vira ENTREGUE', async () => {
    await criarDisparo(['+5511999990001'], { minMs: 1, maxMs: 1 });
    await cicloDeEnvio();
    await new Promise((r) => setTimeout(r, 3_200));
    await acompanharEntregas();
    expect((await prisma.mensagem.findFirst()).status).toBe('ENTREGUE');
  });

  it('cancelar tira da fila só o que não saiu', async () => {
    const d = await criarDisparo(['+5511999990001', '+5511999990002', '+5511999990003']);
    await reservarEnvio(chips[0].id);
    await cancelarDisparo(d.id, usuario);
    const st = (await prisma.mensagem.findMany({ orderBy: { id: 'asc' } })).map((m) => m.status);
    expect(st).toEqual(['ENVIANDO', 'CANCELADA', 'CANCELADA']);
    expect(await cicloDeEnvio()).toBe(0);
  });
});
