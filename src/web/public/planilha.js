// Leitor de planilha no navegador, sem bibliotecas: .xlsx (zip + XML) e .csv (vírgula ou ponto e vírgula).
// Expõe window.Planilha = { ler, montarContatos, normalizarTelefone, mascarar, baixarCsv, modeloCsv }.
(function () {
  'use strict';

  // ── CSV ──
  function lerCsv(texto) {
    const t = texto.replace(/^﻿/, '');
    const primeira = t.split(/\r?\n/)[0] || '';
    const conta = (c) => primeira.split(c).length - 1;
    const sep = [';', ',', '\t'].reduce((m, c) => (conta(c) > conta(m) ? c : m), ';');
    const linhas = [];
    let campo = '';
    let linha = [];
    let aspas = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (aspas) {
        if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
        else if (ch === '"') aspas = false;
        else campo += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === sep) { linha.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        linha.push(campo); linhas.push(linha); linha = []; campo = '';
      } else campo += ch;
    }
    if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas.filter((l) => l.some((c) => String(c).trim() !== ''));
  }

  // ── XLSX: lê o zip (diretório central) e descompacta com DecompressionStream ──
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  function indiceZip(bytes) {
    let fim = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (u32(bytes, i) === 0x06054b50) { fim = i; break; }
    }
    if (fim < 0) throw new Error('O arquivo não parece um .xlsx válido.');
    const total = u16(bytes, fim + 10);
    let p = u32(bytes, fim + 16);
    const arquivos = new Map();
    const dec = new TextDecoder();
    for (let i = 0; i < total; i++) {
      if (u32(bytes, p) !== 0x02014b50) break;
      const metodo = u16(bytes, p + 10);
      const tamComp = u32(bytes, p + 20);
      const nLen = u16(bytes, p + 28);
      const eLen = u16(bytes, p + 30);
      const cLen = u16(bytes, p + 32);
      const local = u32(bytes, p + 42);
      const nome = dec.decode(bytes.subarray(p + 46, p + 46 + nLen));
      arquivos.set(nome, { metodo, tamComp, local });
      p += 46 + nLen + eLen + cLen;
    }
    return arquivos;
  }

  async function extrair(bytes, info) {
    const nLen = u16(bytes, info.local + 26);
    const eLen = u16(bytes, info.local + 28);
    const ini = info.local + 30 + nLen + eLen;
    const dados = bytes.subarray(ini, ini + info.tamComp);
    if (info.metodo === 0) return new TextDecoder().decode(dados);
    if (info.metodo !== 8) throw new Error('Compressão do .xlsx não suportada.');
    const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(fluxo).text();
  }

  function colunaParaIndice(ref) {
    const letras = (ref.match(/^[A-Z]+/) || ['A'])[0];
    let n = 0;
    for (const l of letras) n = n * 26 + (l.charCodeAt(0) - 64);
    return n - 1;
  }

  async function lerXlsx(buffer) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador não abre .xlsx. Salve a planilha como .csv.');
    const bytes = new Uint8Array(buffer);
    const zip = indiceZip(bytes);
    const parser = new DOMParser();
    const comum = [];
    if (zip.has('xl/sharedStrings.xml')) {
      const xml = parser.parseFromString(await extrair(bytes, zip.get('xl/sharedStrings.xml')), 'application/xml');
      for (const si of xml.getElementsByTagName('si')) {
        let s = '';
        for (const t of si.getElementsByTagName('t')) s += t.textContent;
        comum.push(s);
      }
    }
    const nomes = [...zip.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    if (!nomes.length) throw new Error('Não encontrei nenhuma aba no .xlsx.');
    const xml = parser.parseFromString(await extrair(bytes, zip.get(nomes[0])), 'application/xml');
    const linhas = [];
    for (const row of xml.getElementsByTagName('row')) {
      const linha = [];
      for (const c of row.getElementsByTagName('c')) {
        const idx = colunaParaIndice(c.getAttribute('r') || 'A');
        const tipo = c.getAttribute('t');
        let valor = '';
        if (tipo === 's') valor = comum[Number(c.getElementsByTagName('v')[0]?.textContent ?? -1)] ?? '';
        else if (tipo === 'inlineStr') valor = [...c.getElementsByTagName('t')].map((t) => t.textContent).join('');
        else {
          valor = c.getElementsByTagName('v')[0]?.textContent ?? '';
          // Número grande (telefone) pode vir em notação científica: 5.515997293395E12
          if (/^-?\d+(\.\d+)?E\+?\d+$/i.test(valor)) valor = Number(valor).toFixed(0);
        }
        linha[idx] = valor;
      }
      linhas.push(Array.from(linha, (v) => (v === undefined ? '' : v)));
    }
    return linhas.filter((l) => l.some((c) => String(c).trim() !== ''));
  }

  async function ler(arquivo) {
    const nome = arquivo.name.toLowerCase();
    if (arquivo.size > 5 * 1024 * 1024) throw new Error('A planilha passa de 5 MB.');
    if (nome.endsWith('.csv') || nome.endsWith('.txt')) return lerCsv(await arquivo.text());
    if (nome.endsWith('.xlsx')) return lerXlsx(await arquivo.arrayBuffer());
    if (nome.endsWith('.xls')) throw new Error('O formato .xls antigo não é aceito. Salve como .xlsx ou .csv.');
    throw new Error('Formato não aceito. Use .xlsx ou .csv.');
  }

  // ── Telefone (mesma regra do servidor) ──
  function normalizarTelefone(entrada) {
    let d = String(entrada ?? '').replace(/\D/g, '');
    if (d.length === 10 || d.length === 11) d = '55' + d;
    if (!/^55[1-9][1-9](9\d{8}|[2-5]\d{7})$/.test(d)) return null;
    return { digitos: d, e164: '+' + d };
  }
  function mascarar(e164) {
    const d = String(e164).replace(/\D/g, '');
    if (d.length < 12) return '***';
    const resto = d.slice(4);
    return '+55 ' + d.slice(2, 4) + ' ' + resto[0] + '****-' + resto.slice(-4);
  }

  // ── Linhas → contatos ──
  const SINONIMOS = {
    telefone: ['telefone', 'celular', 'fone', 'numero', 'número', 'whatsapp', 'phone', 'tel', 'contato'],
    nome: ['nome', 'name', 'cliente', 'credor'],
    mensagem: ['mensagem', 'texto', 'sms', 'message'],
  };
  function semAcento(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

  const letra = (i) => (i >= 26 ? String.fromCharCode(64 + Math.floor(i / 26)) : '') + String.fromCharCode(65 + (i % 26));

  /** Colunas para o operador escolher: letra + cabeçalho (ou um exemplo do valor). */
  function opcoesDeColunas(linhas, cabecalho) {
    const n = Math.max(0, ...linhas.slice(0, 20).map((l) => l.length));
    const exemplo = (i) => String((linhas[cabecalho ? 1 : 0] || [])[i] ?? '').trim().slice(0, 24);
    return Array.from({ length: n }, (_, i) => ({ indice: i, rotulo: letra(i) + ' — ' + (cabecalho && String(linhas[0][i] ?? '').trim() ? String(linhas[0][i]).trim().slice(0, 30) : exemplo(i) || '(vazia)') }));
  }

  /**
   * mapa (opcional) = { telefone, nome, mensagem, cabecalho }: índices escolhidos na tela (-1 = não usar).
   * Sem mapa, detecta pelo cabeçalho; sem cabeçalho reconhecido, A = telefone, B = nome, C = mensagem.
   */
  function montarContatos(linhas, mapa) {
    if (!linhas.length) return { colunas: null, contatos: [], invalidos: [], duplicados: 0, total: 0, mapa: null, opcoes: [] };
    const cab = linhas[0].map(semAcento);
    const usadas = new Set();
    // Primeiro o nome exato ("nome"); depois o que contém a palavra ("Nome do cliente", "Telefone celular").
    const achar = (lista) => {
      const alvo = lista.map(semAcento);
      let i = cab.findIndex((c, k) => !usadas.has(k) && alvo.includes(c));
      if (i < 0) i = cab.findIndex((c, k) => !usadas.has(k) && alvo.some((s) => c.split(/[^a-z0-9]+/).includes(s)));
      if (i >= 0) usadas.add(i);
      return i;
    };
    const telefone = achar(SINONIMOS.telefone);
    const mensagem = achar(SINONIMOS.mensagem);
    const nome = achar(SINONIMOS.nome);
    let col = { telefone, nome, mensagem };
    let inicio = 1;
    if (mapa) {
      col = { telefone: mapa.telefone, nome: mapa.nome, mensagem: mapa.mensagem };
      inicio = mapa.cabecalho ? 1 : 0;
    } else if (col.telefone < 0) {
      // Sem cabeçalho reconhecido: coluna A = telefone, B = nome, C = mensagem.
      col = { telefone: 0, nome: linhas[0].length > 1 ? 1 : -1, mensagem: linhas[0].length > 2 ? 2 : -1 };
      inicio = normalizarTelefone(linhas[0][0]) ? 0 : 1;
    }
    const vistos = new Set();
    const contatos = [];
    const invalidos = [];
    let duplicados = 0;
    for (let i = inicio; i < linhas.length; i++) {
      const l = linhas[i];
      const numeroLinha = i + 1;
      const bruto = l[col.telefone] ?? '';
      const tel = normalizarTelefone(bruto);
      if (!tel) { invalidos.push({ linha: numeroLinha, valor: String(bruto).slice(0, 30) }); continue; }
      if (vistos.has(tel.digitos)) { duplicados++; continue; }
      vistos.add(tel.digitos);
      contatos.push({
        linha: numeroLinha,
        telefone: tel.digitos,
        mascarado: mascarar(tel.e164),
        nome: col.nome >= 0 ? String(l[col.nome] ?? '').trim() : '',
        mensagem: col.mensagem >= 0 ? String(l[col.mensagem] ?? '').trim() : '',
      });
    }
    const nomeCol = (i) => (i >= 0 ? (linhas[0][i] && inicio === 1 ? String(linhas[0][i]) : 'coluna ' + letra(i)) : null);
    return {
      colunas: { telefone: nomeCol(col.telefone), nome: nomeCol(col.nome), mensagem: nomeCol(col.mensagem) },
      contatos, invalidos, duplicados, total: linhas.length - inicio,
      mapa: { telefone: col.telefone, nome: col.nome, mensagem: col.mensagem, cabecalho: inicio === 1 },
      opcoes: opcoesDeColunas(linhas, inicio === 1),
    };
  }

  // ── Linhas → abordagens (textos da roleta) ──
  const SINONIMOS_ABORDAGEM = ['abordagem', 'abordagens', 'mensagem', 'mensagens', 'texto', 'textos', 'modelo', 'sms', 'message'];

  /**
   * Uma abordagem por linha. Usa a coluna "abordagem" (ou mensagem/texto/modelo); sem cabeçalho
   * reconhecido, usa a coluna A e trata a primeira linha como texto também.
   * Devolve { coluna, abordagens: [{ linha, texto }], vazias, repetidas, longas: [{ linha, tamanho }] }.
   */
  function montarAbordagens(linhas, { maxCaracteres = 640 } = {}) {
    if (!linhas.length) return { coluna: null, abordagens: [], vazias: 0, repetidas: 0, longas: [] };
    const cab = linhas[0].map(semAcento);
    const alvo = SINONIMOS_ABORDAGEM.map(semAcento);
    let col = cab.findIndex((c) => alvo.includes(c));
    // "Texto do SMS" é cabeçalho; "Olá {nome}, segue o texto do seu acordo..." é uma abordagem: só célula curta vale.
    if (col < 0) col = cab.findIndex((c) => c.length <= 30 && alvo.some((s) => c.split(/[^a-z0-9]+/).includes(s)));
    const temCabecalho = col >= 0;
    if (!temCabecalho) col = 0;
    const vistos = new Set();
    const abordagens = [];
    const longas = [];
    let vazias = 0;
    let repetidas = 0;
    for (let i = temCabecalho ? 1 : 0; i < linhas.length; i++) {
      const texto = String(linhas[i][col] ?? '').replace(/\r\n?/g, '\n').trim();
      if (!texto) { vazias++; continue; }
      const chave = texto.toLowerCase().replace(/\s+/g, ' ');
      if (vistos.has(chave)) { repetidas++; continue; }
      vistos.add(chave);
      if (texto.length > maxCaracteres) { longas.push({ linha: i + 1, tamanho: texto.length }); continue; }
      abordagens.push({ linha: i + 1, texto });
    }
    const coluna = temCabecalho ? String(linhas[0][col]) : 'coluna A';
    return { coluna, abordagens, vazias, repetidas, longas };
  }

  // ── Arquivos para baixar ──
  function baixarCsv(nomeArquivo, linhas) {
    const esc = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // ── Gerar .xlsx de verdade (zip sem compressão): abre igual em qualquer Excel, sem depender de separador ──
  const TABELA_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zipSemCompressao(arquivos) {
    const enc = new TextEncoder();
    const partes = [];
    const central = [];
    let pos = 0;
    for (const [nome, conteudo] of arquivos) {
      const n = enc.encode(nome);
      const d = enc.encode(conteudo);
      const crc = crc32(d);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, n.length, true);
      partes.push(new Uint8Array(lh.buffer), n, d);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, n.length, true);
      ch.setUint32(42, pos, true);
      central.push(new Uint8Array(ch.buffer), n);
      pos += 30 + n.length + d.length;
    }
    const tamCentral = central.reduce((t, p) => t + p.length, 0);
    const fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
    fim.setUint32(12, tamCentral, true); fim.setUint32(16, pos, true);
    return new Blob([...partes, ...central, new Uint8Array(fim.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  /** Planilha .xlsx de uma aba: texto puro em cada célula, 1ª linha em negrito, largura das colunas ajustada. */
  function gerarXlsx(linhas) {
    const xml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const ncol = Math.max(1, ...linhas.map((l) => l.length));
    const larg = Array.from({ length: ncol }, (_, i) => Math.min(80, Math.max(12, ...linhas.map((l) => String(l[i] ?? '').length + 2))));
    const celula = (v, c, r) => (v === '' || v == null ? '' : '<c r="' + letra(c) + (r + 1) + '" t="inlineStr"' + (r === 0 ? ' s="1"' : '') + '><is><t xml:space="preserve">' + xml(v) + '</t></is></c>');
    const linhasXml = linhas.map((l, r) => '<row r="' + (r + 1) + '">' + l.map((v, c) => celula(v, c, r)).join('') + '</row>').join('');
    const colsXml = larg.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('');
    const NS = 'http://schemas.openxmlformats.org';
    return zipSemCompressao([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="' + NS + '/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="' + NS + '/package/2006/relationships"><Relationship Id="rId1" Type="' + NS + '/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="' + NS + '/spreadsheetml/2006/main" xmlns:r="' + NS + '/officeDocument/2006/relationships"><sheets><sheet name="Planilha1" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="' + NS + '/package/2006/relationships"><Relationship Id="rId1" Type="' + NS + '/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="' + NS + '/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="' + NS + '/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>'],
      ['xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="' + NS + '/spreadsheetml/2006/main"><cols>' + colsXml + '</cols><sheetData>' + linhasXml + '</sheetData></worksheet>'],
    ]);
  }
  function baixarXlsx(nomeArquivo, linhas) {
    const url = URL.createObjectURL(gerarXlsx(linhas));
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function modeloCsv() {
    baixarXlsx('modelo-disparo-sms.xlsx', [
      ['telefone', 'nome', 'mensagem'],
      ['(15) 99999-0001', 'Maria', ''],
      ['(41) 99999-0002', 'João', 'Olá João, esta linha tem a própria mensagem.'],
    ]);
  }

  function modeloAbordagensCsv() {
    baixarXlsx('modelo-abordagens-sms.xlsx', [
      ['abordagem'],
      ['Olá {nome}, aqui é da Recall. Podemos conversar sobre o seu processo?'],
      ['{nome}, tudo bem? Temos uma novidade sobre o seu precatório. Pode falar hoje?'],
      ['Oi {nome}! Sou da Recall e gostaria de falar com você sobre o seu crédito.'],
    ]);
  }

  window.Planilha = { ler, lerCsv, montarContatos, montarAbordagens, normalizarTelefone, mascarar, baixarCsv, baixarXlsx, gerarXlsx, modeloCsv, modeloAbordagensCsv };
})();
