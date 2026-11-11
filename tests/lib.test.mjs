import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timingSafeEqual } from 'node:crypto';
import { aplicarModelo, contarSegmentos, mascarar, normalizarTelefone, tokensIguais } from '../src/lib.mjs';

test('normaliza celular em vários formatos (texto e número)', () => {
  for (const e of ['(11) 99999-1234', '11999991234', '5511999991234', '+55 11 99999-1234', 5511999991234]) {
    assert.deepEqual(normalizarTelefone(e), { digitos: '5511999991234', e164: '+5511999991234' }, String(e));
  }
});

test('aceita fixo com 8 dígitos começando em 2 a 5', () => {
  assert.equal(normalizarTelefone('(11) 3333-4444')?.digitos, '551133334444');
});

test('recusa número que o Android recusaria', () => {
  for (const e of ['', '123', '999991234', '(00) 99999-1234', '(11) 89999-1234', '(11) 1333-4444', '(10) 99999-1234', null, undefined]) {
    assert.equal(normalizarTelefone(e), null, String(e));
  }
});

test('mascara o telefone para log e tela', () => {
  assert.equal(mascarar('+5511999991234'), '+55 11 9****-1234');
});

test('segmentos: 160 sem acento em 1 SMS; um "ã" derruba para 70', () => {
  assert.equal(contarSegmentos('a'.repeat(160)).segmentos, 1);
  assert.equal(contarSegmentos('a'.repeat(161)).segmentos, 2);
  assert.equal(contarSegmentos('ã'.repeat(71)).segmentos, 2);
  assert.equal(contarSegmentos('é à Ç').alfabeto, 'GSM-7');
});

test('modelo: troca {nome}; sem nome, some sem deixar espaço sobrando', () => {
  assert.equal(aplicarModelo('Olá {nome}, tudo bem?', { nome: 'Maria' }), 'Olá Maria, tudo bem?');
  assert.equal(aplicarModelo('Olá {nome}, tudo bem?', {}), 'Olá, tudo bem?');
  assert.equal(aplicarModelo('Oi { NOME }!', { nome: ' João ' }), 'Oi João!');
});

test('compara tokens sem quebrar com tamanhos diferentes', () => {
  assert.equal(tokensIguais('abc', 'abc', timingSafeEqual), true);
  assert.equal(tokensIguais('abc', 'abcd', timingSafeEqual), false);
});
