// Leitor de planilha do navegador (public/planilha.js): abordagens para a roleta.
// E o sorteio do intervalo entre mensagens (src/disparos.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { sortearEspera } from '../src/disparos.mjs';

// planilha.js é um script de navegador que se pendura em window.Planilha.
const contexto = { window: {} };
vm.runInNewContext(readFileSync(join(import.meta.dirname, '..', 'public', 'planilha.js'), 'utf8'), contexto);
const P = contexto.window.Planilha;
// Arrays criados dentro do vm têm outro protótipo: passa por JSON para comparar com deepStrictEqual.
const nativo = (v) => JSON.parse(JSON.stringify(v));
const montarAbordagens = (...a) => nativo(P.montarAbordagens(...a));
const lerCsv = (t) => nativo(P.lerCsv(t));

test('abordagens: coluna "abordagem", uma por linha, sem vazias nem repetidas', () => {
  const r = montarAbordagens([
    ['Telefone', 'Abordagem'],
    ['', 'Olá {nome}, tudo bem?'],
    ['', ''],
    ['', '  olá {NOME},   tudo bem?  '],
    ['', 'Segunda abordagem'],
  ]);
  assert.equal(r.coluna, 'Abordagem');
  assert.deepEqual(r.abordagens.map((a) => a.texto), ['Olá {nome}, tudo bem?', 'Segunda abordagem']);
  assert.equal(r.vazias, 1);
  assert.equal(r.repetidas, 1);
});

test('abordagens: sem cabeçalho reconhecido usa a coluna A e conta a primeira linha', () => {
  const r = montarAbordagens([['Olá {nome}, segue o texto sobre o seu crédito.'], ['{nome}, podemos conversar hoje?']]);
  assert.equal(r.coluna, 'coluna A', 'uma abordagem longa com a palavra "texto" não vira cabeçalho');
  assert.equal(r.abordagens.length, 2);
});

test('abordagens: aceita "mensagem" e "texto do SMS" como cabeçalho; texto longo fica de fora', () => {
  assert.equal(montarAbordagens([['mensagem'], ['A']]).abordagens.length, 1);
  assert.equal(montarAbordagens([['Texto do SMS'], ['A']]).coluna, 'Texto do SMS');
  const r = montarAbordagens([['abordagem'], ['x'.repeat(641)], ['ok']], { maxCaracteres: 640 });
  assert.deepEqual(r.longas, [{ linha: 2, tamanho: 641 }]);
  assert.deepEqual(r.abordagens.map((a) => a.texto), ['ok']);
});

test('abordagens: CSV com ponto e vírgula e texto entre aspas com vírgula', () => {
  const linhas = lerCsv('abordagem\n"Olá {nome}, aqui é da Recall"\nOutra');
  assert.deepEqual(montarAbordagens(linhas).abordagens.map((a) => a.texto), ['Olá {nome}, aqui é da Recall', 'Outra']);
});

test('intervalo: o sorteio fica sempre entre o mínimo e o máximo', () => {
  assert.equal(sortearEspera(45_000, 80_000, () => 0), 45_000);
  assert.equal(sortearEspera(45_000, 80_000, () => 0.999999), 80_000);
  for (let i = 0; i < 1000; i++) {
    const v = sortearEspera(45_000, 80_000);
    assert.ok(v >= 45_000 && v <= 80_000, `fora da faixa: ${v}`);
  }
  assert.equal(sortearEspera(3_000, 3_000), 3_000, 'mínimo = máximo vira intervalo fixo');
});
