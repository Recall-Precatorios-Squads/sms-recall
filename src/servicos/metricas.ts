// Métricas de um time na API /v1: quanto foi pedido, entregue, falhou etc., por período e por dia.
import type { StatusMensagem } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { inicioDeHoje } from '../lib/tempo.js';
import { type Grupo, contagemDe } from './disparos.js';
import { ErroNegocio, ROTULOS } from './mensagens.js';

const DIA_MS = 86_400_000;
const MAX_DIAS = 92;

/** "2026-11-11" → início desse dia no fuso da tela (UTC). */
function inicioDoDia(data: string): Date {
  return inicioDeHoje(new Date(`${data}T15:00:00Z`));
}

const hojeNoFuso = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: config.fuso }).format(new Date());

export function periodo(de?: string, ate?: string): { de: string; ate: string; inicio: Date; fim: Date } {
  const d = de ?? hojeNoFuso();
  const a = ate ?? d;
  const inicio = inicioDoDia(d);
  const fim = new Date(inicioDoDia(a).getTime() + DIA_MS);
  if (fim <= inicio) throw new ErroNegocio(422, 'PERIODO_INVALIDO', 'A data final não pode ser antes da inicial.');
  if (fim.getTime() - inicio.getTime() > MAX_DIAS * DIA_MS) throw new ErroNegocio(422, 'PERIODO_LONGO', `Consulte no máximo ${MAX_DIAS} dias por vez.`);
  return { de: d, ate: a, inicio, fim };
}

export async function metricasDoTime(time: { id: number; cotaDiaria: number }, de?: string, ate?: string) {
  const p = periodo(de, ate);
  const onde = { timeId: time.id, criadoEm: { gte: p.inicio, lt: p.fim } };
  const [grupos, porDia, tempo, usadasHoje] = await Promise.all([
    prisma.mensagem.groupBy({ by: ['status'], where: onde, _count: { _all: true } }),
    prisma.$queryRaw<{ dia: string; status: StatusMensagem; n: number }[]>`
      SELECT to_char(criado_em AT TIME ZONE ${config.fuso}, 'YYYY-MM-DD') AS dia, status, count(*)::int AS n
        FROM mensagens
       WHERE time_id = ${time.id} AND criado_em >= ${p.inicio} AND criado_em < ${p.fim}
       GROUP BY 1, 2 ORDER BY 1`,
    prisma.$queryRaw<{ segundos: number | null }[]>`
      SELECT round(avg(extract(epoch FROM (entregue_em - criado_em))))::int AS segundos
        FROM mensagens
       WHERE time_id = ${time.id} AND status = 'ENTREGUE' AND criado_em >= ${p.inicio} AND criado_em < ${p.fim}`,
    prisma.mensagem.count({ where: { timeId: time.id, criadoEm: { gte: inicioDeHoje() } } }),
  ]);
  const resumo = contagemDe(grupos as Grupo[]);
  const finalizadas = resumo.entregues + resumo.falhas;
  const dias = new Map<string, Grupo[]>();
  for (const l of porDia) {
    const lista = dias.get(l.dia) ?? [];
    lista.push({ status: l.status, _count: { _all: Number(l.n) } });
    dias.set(l.dia, lista);
  }
  return {
    periodo: { de: p.de, ate: p.ate },
    resumo,
    porStatus: Object.fromEntries(grupos.map((g) => [g.status, { quantidade: g._count._all, rotulo: ROTULOS[g.status] }])),
    taxaEntrega: finalizadas ? Math.round((resumo.entregues / finalizadas) * 1000) / 10 : null,
    tempoMedioEntregaSegundos: tempo[0]?.segundos ?? null,
    porDia: [...dias.entries()].map(([dia, g]) => ({ dia, ...contagemDe(g) })),
    cotaHoje: { usadas: usadasHoje, cota: time.cotaDiaria, restante: Math.max(0, time.cotaDiaria - usadasHoje) },
  };
}
