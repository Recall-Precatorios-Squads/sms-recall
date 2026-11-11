// Worker do sms-recall: envia, acompanha, vigia os celulares, recupera órfãs, entrega alertas e avisos.
// Pode rodar mais de um (docker compose up -d --scale worker=2): o SKIP LOCKED impede envio em dobro.
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { config, janelaAberta } from '../config.js';
import { prisma } from '../db.js';
import { log } from '../lib/log.js';
import { sincronizarTodos } from '../servicos/aparelhos.js';
import { registrarEvento } from '../servicos/eventos.js';
import { acompanharEntregas, cicloDeEnvio, concluirDisparos, recuperarOrfas } from './fila.js';
import { canaisDeAlerta, enviarAlertas, enviarAvisos } from './notificador.js';

let parando = false;

/** Roda `fn` a cada `ms`, nunca duas vezes ao mesmo tempo; erro vira log e o laço segue. */
function laco(nome: string, ms: number, fn: () => Promise<unknown>): NodeJS.Timeout {
  let rodando = false;
  const executar = async (): Promise<void> => {
    if (rodando || parando) return;
    rodando = true;
    try {
      await fn();
    } catch (e) {
      log('worker.erro', { laco: nome, erro: e instanceof Error ? e.message : String(e) }, 'error');
    } finally {
      rodando = false;
    }
  };
  void executar();
  return setInterval(() => void executar(), ms);
}

/** Batida: o painel e o /health mostram se o envio está vivo e se está fora da janela. */
async function bater(): Promise<void> {
  const foraDaJanela = !janelaAberta();
  await prisma.batidaWorker.upsert({ where: { id: config.worker.id }, create: { id: config.worker.id, ultimaEm: new Date(), foraDaJanela }, update: { ultimaEm: new Date(), foraDaJanela } });
}

/** Avisa (uma vez por dia) se o backup mais novo tem mais de 26 h. */
let ultimoAvisoBackup = '';
async function conferirBackup(): Promise<void> {
  if (!config.pastaBackups) return;
  const hoje = new Date().toISOString().slice(0, 10);
  if (ultimoAvisoBackup === hoje) return;
  let maisNovo = 0;
  try {
    for (const f of await readdir(config.pastaBackups)) if (f.endsWith('.dump')) maisNovo = Math.max(maisNovo, (await stat(join(config.pastaBackups, f))).mtimeMs);
  } catch {
    /* pasta ainda não existe */
  }
  if (Date.now() - maisNovo > 26 * 3_600_000) {
    ultimoAvisoBackup = hoje;
    await registrarEvento({ tipo: 'backup', nivel: 'ERRO', texto: maisNovo ? `O último backup do banco tem mais de 26 h (${new Date(maisNovo).toLocaleString('pt-BR', { timeZone: config.fuso })}). Veja o container backup.` : 'Nenhum backup do banco encontrado. Veja o container backup.' });
  }
}

async function iniciar(): Promise<void> {
  log('worker.inicio', { id: config.worker.id, simulado: config.simulado, janela: `${config.janela.inicio}-${config.janela.fim}`, cotaDiariaChip: config.cotaDiariaChip, alertas: canaisDeAlerta() });
  await recuperarOrfas();
  await sincronizarTodos();
  const timers = [
    laco('envio', config.worker.tickMs, async () => {
      await bater();
      await cicloDeEnvio();
      await concluirDisparos();
    }),
    laco('acompanhar', config.worker.acompanharMs, acompanharEntregas),
    laco('vigiar', config.worker.vigiarMs, sincronizarTodos),
    laco('ceifar', config.worker.ceifarMs, recuperarOrfas),
    laco('notificar', config.worker.notificarMs, async () => {
      await enviarAlertas();
      await enviarAvisos();
    }),
    laco('backup', 3_600_000, conferirBackup),
  ];
  const parar = (sinal: string): void => {
    if (parando) return;
    parando = true;
    log('worker.parando', { sinal });
    timers.forEach(clearInterval);
    setTimeout(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    }, 2_000);
  };
  process.on('SIGTERM', () => parar('SIGTERM'));
  process.on('SIGINT', () => parar('SIGINT'));
}

iniciar().catch((e: unknown) => {
  log('worker.falha_ao_iniciar', { erro: e instanceof Error ? e.message : String(e) }, 'error');
  process.exit(1);
});
