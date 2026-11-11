// Leitor de planilha do navegador (src/web/public/planilha.js): separador do CSV e escolha de colunas.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const contexto: { window: { Planilha?: Record<string, (...a: unknown[]) => unknown> } } = { window: {} };
vm.runInNewContext(readFileSync(join(import.meta.dirname, '..', 'src', 'web', 'public', 'planilha.js'), 'utf8'), contexto);
const P = contexto.window.Planilha!;
// Objetos criados dentro do vm têm outro protótipo: passa por JSON para comparar.
const nativo = <T>(v: unknown): T => JSON.parse(JSON.stringify(v)) as T;
type Contatos = { contatos: { nome: string; mensagem: string; telefone: string }[]; mapa: { telefone: number; nome: number; mensagem: number; cabecalho: boolean }; opcoes: { indice: number; rotulo: string }[] };

describe('planilha de contatos', () => {
  it('CSV: detecta ; , e tab como separador', () => {
    const esperado = [['telefone', 'nome'], ['51999991234', 'Ana']];
    expect(nativo(P.lerCsv!('telefone;nome\n51999991234;Ana'))).toEqual(esperado);
    expect(nativo(P.lerCsv!('telefone,nome\n51999991234,Ana'))).toEqual(esperado);
    expect(nativo(P.lerCsv!('telefone\tnome\n51999991234\tAna'))).toEqual(esperado);
  });

  it('detecta as colunas pelo cabeçalho e devolve as opções para a tela', () => {
    const r = nativo<Contatos>(P.montarContatos!([['Cliente', 'Obs', 'Celular'], ['Ana', 'x', '(51) 99224-9103']]));
    expect(r.mapa).toEqual({ telefone: 2, nome: 0, mensagem: -1, cabecalho: true });
    expect(r.contatos[0]).toMatchObject({ nome: 'Ana', telefone: '5551992249103' });
    expect(r.opcoes.map((o) => o.rotulo)).toEqual(['A — Cliente', 'B — Obs', 'C — Celular']);
  });

  it('o operador escolhe as colunas: telefone, nome, mensagem e se a 1ª linha é cabeçalho', () => {
    const linhas = [['x', 'y', 'z'], ['Bia', '51999291479', 'Texto, com vírgula']];
    const r = nativo<Contatos>(P.montarContatos!(linhas, { telefone: 1, nome: 0, mensagem: 2, cabecalho: true }));
    expect(r.contatos).toHaveLength(1);
    expect(r.contatos[0]).toMatchObject({ nome: 'Bia', mensagem: 'Texto, com vírgula' });
    const semCab = nativo<Contatos>(P.montarContatos!([['Bia', '51999291479']], { telefone: 1, nome: 0, mensagem: -1, cabecalho: false }));
    expect(semCab.contatos).toHaveLength(1);
    expect(semCab.mapa.cabecalho).toBe(false);
  });
});
