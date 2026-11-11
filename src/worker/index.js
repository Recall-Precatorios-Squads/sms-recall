// Worker do sms-recall: um laço que envia, acompanha, vigia os celulares e recupera mensagens órfãs.
// Pode rodar mais de um (docker compose up -d --scale worker=2): o SKIP LOCKED impede envio em dobro.
import { config } from '../config.js';
import { prisma } from '../db.js';
import { log } from '../lib/log.js';
import { sincronizarTodos } from '../servicos/aparelhos.js';
import { acompanharEntregas, cicloDeEnvio, concluirDisparos, recuperarOrfas } from './fila.js';

let parando = false;

/** Roda `fn` a cada `ms`, nunca duas vezes ao mesmo tempo; erro vira log e o laço segue. */
function laco(nome, ms, fn) {
  let rodando = false;
  const executar = async () => {
    if (rodando || parando) return;
    rodando = true;
    try {
      await fn();
    } catch (e) {
      log('worker.erro', { laco: nome, erro: e.message }, 'error');
    } finally {
      rodando = false;
    }
  };
  executar();
  return setInterval(executar, ms);
}

async function iniciar() {
  log('worker.inicio', { simulado: config.simulado });
  await recuperarOrfas();
  await sincronizarTodos();
  const timers = [
    laco('envio', config.worker.tickMs, async () => {
      await cicloDeEnvio();
      await concluirDisparos();
    }),
    laco('acompanhar', config.worker.acompanharMs, acompanharEntregas),
    laco('vigiar', config.worker.vigiarMs, sincronizarTodos),
    laco('ceifar', config.worker.ceifarMs, recuperarOrfas),
  ];
  const parar = async (sinal) => {
    if (parando) return;
    parando = true;
    log('worker.parando', { sinal });
    timers.forEach(clearInterval);
    setTimeout(async () => {
      await prisma.$disconnect();
      process.exit(0);
    }, 2_000);
  };
  process.on('SIGTERM', () => parar('SIGTERM'));
  process.on('SIGINT', () => parar('SIGINT'));
}

iniciar().catch((e) => {
  log('worker.falha_ao_iniciar', { erro: e.message }, 'error');
  process.exit(1);
});
