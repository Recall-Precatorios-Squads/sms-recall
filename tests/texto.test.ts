import { describe, expect, it } from 'vitest';
import { aplicarModelo, contarSegmentos, mascarar, normalizarTelefone, sortearEspera } from '../src/lib/texto.js';

describe('texto e telefone', () => {
  it('normaliza celular brasileiro em vários formatos', () => {
    expect(normalizarTelefone('(51) 99224-9103')?.e164).toBe('+5551992249103');
    expect(normalizarTelefone('5511999991234')?.e164).toBe('+5511999991234');
    expect(normalizarTelefone(5511999991234)?.e164).toBe('+5511999991234');
    expect(normalizarTelefone('123')).toBeNull();
  });
  it('mascara o telefone para tela e log', () => {
    expect(mascarar('+5551992249103')).toBe('+55 51 9****-9103');
  });
  it('acento muda a codificação e o custo', () => {
    expect(contarSegmentos('Ola, teste').segmentos).toBe(1);
    expect(contarSegmentos('Olá'.repeat(30)).alfabeto).toBe('UCS-2');
  });
  it('troca {nome} e limpa espaços quando não há nome', () => {
    expect(aplicarModelo('Ola {nome}, tudo bem?', { nome: 'Ana' })).toBe('Ola Ana, tudo bem?');
    expect(aplicarModelo('Ola {nome}, tudo bem?', {})).toBe('Ola, tudo bem?');
  });
  it('sorteio do intervalo fica dentro da faixa', () => {
    for (let i = 0; i < 500; i++) {
      const v = sortearEspera(45_000, 80_000);
      expect(v).toBeGreaterThanOrEqual(45_000);
      expect(v).toBeLessThanOrEqual(80_000);
    }
  });
});

describe('sinal do chip', async () => {
  const { sinalDoChip } = await import('../src/servicos/aparelhos.js');
  const ap = { ativo: true, online: true };
  it('online, instável, bloqueado, desativado e sem conexão', () => {
    expect(sinalDoChip({ ativo: true, presente: true, falhasSeguidas: 0 }, ap)).toMatchObject({ nivel: 'ONLINE', barras: 3 });
    expect(sinalDoChip({ ativo: true, presente: true, falhasSeguidas: 2 }, ap)).toMatchObject({ nivel: 'INSTAVEL', barras: 2 });
    expect(sinalDoChip({ ativo: false, presente: true, falhasSeguidas: 5 }, ap)).toMatchObject({ nivel: 'BLOQUEADO', barras: 0 });
    expect(sinalDoChip({ ativo: false, presente: true, falhasSeguidas: 0 }, ap)).toMatchObject({ nivel: 'DESATIVADO' });
    expect(sinalDoChip({ ativo: true, presente: false, falhasSeguidas: 0 }, ap)).toMatchObject({ nivel: 'SEM_CONEXAO', rotulo: 'Chip não detectado' });
    expect(sinalDoChip({ ativo: true, presente: true, falhasSeguidas: 0 }, { ativo: true, online: false })).toMatchObject({ nivel: 'SEM_CONEXAO', rotulo: 'Sem conexão' });
  });
});
