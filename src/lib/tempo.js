import { config } from '../config.js';

/** Início do dia de hoje no fuso da tela, como Date em UTC. */
export function inicioDeHoje(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: config.fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(agora)
    .reduce((a, p) => ((a[p.type] = p.value), a), {});
  const comoUtc = Date.UTC(+partes.year, +partes.month - 1, +partes.day, +partes.hour, +partes.minute, +partes.second);
  const deslocamento = comoUtc - Math.floor(agora.getTime() / 1000) * 1000;
  return new Date(Date.UTC(+partes.year, +partes.month - 1, +partes.day) - deslocamento);
}
