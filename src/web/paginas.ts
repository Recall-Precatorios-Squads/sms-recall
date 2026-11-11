// Telas do serviço de SMS no design system da Recall (tokens em /public/tokens.css, Inter, ícones Lucide).
// Cada função devolve o HTML completo de uma página. Os dados vêm da API por fetch, no navegador.

const ICONES = {
  painel: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  disparo: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  mensagem: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  celular: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  logs: '<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  ajustes: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  lua: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  alerta: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  atividade: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  mais: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  atualizar: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  parar: '<rect width="14" height="14" x="5" y="5" rx="2"/>',
  bateria: '<rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  revisao: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  bloqueio: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  chave: '<path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  copiar: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  editar: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
};
type NomeIcone = keyof typeof ICONES;
function icone(nome: NomeIcone, tam = 20): string {
  return `<svg class="ic" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;
}

const CSS = `
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0}
body{background:var(--fundo-pagina);color:var(--texto-primario);font-family:var(--font-sans);font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}
a{color:var(--acao-texto)}
:focus-visible{outline:2px solid var(--foco-anel);outline-offset:-1px;box-shadow:0 0 0 4px var(--foco-halo)}
.ic{flex:0 0 auto}
.shell{display:grid;min-height:100vh}
@media(min-width:1000px){.shell{grid-template-columns:240px minmax(0,1fr);gap:var(--space-12)}}
.lateral{background:var(--superficie);border-right:1px solid var(--borda-padrao);box-shadow:var(--sombra-card);border-top-right-radius:var(--radius-xl);padding:var(--space-8) 0;display:grid;align-content:start;gap:var(--space-8)}
[data-theme="escuro"] .lateral{background:var(--superficie-campo)}
.marca{padding:0 var(--space-6);display:grid;gap:var(--space-1)}
.marca .ante{font-size:10px;line-height:1.2;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--dourado-700)}
[data-theme="escuro"] .marca .ante{color:var(--marca-dourado)}
.marca b{font-size:16px;line-height:1.2;font-weight:700}
.marca span{font-size:12px;line-height:1.2;color:var(--texto-secundario)}
.menu{display:grid;gap:var(--space-1)}
.item{position:relative;display:flex;align-items:center;gap:var(--space-3);margin-left:var(--space-6);margin-right:var(--space-4);padding:var(--space-3) var(--space-4);color:var(--texto-secundario);text-decoration:none;font-size:14px;font-weight:500;border-radius:var(--radius-md)}
.item:hover{color:var(--texto-primario);background:var(--superficie-sutil)}
.item.ativo{color:var(--texto-primario);font-weight:600;padding-left:calc(var(--space-4) + 8px)}
.item.ativo::before{content:"";position:absolute;left:0;top:0;bottom:0;width:8px;background:var(--dourado-700);border-radius:var(--radius-xs)}
[data-theme="escuro"] .item.ativo::before{background:var(--marca-dourado)}
.rodape-lateral{padding:0 var(--space-6);font-size:12px;line-height:1.2;color:var(--texto-secundario);display:grid;gap:var(--space-2)}
@media(max-width:999px){.lateral{border-right:0;border-bottom:1px solid var(--borda-padrao);border-radius:0 0 var(--radius-xl) var(--radius-xl);padding:var(--space-4) 0;gap:var(--space-3)}.menu{grid-auto-flow:column;overflow-x:auto;padding:0 var(--space-4)}.item{margin:0;white-space:nowrap}.rodape-lateral{padding:0 var(--space-4);grid-auto-flow:column;justify-content:space-between;align-items:center}}
.conteudo{width:100%;max-width:1200px;padding:var(--space-8) var(--space-6) var(--space-16);display:grid;gap:var(--space-8);align-content:start;min-width:0}
@media(max-width:999px){.conteudo{padding:var(--space-6) var(--space-4) var(--space-12)}}
.cab{display:flex;flex-wrap:wrap;gap:var(--space-4);align-items:flex-end;justify-content:space-between}
.cab-txt{display:grid;gap:var(--space-2);min-width:0}
.antetitulo{font-size:16px;line-height:1.2;font-weight:500;color:var(--dourado-700)}
[data-theme="escuro"] .antetitulo{color:var(--marca-dourado)}
h1{margin:0;font-size:32px;line-height:1.2;font-weight:700}
.sub{margin:0;color:var(--cinza-700);font-size:14px;max-width:72ch}
[data-theme="escuro"] .sub{color:var(--texto-secundario)}
.pilulas{display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap}
.pilula{display:inline-flex;align-items:center;gap:var(--space-2);height:40px;padding:0 var(--space-4);background:var(--superficie);border:1px solid transparent;border-radius:var(--radius-full);font-size:12px;font-weight:500;color:var(--texto-primario)}
[data-theme="escuro"] .pilula{border-color:var(--borda-padrao)}
button.pilula{cursor:pointer;width:40px;padding:0;justify-content:center;font:inherit}
.grade{display:grid;gap:var(--space-6)}
@media(min-width:900px){.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.g4{grid-template-columns:repeat(4,minmax(0,1fr))}.g21{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}}
@media(min-width:600px) and (max-width:899px){.g4,.g3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:600px) and (max-width:1199px){.g5{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1200px){.g5{grid-template-columns:repeat(5,minmax(0,1fr))}}
.card{background:var(--superficie);border:1px solid var(--borda-padrao);box-shadow:var(--sombra-card);border-radius:var(--radius-lg);padding:var(--space-5);display:grid;gap:var(--space-4);align-content:start;min-width:0}
.card.neutro{background:var(--superficie-neutra);border-color:var(--borda-neutra)}
.card-cab{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;justify-content:space-between}
.card h2{margin:0;font-size:15px;line-height:1.2;font-weight:600}
.secao{font-size:12px;line-height:1.45;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--texto-secundario)}
.apoio{margin:0;color:var(--texto-secundario);font-size:14px}
.dica{font-size:12px;line-height:1.2;color:var(--texto-secundario)}
.kpi{display:grid;gap:var(--space-2)}
.kpi .valor{font-size:40px;line-height:1.1;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.kpi .rot{font-size:12px;line-height:1.45;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--texto-secundario)}
.kpi .det{font-size:12px;line-height:1.2;color:var(--texto-secundario)}
.campo{display:grid;gap:var(--space-2);min-width:0}
label,.rotulo{font-size:14px;line-height:1.2;font-weight:500}
input,textarea,select{font:inherit;font-size:14px;color:var(--texto-primario);background:var(--superficie-campo);border:1px solid var(--borda-neutra);border-radius:var(--radius-md);padding:0 var(--space-3);width:100%;min-width:0}
input,select{height:48px}
textarea{min-height:96px;padding:var(--space-3);resize:vertical}
input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--foco-anel);outline-offset:-1px;box-shadow:0 0 0 4px var(--foco-halo)}
input.invalido{border-color:var(--erro)}
.msg-erro{font-size:12px;line-height:1.2;font-weight:500;color:var(--erro)}
.segmentado{display:inline-flex;flex-wrap:wrap;background:var(--superficie-sutil);border-radius:var(--radius-md);padding:var(--space-1);gap:var(--space-1)}
.segmentado label{display:inline-flex;align-items:center;min-height:40px;padding:0 var(--space-4);border-radius:var(--radius-md);cursor:pointer;color:var(--texto-secundario);border:1px solid transparent}
.segmentado input{position:absolute;opacity:0;width:1px;height:1px}
.segmentado label:has(input:checked){background:var(--superficie);border-color:var(--borda-padrao);color:var(--texto-primario);font-weight:600}
.segmentado label:has(input:focus-visible){outline:2px solid var(--foco-anel);outline-offset:-1px;box-shadow:0 0 0 4px var(--foco-halo)}
.botao{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);height:48px;padding:0 var(--space-5);border-radius:var(--radius-md);font:inherit;font-size:16px;line-height:1;font-weight:500;cursor:pointer;text-decoration:none;white-space:nowrap}
.botao.primario{background:var(--acao-primaria);color:var(--acao-primaria-texto);border:1px solid var(--acao-primaria);box-shadow:var(--sombra-acao)}
.botao.primario:hover{background:var(--acao-primaria-hover);border-color:var(--acao-primaria-hover)}
.botao.secundario{background:transparent;color:var(--acao-texto);border:1px solid var(--borda-neutra)}
.botao.secundario:hover{background:var(--superficie-sutil)}
.botao.perigo{background:transparent;color:var(--erro);border:1px solid var(--erro)}
.botao.pequeno{height:40px;font-size:14px;padding:0 var(--space-4)}
.botao:disabled{background:var(--superficie-sutil);color:var(--texto-desabilitado);border-color:transparent;box-shadow:none;cursor:not-allowed}
.acoes{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center}
.badge{display:inline-flex;align-items:center;gap:var(--space-1);font-size:11px;line-height:1.2;font-weight:600;padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm);white-space:nowrap}
.badge.sucesso{color:var(--sucesso);background:var(--sucesso-fundo)}
.badge.erro{color:var(--erro);background:var(--erro-fundo)}
.badge.alerta{color:var(--alerta-texto);background:var(--alerta-fundo)}
.badge.triagem{color:var(--triagem);background:var(--triagem-fundo)}
.badge.neutro{color:var(--texto-secundario);background:var(--superficie-sutil)}
.alerta-caixa{display:flex;gap:var(--space-3);align-items:flex-start;border-radius:var(--radius-md);padding:var(--space-4);font-size:14px}
.alerta-caixa.alerta{color:var(--alerta-texto);background:var(--alerta-fundo)}
.alerta-caixa.erro{color:var(--erro);background:var(--erro-fundo)}
.alerta-caixa.sucesso{color:var(--sucesso);background:var(--sucesso-fundo)}
.alerta-caixa.info{color:var(--triagem);background:var(--triagem-fundo)}
.alerta-caixa a{color:inherit;font-weight:600}
.seg{display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-4);font-size:12px;line-height:1.2;color:var(--texto-secundario)}
.seg b{color:var(--texto-primario);font-weight:700;font-variant-numeric:tabular-nums}
.progresso{height:8px;border-radius:var(--radius-full);background:var(--progresso-trilha);overflow:hidden}
.progresso i{display:block;height:100%;width:0;background:var(--progresso-preenchido);transition:width .4s}
.tabela{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}
th{font-size:12px;line-height:1.45;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--texto-secundario);text-align:left;padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--borda-neutra);background:var(--superficie-sutil);white-space:nowrap}
td{padding:var(--space-3);border-bottom:1px solid var(--borda-neutra);vertical-align:top;font-variant-numeric:tabular-nums}
tr:last-child td{border-bottom:0}
tr.clicavel{cursor:pointer}
tr.clicavel:hover td{background:var(--superficie-sutil)}
.vazio{color:var(--texto-secundario);font-size:14px;padding:var(--space-4) 0}
code{font-family:ui-monospace,Consolas,monospace;font-size:12px;background:var(--superficie-sutil);border-radius:var(--radius-xs);padding:var(--space-05) var(--space-1);overflow-wrap:anywhere}
.chip-card{display:grid;gap:var(--space-3)}
.chip-topo{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)}
.chip-topo b{font-size:15px;line-height:1.2;font-weight:600}
.chip-num{font-size:12px;line-height:1.2;color:var(--texto-secundario);font-variant-numeric:tabular-nums}
.mini{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-2)}
.mini div{display:grid;gap:2px;background:var(--superficie-sutil);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3)}
.mini span{font-size:11px;line-height:1.2;color:var(--texto-secundario)}
.mini b{font-size:16px;line-height:1.2;font-weight:700;font-variant-numeric:tabular-nums}
.linha-info{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-4);font-size:12px;line-height:1.2;color:var(--texto-secundario);align-items:center}
.linha-info span{display:inline-flex;gap:var(--space-1);align-items:center}
.eventos{list-style:none;margin:0;padding:0;display:grid}
.eventos li{display:grid;grid-template-columns:72px 64px minmax(0,1fr);gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--borda-padrao);align-items:start;font-size:14px}
.eventos li:last-child{border-bottom:0}
.eventos time{font-size:12px;color:var(--texto-secundario);font-variant-numeric:tabular-nums;padding-top:2px}
.eventos small{display:block;font-size:12px;color:var(--texto-secundario)}
.passos{display:grid;gap:var(--space-6)}
.passo-cab{display:flex;gap:var(--space-3);align-items:center}
.passo-n{width:28px;height:28px;border-radius:var(--radius-full);display:grid;place-items:center;font-size:12px;font-weight:700;background:var(--superficie-sutil);color:var(--texto-secundario);flex:0 0 auto}
.passo-n.feito{background:var(--acao-primaria);color:var(--acao-primaria-texto)}
.soltar{border:1px dashed var(--borda-neutra);border-radius:var(--radius-lg);padding:var(--space-8) var(--space-5);display:grid;justify-items:center;gap:var(--space-3);text-align:center;background:var(--superficie-sutil);cursor:pointer}
.soltar.sobre{border-color:var(--foco-anel);background:var(--foco-halo)}
.soltar input{position:absolute;opacity:0;width:1px;height:1px}
.trilha{display:flex;align-items:flex-start;overflow-x:auto;padding:var(--space-1) 0}
.etapa{flex:1 1 0;min-width:76px;display:grid;justify-items:center;gap:var(--space-2);text-align:center;position:relative;font-size:12px;line-height:1.2;color:var(--texto-secundario)}
.etapa::before{content:"";position:absolute;top:11px;left:-50%;width:100%;height:2px;background:var(--progresso-trilha)}
.etapa:first-child::before{display:none}
.etapa .bola{width:24px;height:24px;border-radius:var(--radius-full);border:1px solid var(--borda-neutra);background:var(--superficie);position:relative;display:grid;place-items:center;color:var(--acao-primaria-texto)}
.etapa.feita{color:var(--texto-primario);font-weight:500}
.etapa.feita .bola{background:var(--progresso-preenchido);border-color:var(--progresso-preenchido)}
.etapa.feita::before{background:var(--progresso-preenchido)}
.resultado{display:grid;gap:var(--space-1);padding:var(--space-4);border-radius:var(--radius-md);background:var(--superficie-sutil)}
.resultado.sucesso{background:var(--sucesso-fundo);color:var(--sucesso)}
.resultado.erro{background:var(--erro-fundo);color:var(--erro)}
.resultado b{font-size:16px;line-height:1.2;font-weight:700}
.resultado span{font-size:12px;line-height:1.2}
details summary{cursor:pointer;font-weight:500}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const CSS_EXTRA = `
.login{min-height:100vh;display:grid;place-items:center;padding:var(--space-6) var(--space-4)}
.login-card{width:100%;max-width:400px}
.rodape-lateral .usuario{display:grid;gap:var(--space-1)}
.rodape-lateral .usuario b{font-size:14px;line-height:1.2;color:var(--texto-primario);font-weight:600}
.cab-linha{display:flex;justify-content:space-between;align-items:center;gap:var(--space-2)}
.aparelho-chips{display:grid;gap:var(--space-2)}
.chip-linha{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-3);align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-top:1px solid var(--borda-padrao);font-size:14px}
.chip-linha:first-child{border-top:0}
.check{display:inline-flex;gap:var(--space-2);align-items:center;font-weight:400}
.check input{width:auto;height:auto}
.sinal{display:inline-flex;align-items:center;gap:var(--space-1);font-size:12px;font-weight:600;white-space:nowrap}
.sinal svg{flex:none}
.sinal-explica{font-size:12px;color:var(--texto-secundario)}
.sino-caixa{position:relative}
.pilula.sino{position:relative}
.sino-num{position:absolute;top:calc(-1 * var(--space-1));right:calc(-1 * var(--space-1));min-width:18px;height:18px;padding:0 var(--space-1);border-radius:var(--radius-full);background:var(--erro);color:var(--acao-primaria-texto);font-size:11px;font-weight:700;display:grid;place-items:center;line-height:1}
.sino-painel{position:absolute;right:0;top:calc(100% + var(--space-2));width:min(380px,calc(100vw - 32px));background:var(--superficie);border:1px solid var(--borda-padrao);border-radius:var(--radius-lg);box-shadow:var(--sombra-menu);padding:var(--space-4);display:grid;gap:var(--space-3);z-index:20}
.sino-cab{display:flex;justify-content:space-between;align-items:center;gap:var(--space-2);font-size:14px}
.sino-lista{display:grid;gap:var(--space-2);max-height:360px;overflow:auto}
.sino-item{display:grid;gap:var(--space-1);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);font-size:12px;line-height:1.45}
.sino-item.erro{background:var(--erro-fundo);color:var(--erro)}
.sino-item.aviso{background:var(--alerta-fundo);color:var(--alerta-texto)}
.sino-item.visto{background:var(--superficie-sutil);color:var(--texto-secundario)}
.avisos-flutuantes{position:fixed;right:max(var(--space-4),env(safe-area-inset-right,0px));bottom:max(var(--space-4),env(safe-area-inset-bottom,0px));display:grid;gap:var(--space-2);z-index:30;width:min(400px,calc(100vw - 32px))}
.aviso-flutuante{display:flex;gap:var(--space-3);align-items:flex-start;border-radius:var(--radius-md);padding:var(--space-4);box-shadow:var(--sombra-menu);font-size:14px;line-height:1.45}
.aviso-flutuante.erro{background:var(--erro-fundo);color:var(--erro);border:1px solid var(--erro)}
.aviso-flutuante.aviso{background:var(--alerta-fundo);color:var(--alerta-texto);border:1px solid var(--alerta-texto)}
.aviso-flutuante button{margin-left:auto;background:none;border:0;color:inherit;cursor:pointer;font:inherit;font-size:18px;line-height:1}
`;

export const LIMITES_PADRAO = { contatos: 500, modelos: 20, caracteres: 640, intervaloMin: 1, intervaloMax: 600 };

export interface Ctx {
  usuario: { nome: string; papel: 'ADMIN' | 'OPERADOR' };
  id?: number;
  limites?: Partial<typeof LIMITES_PADRAO>;
  celularUrlPadrao?: string;
}

const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('sms-recall-tema');if(t==='escuro'||t==='claro')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

const SCRIPT_COMUM = `
const $ = (id) => document.getElementById(id);
function esc(x){ return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function hora(iso){ return iso ? new Date(iso).toLocaleTimeString('pt-BR') : ''; }
// Sinal do chip: 3 barras + texto. A cor vem do estado; o texto diz o estado (cor nunca é o único sinal).
const COR_SINAL = { ONLINE: 'var(--sucesso)', INSTAVEL: 'var(--alerta-texto)', BLOQUEADO: 'var(--erro)', DESATIVADO: 'var(--texto-desabilitado)', SEM_CONEXAO: 'var(--texto-desabilitado)' };
function sinalHtml(s){
  if (!s) return '';
  const cor = COR_SINAL[s.nivel] || 'var(--texto-desabilitado)';
  const barras = [0,1,2].map(i => '<rect x="'+(1+i*6)+'" y="'+(10-i*4)+'" width="4" height="'+(4+i*4)+'" rx="1" style="fill:'+(i < s.barras ? cor : 'var(--borda-neutra)')+'"/>').join('');
  const x = s.nivel === 'BLOQUEADO' || s.nivel === 'SEM_CONEXAO' ? '<path d="M13 1l4 4M17 1l-4 4" style="stroke:'+cor+'" stroke-width="2" stroke-linecap="round" fill="none"/>' : '';
  return '<span class="sinal" title="'+esc(s.explicacao)+'"><svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true">'+barras+x+'</svg><span style="color:'+cor+'">'+esc(s.rotulo)+'</span></span>';
}
function dataHora(iso){ return iso ? new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''; }
// Toda chamada passa por aqui: 401 = sessão acabou, volta para o login.
async function api(url, opcoes){
  const r = await fetch(url, opcoes);
  if (r.status === 401) { location.href = '/login'; throw new Error('Sessão expirada'); }
  return r;
}
function enviar(metodo, url, corpo){ return api(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo ?? {}) }); }
const postJson = (url, corpo) => enviar('POST', url, corpo);
const putJson = (url, corpo) => enviar('PUT', url, corpo);
const patchJson = (url, corpo) => enviar('PATCH', url, corpo);
async function lerJson(r){ try { return await r.json(); } catch { return {}; } }
function caixa(id, tipo, html){ const b = $(id); b.hidden = false; b.className = 'alerta-caixa ' + tipo; b.innerHTML = '<span>' + html + '</span>'; }
function badgeStatus(m){ const cls = m.entregue ? 'sucesso' : m.falhou ? 'erro' : m.status === 'INCERTA' ? 'alerta' : m.status === 'CANCELADA' ? 'neutro' : m.final ? 'neutro' : 'triagem'; return '<span class="badge '+cls+'">'+esc(m.rotulo)+'</span>'; }
function badgeDisparo(s){ return s === 'ENVIANDO' ? '<span class="badge triagem">Enviando</span>' : s === 'CANCELADO' ? '<span class="badge alerta">Cancelado</span>' : '<span class="badge sucesso">Concluído</span>'; }
function badgeNivel(n){ return n === 'ERRO' ? '<span class="badge erro">Erro</span>' : n === 'AVISO' ? '<span class="badge alerta">Aviso</span>' : '<span class="badge neutro">Info</span>'; }
function criador(d){ return d.criadoPor ? d.criadoPor.nome : (d.time ? 'API · ' + d.time : 'API'); }
function taxa(e, f){ return (e + f) ? Math.round(e / (e + f) * 100) + '%' : '—'; }
function duracao(seg){ if (seg == null) return '—'; if (seg < 60) return seg + ' s'; const m = Math.round(seg / 60); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); if (h < 24) return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); return Math.round(h / 24) + ' d'; }
function detalheResposta(r){ if (!r || !r.base) return 'nenhuma mensagem saiu ainda'; return String(r.taxaResposta).replace('.', ',') + '% das ' + r.base + ' que saíram' + (r.tempoMedianoRespostaSegundos != null ? ' · respondem em ~' + duracao(r.tempoMedianoRespostaSegundos) : ''); }
function pintarPager(page, size, total, onIr){
  const paginas = Math.max(1, Math.ceil(total / size));
  $('pInfo').textContent = 'Página ' + page + ' de ' + paginas + ' · ' + total + ' no total';
  $('pAnt').disabled = page <= 1; $('pProx').disabled = page >= paginas;
  $('pAnt').onclick = () => onIr(page - 1); $('pProx').onclick = () => onIr(page + 1);
}
const GSM = new Set("@£$¥èéùìòÇ\\nØø\\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà");
const EXT = new Set("^{}\\\\[~]|€");
function segmentos(t){ let gsm=true,n=0; const fora=new Set();
  for(const ch of t){ if(GSM.has(ch)) n++; else if(EXT.has(ch)) n+=2; else { gsm=false; fora.add(ch); } }
  if(gsm) return {alf:'GSM-7', n, seg: n===0?0:(n<=160?1:Math.ceil(n/153)), fora:[]};
  const m=t.length; return {alf:'UCS-2', n:m, seg: m<=70?1:Math.ceil(m/67), fora:[...fora]}; }
function textoSegmentos(t){ const s = segmentos(t); return '<span>'+s.alf+'</span><span>Caracteres <b>'+s.n+'</b></span><span>Cobrado como <b>'+s.seg+' SMS</b></span>' + (s.fora.length ? '<span>Por causa de <b>'+s.fora.slice(0,6).map(esc).join(' ')+'</b></span>' : ''); }
(function(){
  const b = document.getElementById('btnTema'); if (!b) return;
  const pintar = () => { const escuro = document.documentElement.getAttribute('data-theme') === 'escuro';
    b.innerHTML = escuro ? ${JSON.stringify(icone('sol', 20))} : ${JSON.stringify(icone('lua', 20))};
    b.setAttribute('aria-label', escuro ? 'Usar tema claro' : 'Usar tema escuro'); };
  b.addEventListener('click', () => { const novo = document.documentElement.getAttribute('data-theme') === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.setAttribute('data-theme', novo); try { localStorage.setItem('sms-recall-tema', novo); } catch(e){} pintar(); });
  pintar();
})();
(function(){
  const s = document.getElementById('btnSair'); if (!s) return;
  s.addEventListener('click', async () => { s.disabled = true; try { await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch(e){} location.href = '/login'; });
})();
// Alertas na tela, em todas as páginas: sino com o número de novos + aviso no canto quando chega um alerta.
// "Visto" fica neste navegador (cada pessoa marca os seus).
(function(){
  const sino = document.getElementById('btnSino'); if (!sino) return;
  const CHAVE = 'sms-recall-alertas-visto';
  let visto = 0; try { visto = Number(localStorage.getItem(CHAVE) || 0); } catch(e){}
  let maiorAoAbrir = null; let ultimos = [];
  const classe = (n) => n === 'ERRO' ? 'erro' : 'aviso';
  const nome = (n) => n === 'ERRO' ? 'Erro' : 'Aviso';
  function pintarSino(){
    const novos = ultimos.filter(a => a.id > visto).length;
    const num = $('sinoNum'); num.hidden = !novos; num.textContent = novos > 9 ? '9+' : String(novos);
    sino.setAttribute('aria-label', novos ? novos + ' alerta(s) novo(s)' : 'Alertas');
    $('sinoLista').innerHTML = ultimos.length
      ? ultimos.map(a => '<div class="sino-item ' + classe(a.nivel) + (a.id <= visto ? ' visto' : '') + '"><b>' + nome(a.nivel) + ' · ' + dataHora(a.criadoEm) + '</b><span>' + esc(a.texto) + '</span></div>').join('')
      : '<span class="dica">Nenhum alerta nas últimas 24 h.</span>';
  }
  function avisoNoCanto(a){
    const box = document.createElement('div'); box.className = 'aviso-flutuante ' + classe(a.nivel); box.setAttribute('role', 'alert');
    box.innerHTML = '<span><b>' + nome(a.nivel) + '</b> · ' + esc(a.texto) + '</span><button type="button" aria-label="Fechar aviso">×</button>';
    box.querySelector('button').addEventListener('click', () => box.remove());
    $('avisosFlutuantes').prepend(box); setTimeout(() => box.remove(), a.nivel === 'ERRO' ? 30000 : 15000);
  }
  async function buscar(){
    try {
      const r = await api('/api/alertas'); if (!r.ok) return;
      ultimos = (await r.json()).data;
      const maior = ultimos.length ? ultimos[0].id : 0;
      if (maiorAoAbrir === null) maiorAoAbrir = maior;
      else { ultimos.filter(a => a.id > maiorAoAbrir).reverse().forEach(avisoNoCanto); maiorAoAbrir = Math.max(maiorAoAbrir, maior); }
      pintarSino();
    } catch(e){}
  }
  sino.addEventListener('click', (e) => { e.stopPropagation(); const p = $('sinoPainel'); p.hidden = !p.hidden; sino.setAttribute('aria-expanded', String(!p.hidden)); });
  $('sinoVisto').addEventListener('click', () => { if (ultimos.length) visto = Math.max(visto, ultimos[0].id); try { localStorage.setItem(CHAVE, String(visto)); } catch(e){} pintarSino(); });
  document.addEventListener('click', (e) => { const caixa = document.querySelector('.sino-caixa'); if (caixa && !caixa.contains(e.target)) { $('sinoPainel').hidden = true; sino.setAttribute('aria-expanded', 'false'); } });
  buscar(); setInterval(buscar, 15000);
})();
`;

const PAPEL: Record<string, string> = { ADMIN: 'Administrador', OPERADOR: 'Operador' };

type ItemMenu = [string, string, NomeIcone, string];

function menuDe(ctx: Pick<Ctx, 'usuario'>): ItemMenu[] {
  const itens: ItemMenu[] = [
    ['geral', '/', 'painel', 'Visão geral'],
    ['disparos', '/disparos', 'disparo', 'Disparos'],
    ['revisao', '/revisao', 'revisao', 'Revisão'],
    ['aparelhos', '/aparelhos', 'celular', 'Aparelhos e chips'],
    ['bloqueios', '/bloqueios', 'bloqueio', 'Bloqueios'],
    ['logs', '/logs', 'logs', 'Logs'],
  ];
  if (ctx.usuario && ctx.usuario.papel === 'ADMIN') {
    itens.push(['usuarios', '/usuarios', 'usuarios', 'Usuários']);
    itens.push(['times', '/times', 'chave', 'Times (API)']);
  }
  return itens;
}

function escHtml(x: unknown): string {
  const mapa: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(x ?? '').replace(/[&<>"']/g, (c) => mapa[c] ?? c);
}

function cabecaHtml(titulo: string, extraHead = ''): string {
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} · Serviço de SMS</title>
<script>${SCRIPT_TEMA}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/public/tokens.css">
<style>${CSS}${CSS_EXTRA}</style>
${extraHead}`;
}

interface OpcoesShell {
  ativo: string;
  antetitulo: string;
  titulo: string;
  sub?: string;
  acoes?: string;
  corpo: string;
  script?: string;
  extraHead?: string;
  usuario?: Ctx['usuario'];
}

function shell({ ativo, antetitulo, titulo, sub, acoes = '', corpo, script = '', extraHead = '', usuario }: OpcoesShell): string {
  const ctxMenu = { usuario: usuario as Ctx['usuario'] };
  const nome = usuario ? escHtml(usuario.nome) : '';
  const papel = usuario ? escHtml(PAPEL[usuario.papel] || usuario.papel) : '';
  return `<!doctype html>
<html lang="pt-BR" data-theme="claro">
<head>
${cabecaHtml(titulo, extraHead)}
</head>
<body>
<div class="shell">
  <aside class="lateral">
    <div class="marca"><span class="ante">Recall Precatórios</span><b>Serviço de SMS</b><span>Envio pelos chips</span></div>
    <nav class="menu" aria-label="Menu">
      ${menuDe(ctxMenu).map(([k, href, ic, n]) => `<a class="item${k === ativo ? ' ativo' : ''}" href="${href}"${k === ativo ? ' aria-current="page"' : ''}>${icone(ic, 24)}<span>${n}</span></a>`).join('')}
    </nav>
    <div class="rodape-lateral">
      <div class="usuario"><b>${nome}</b><span>${papel}</span></div>
      <button class="botao secundario pequeno" type="button" id="btnSair">${icone('sair', 16)}Sair</button>
    </div>
  </aside>
  <main class="conteudo">
    <div class="cab">
      <div class="cab-txt">
        <span class="antetitulo">${antetitulo}</span>
        <h1>${titulo}</h1>
        ${sub ? `<p class="sub">${sub}</p>` : ''}
      </div>
      <div class="pilulas">
        ${acoes}
        <div class="sino-caixa">
          <button class="pilula sino" type="button" id="btnSino" aria-label="Alertas" aria-expanded="false">${icone('sino', 20)}<span class="sino-num" id="sinoNum" hidden></span></button>
          <div class="sino-painel" id="sinoPainel" hidden>
            <div class="sino-cab"><b>Alertas das últimas 24 h</b><button class="botao secundario pequeno" type="button" id="sinoVisto">Marcar como vistos</button></div>
            <div class="sino-lista" id="sinoLista"><span class="dica">Carregando…</span></div>
            <a class="dica" href="/logs">Ver todos os logs</a>
          </div>
        </div>
        <button class="pilula" type="button" id="btnTema" aria-label="Trocar tema"></button>
      </div>
    </div>
    ${corpo}
  </main>
</div>
<div class="avisos-flutuantes" id="avisosFlutuantes" aria-live="polite"></div>
<script>${SCRIPT_COMUM}${script}</script>
</body></html>`;
}

const PLANILHA = '<script src="/public/planilha.js"></script>';
const PAGER = `<div class="acoes"><button class="botao secundario pequeno" type="button" id="pAnt">Anterior</button><span class="dica" id="pInfo"></span><button class="botao secundario pequeno" type="button" id="pProx">Próxima</button></div>`;

// ───────────── Login ─────────────
export function paginaLogin(): string {
  return `<!doctype html>
<html lang="pt-BR" data-theme="claro">
<head>
${cabecaHtml('Entrar')}
</head>
<body>
<main class="login">
  <form class="card login-card" id="form" novalidate>
    <div class="marca" style="padding:0"><span class="ante">Recall Precatórios</span><b>Serviço de SMS</b></div>
    <h1 style="font-size:24px">Entrar</h1>
    <div class="campo"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required></div>
    <div class="campo"><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="current-password" required></div>
    <div id="erro" hidden></div>
    <div class="acoes"><button class="botao primario" id="btn" type="submit">Entrar</button><button class="pilula" type="button" id="btnTema" aria-label="Trocar tema"></button></div>
  </form>
</main>
<script>${SCRIPT_COMUM}
$('form').addEventListener('submit', async (e) => {
  e.preventDefault(); $('erro').hidden = true; $('btn').disabled = true;
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('email').value.trim(), senha: $('senha').value }) });
    if (r.ok) { location.href = '/'; return; }
    const c = await lerJson(r);
    caixa('erro', 'erro', esc(c.mensagem || 'Não foi possível entrar.'));
  } catch { caixa('erro', 'erro', 'Não foi possível falar com o serviço.'); }
  $('btn').disabled = false;
});
$('email').focus();
</script>
</body></html>`;
}

// ───────────── Visão geral ─────────────
export function visaoGeral(ctx: Ctx): string {
  const corpo = `
  <div class="grade" style="gap:var(--space-3)"><div id="avisoWorker" hidden></div><div id="avisoJanela" hidden></div><div id="avisoRevisao" hidden></div></div>
  <div class="grade g5">
    <div class="card kpi"><span class="rot">Enviadas hoje</span><span class="valor" id="kTotal">—</span><span class="det" id="kFila"></span></div>
    <div class="card kpi"><span class="rot">Entregues</span><span class="valor" id="kEntregues">—</span><span class="det">confirmadas pela operadora</span></div>
    <div class="card kpi"><span class="rot">Falhas</span><span class="valor" id="kFalhas">—</span><span class="det">recusadas pelo celular ou pela operadora</span></div>
    <div class="card kpi"><span class="rot">Taxa de entrega</span><span class="valor" id="kTaxa">—</span><span class="det" id="kIncertas">entregues ÷ concluídas</span></div>
    <div class="card kpi"><span class="rot">Responderam</span><span class="valor" id="kResp">—</span><span class="det" id="kRespDet">das enviadas hoje</span></div>
  </div>
  <section class="grade" style="gap:var(--space-4)">
    <div class="card-cab"><h2 style="margin:0;font-size:15px;font-weight:600">Chips</h2><span class="dica" id="atualizadoEm"></span></div>
    <div id="avisoAparelhos" hidden></div>
    <div class="grade g3" id="chips"><div class="card vazio">Lendo os chips dos celulares…</div></div>
  </section>
  <div class="grade g21">
    <section class="card neutro">
      <div class="card-cab"><h2>Últimos disparos</h2><a class="botao secundario pequeno" href="/disparos/novo">${icone('mais', 16)}Novo disparo</a></div>
      <div id="dVazio" class="vazio">Nenhum disparo ainda.</div>
      <div class="tabela"><table id="dTabela" hidden><thead><tr><th>Disparo</th><th>Contatos</th><th>Entregues</th><th>Falhas</th><th>Responderam</th><th>Status</th></tr></thead><tbody></tbody></table></div>
    </section>
    <section class="card">
      <div class="card-cab"><h2>Últimos eventos</h2><a class="dica" href="/logs">Ver todos os logs</a></div>
      <ul class="eventos" id="eventos"><li class="vazio" style="display:block">Carregando…</li></ul>
    </section>
  </div>
  <section class="card neutro">
    <div class="card-cab"><h2>Últimas respostas</h2><span class="dica">O que os contatos mandaram de volta para os chips</span></div>
    <div id="rVazio" class="vazio">Nenhuma resposta ainda. O sistema lê o celular a cada minuto.</div>
    <div class="tabela"><table id="rTabela" hidden><thead><tr><th>Recebida</th><th>Contato</th><th>Resposta</th><th>Disparo</th></tr></thead><tbody></tbody></table></div>
  </section>`;
  const script = `
function estadoChip(c){
  if (!c.ativo) return ['neutro', 'Desativado'];
  if (!c.presente) return ['alerta', 'Chip não encontrado'];
  if (c.online === false) return ['erro', 'Fora da roleta'];
  return ['sucesso', 'Na roleta'];
}
async function carregar(){
  const p = await (await api('/api/painel')).json();
  $('kTotal').textContent = p.hoje.total; $('kEntregues').textContent = p.hoje.entregues; $('kFalhas').textContent = p.hoje.falhas;
  $('kTaxa').textContent = p.hoje.taxaEntrega === null ? '—' : p.hoje.taxaEntrega + '%';
  const rh = p.hoje.respostas; $('kResp').textContent = rh ? rh.respondidas : '—'; $('kRespDet').textContent = detalheResposta(rh);
  $('kFila').textContent = p.fila.pendentes ? p.fila.pendentes + ' na fila' + (p.hoje.aguardando ? ' · ' + p.hoje.aguardando + ' aguardando confirmação' : '') : (p.hoje.aguardando ? p.hoje.aguardando + ' aguardando confirmação' : 'nenhuma na fila');
  $('kIncertas').textContent = p.hoje.incertas ? p.hoje.incertas + ' incerta(s): confira no celular' : 'entregues ÷ concluídas';
  const aw = $('avisoWorker'); const aj = $('avisoJanela'); const ar = $('avisoRevisao');
  if (p.worker && !p.worker.vivo) { aw.hidden = false; aw.className = 'alerta-caixa erro'; aw.innerHTML = ${JSON.stringify(icone('alerta'))} + '<span>O envio está parado: o worker não dá sinal desde ' + (p.worker.ultimaBatidaEm ? hora(p.worker.ultimaBatidaEm) : 'o início') + '. Veja <code>docker compose ps</code>.</span>'; }
  else aw.hidden = true;
  if (p.janela && !p.janela.aberta) { aj.hidden = false; aj.className = 'alerta-caixa info'; aj.innerHTML = ${JSON.stringify(icone('alerta'))} + '<span>Fora da janela de envio ('+esc(p.janela.inicio)+'–'+esc(p.janela.fim)+'). As mensagens ficam na fila e saem quando a janela abrir.</span>'; }
  else aj.hidden = true;
  const rv = p.revisao || { falhas: 0, incertas: 0 };
  if (rv.falhas > 0 || rv.incertas > 0) { ar.hidden = false; ar.className = 'alerta-caixa alerta'; ar.innerHTML = ${JSON.stringify(icone('alerta'))} + '<span>Há mensagens para revisar: <b>'+rv.falhas+'</b> falha(s) e <b>'+rv.incertas+'</b> incerta(s). <a href="/revisao">Abrir a revisão</a></span>'; }
  else ar.hidden = true;
  const fora = [...new Set(p.chips.filter(c => c.ativo && c.online === false).map(c => c.aparelho))];
  const aa = $('avisoAparelhos');
  if (fora.length) { aa.hidden = false; aa.className = 'alerta-caixa alerta'; aa.innerHTML = ${JSON.stringify(icone('alerta'))} + '<span>Sem resposta de: '+fora.map(esc).join(', ')+'. Os chips desse celular saíram da roleta. <a href="/aparelhos">Ver aparelhos</a></span>'; }
  else aa.hidden = true;
  $('chips').innerHTML = p.chips.length ? p.chips.map(c => {
    const k = c.hoje; const est = estadoChip(c);
    return '<article class="card chip-card"><div class="chip-topo"><div><b>'+esc(c.rotulo)+'</b><div class="chip-num">'+esc(c.telefone||'Número não informado')+'</div></div><div style="display:grid;gap:var(--space-1);justify-items:end">'+sinalHtml(c.sinal)+'<span class="badge '+est[0]+'">'+est[1]+'</span></div></div>'
      + (c.sinal && c.sinal.nivel !== 'ONLINE' ? '<div class="sinal-explica">'+esc(c.sinal.explicacao)+'</div>' : '')
      + '<div class="linha-info"><span class="badge triagem">'+esc(c.operadora||'Operadora ?')+'</span><span>'+esc(c.aparelho)+' · Chip '+esc(c.simNumero)+'</span>'
      + (c.bateria!=null ? '<span>'+${JSON.stringify(icone('bateria', 16))}+c.bateria+'%</span>' : '')
      + '<span>Hoje '+k.total+' de '+c.cota+'</span>' + (c.cotaAtingida ? '<span class="badge alerta">Cota do dia atingida</span>' : '') + '</div>'
      + '<div class="mini"><div><span>Hoje</span><b>'+k.total+'</b></div><div><span>Entregues</span><b>'+k.entregues+'</b></div><div><span>Falhas</span><b>'+k.falhas+'</b></div><div><span>Taxa</span><b>'+taxa(k.entregues, k.falhas)+'</b></div></div></article>';
  }).join('') : '<div class="card vazio">Nenhum chip encontrado. Confira os celulares em <a href="/aparelhos">Aparelhos e chips</a>.</div>';
  $('dVazio').hidden = p.disparos.length > 0; $('dTabela').hidden = !p.disparos.length;
  $('dTabela').querySelector('tbody').innerHTML = p.disparos.map(d => '<tr class="clicavel" data-href="/disparos/'+d.id+'"><td><b>'+esc(d.nome)+'</b><div class="dica">'+dataHora(d.criadoEm)+'</div></td><td>'+d.contagem.total+'</td><td>'+d.contagem.entregues+'</td><td>'+d.contagem.falhas+'</td><td>'+(d.respondidas||0)+'</td><td>'+badgeDisparo(d.status)+'</td></tr>').join('');
  const rs = p.respostas || []; $('rVazio').hidden = rs.length > 0; $('rTabela').hidden = !rs.length;
  $('rTabela').querySelector('tbody').innerHTML = rs.map(x => '<tr'+(x.disparoId ? ' class="clicavel" data-href="/disparos/'+x.disparoId+'"' : '')+'><td>'+dataHora(x.recebidaEm)+'</td><td>'+esc(x.nome||'—')+'<div class="dica">'+esc(x.telefone)+'</div></td><td>'+esc(x.texto)+'</td><td>'+(x.disparo ? esc(x.disparo) : '<span class="dica">Mensagem avulsa (API)</span>')+'</td></tr>').join('');
  $('eventos').innerHTML = p.eventos.length ? p.eventos.map(x => '<li><time>'+hora(x.criadoEm)+'</time><span>'+badgeNivel(x.nivel)+'</span><span>'+esc(x.texto)+'</span></li>').join('') : '<li class="vazio" style="display:block">Nenhum evento ainda.</li>';
  $('atualizadoEm').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR') + ' · a cada 5 s';
}
document.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) location.href = tr.dataset.href; });
carregar().catch(() => {}); setInterval(() => carregar().catch(() => {}), 5000);
`;
  return shell({ ...ctx, ativo: 'geral', antetitulo: 'Serviço de SMS', titulo: 'Visão geral', sub: 'Os números de hoje, cada chip dos celulares e o que aconteceu por último.', corpo, script });
}

// ───────────── Disparos: lista ─────────────
export function listaDisparos(ctx: Ctx): string {
  const corpo = `
  <section class="card neutro">
    <div id="vazio" class="vazio">Nenhum disparo ainda. Comece pelo botão "Novo disparo".</div>
    <div class="tabela"><table id="tabela" hidden><thead><tr><th>Disparo</th><th>Criado por</th><th>Início</th><th>Contatos</th><th>Entregues</th><th>Falhas</th><th>Canceladas</th><th>Responderam</th><th>Status</th></tr></thead><tbody></tbody></table></div>
    ${PAGER}
  </section>`;
  const script = `
let pagina = 1; const TAM = 20;
async function carregar(){
  const r = await (await api('/api/disparos?page='+pagina+'&size='+TAM)).json();
  $('vazio').hidden = r.data.length > 0; $('tabela').hidden = !r.data.length;
  $('tabela').querySelector('tbody').innerHTML = r.data.map(d => '<tr class="clicavel" data-href="/disparos/'+d.id+'"><td><b>'+esc(d.nome)+'</b></td><td>'+esc(criador(d))+'</td><td>'+dataHora(d.criadoEm)+'</td><td>'+d.contagem.total+(d.bloqueados > 0 ? '<div class="dica">Bloqueados '+d.bloqueados+'</div>' : '')+'</td><td>'+d.contagem.entregues+'</td><td>'+d.contagem.falhas+'</td><td>'+d.contagem.canceladas+'</td><td>'+(d.respondidas||0)+'</td><td>'+badgeDisparo(d.status)+'</td></tr>').join('');
  pintarPager(r.page, r.size, r.total, (p) => { pagina = p; carregar().catch(() => {}); });
}
document.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) location.href = tr.dataset.href; });
carregar().catch(() => {}); setInterval(() => carregar().catch(() => {}), 5000);
`;
  return shell({ ...ctx, ativo: 'disparos', antetitulo: 'Disparos', titulo: 'Disparos', sub: 'Cada disparo envia uma planilha de contatos, alternando os chips e as mensagens.', acoes: `<a class="botao primario pequeno" href="/disparos/novo">${icone('mais', 16)}Novo disparo</a>`, corpo, script });
}

// ───────────── Disparos: novo (planilha → mensagens → envio) ─────────────
export function novoDisparo(ctx: Ctx): string {
  const L = { ...LIMITES_PADRAO, ...(ctx.limites || {}) };
  const corpo = `
  <div class="passos">
    <section class="card">
      <div class="passo-cab"><span class="passo-n" id="n1">1</span><h2>Planilha de contatos</h2></div>
      <p class="apoio">Envie um arquivo <b>.xlsx</b> ou <b>.csv</b> com uma coluna <b>telefone</b>. As colunas <b>nome</b> e <b>mensagem</b> são opcionais. Depois de carregar, você confere e escolhe qual coluna é qual. Até ${L.contatos} contatos por disparo. O arquivo é lido aqui no navegador.</p>
      <label class="soltar" id="soltar" for="arquivo">
        ${icone('upload', 24)}
        <span><b>Arraste a planilha aqui</b> ou clique para escolher</span>
        <span class="dica">.xlsx ou .csv, até 5 MB</span>
        <input type="file" id="arquivo" accept=".xlsx,.csv,.txt">
      </label>
      <div class="acoes"><button class="botao secundario pequeno" type="button" id="btnModelo">${icone('baixar', 16)}Baixar planilha modelo</button><span class="dica" id="nomeArquivo"></span></div>
      <div id="pErro" hidden></div>
      <div id="pColunas" hidden style="display:grid;gap:var(--space-3)">
        <div><b>Qual coluna é qual?</b> <span class="dica">O sistema adivinhou pelo cabeçalho. Se estiver errado, troque aqui.</span></div>
        <div class="grade g3">
          <div class="campo"><label for="colTel">Telefone</label><select id="colTel"></select></div>
          <div class="campo"><label for="colNome">Nome</label><select id="colNome"></select></div>
          <div class="campo"><label for="colMsg">Mensagem própria da linha</label><select id="colMsg"></select></div>
        </div>
        <label class="check"><input type="checkbox" id="colCab"> A primeira linha é o cabeçalho (nomes das colunas), não um contato</label>
      </div>
      <div id="pResumo" hidden style="display:grid;gap:var(--space-4)">
        <div class="seg" id="pNumeros"></div>
        <div class="tabela"><table id="pTabela"><thead><tr><th>Linha</th><th>Nome</th><th>Telefone</th><th>Mensagem própria</th></tr></thead><tbody></tbody></table></div>
        <details id="pInvalidosBox" hidden><summary id="pInvalidosTit"></summary><div class="tabela"><table><thead><tr><th>Linha</th><th>Valor na planilha</th></tr></thead><tbody id="pInvalidos"></tbody></table></div></details>
      </div>
    </section>

    <section class="card">
      <div class="passo-cab"><span class="passo-n" id="n2">2</span><h2>Mensagens</h2></div>
      <div class="campo"><label for="nomeDisparo">Nome do disparo</label><input id="nomeDisparo" maxlength="80" placeholder="Ex.: Retorno de contato · novembro"></div>
      <p class="apoio">Roleta de mensagens: cada contato recebe o próximo texto da lista (até ${L.modelos}). Use <code>{nome}</code> para colocar o nome do contato. Linhas com mensagem própria na planilha de contatos usam a própria.</p>
      <div class="acoes">
        <label class="botao secundario pequeno" for="arqAbordagens">${icone('upload', 16)}Importar abordagens (.xlsx ou .csv)<input type="file" id="arqAbordagens" accept=".xlsx,.csv,.txt" hidden></label>
        <button class="botao secundario pequeno" type="button" id="btnModeloAbordagens">${icone('baixar', 16)}Baixar modelo de abordagens</button>
      </div>
      <span class="dica">Planilha de abordagens: uma mensagem por linha, na coluna <b>abordagem</b> (ou <b>mensagem</b>/<b>texto</b>; sem cabeçalho, coluna A). Importar substitui a lista abaixo.</span>
      <div id="aAviso" hidden></div>
      <div id="listaMensagens" style="display:grid;gap:var(--space-4)"></div>
      <div class="acoes"><button class="botao secundario pequeno" type="button" id="btnAddMsg">${icone('mais', 16)}Adicionar mensagem</button><span class="dica" id="contMsgs"></span></div>
      <div class="resultado" id="previa"><b>Prévia</b><span id="previaTxt">Envie a planilha para ver a prévia com o primeiro contato.</span></div>
    </section>

    <section class="card">
      <div class="passo-cab"><span class="passo-n" id="n3">3</span><h2>Envio</h2></div>
      <div class="grade g2">
        <div class="campo"><span class="rotulo">Chips na roleta</span><div class="seg" id="chipsLista">Lendo os chips…</div><span class="dica">Cada mensagem sai pelo próximo chip. Só entram os chips ativos, de celulares conectados.</span></div>
        <div class="campo"><span class="rotulo">Intervalo entre os envios de cada chip</span>
          <div class="grade g2">
            <div class="campo"><label for="intMin">Mínimo (segundos)</label><input id="intMin" type="number" min="${L.intervaloMin}" max="${L.intervaloMax}" value="45"></div>
            <div class="campo"><label for="intMax">Máximo (segundos)</label><input id="intMax" type="number" min="${L.intervaloMin}" max="${L.intervaloMax}" value="80"></div>
          </div>
          <span class="dica" id="intervaloAviso">Cada chip espera um tempo sorteado entre o mínimo e o máximo entre os próprios envios.</span></div>
      </div>
      <div class="seg" id="resumoEnvio"></div>
      <div id="eErro" hidden></div>
      <div class="acoes"><button class="botao primario" type="button" id="btnIniciar" disabled>${icone('disparo')}Iniciar disparo</button><a class="botao secundario" href="/disparos">Voltar</a></div>
    </section>
  </div>`;
  const script = `
let planilha = null; let chips = []; let linhasAtuais = null;
const MAX_MSGS = ${L.modelos};
// Sem acento de propósito: acento troca a codificação (GSM-7 → UCS-2) e o SMS passa a ser cobrado como 2.
let textos = ['Ola {nome}, aqui e da Recall. Este e um teste do nosso servico de SMS.'];
function modelos(){ return textos.map(t => t.trim()).filter(Boolean); }
function desenharMensagens(){
  $('listaMensagens').innerHTML = textos.map((t, i) => '<div class="campo"><div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-2)"><label for="m'+i+'">Mensagem '+(i+1)+'</label>'
    + (textos.length > 1 ? '<button class="botao secundario pequeno" type="button" data-remover="'+i+'" aria-label="Remover a mensagem '+(i+1)+'">Remover</button>' : '')
    + '</div><textarea id="m'+i+'" data-i="'+i+'" maxlength="${L.caracteres}" rows="2"></textarea><div class="seg" id="s'+i+'"></div></div>').join('');
  textos.forEach((t, i) => { $('m'+i).value = t; });
  $('btnAddMsg').disabled = textos.length >= MAX_MSGS;
  $('contMsgs').textContent = textos.length+' de '+MAX_MSGS+' mensagens na roleta';
  atualizar();
}
$('listaMensagens').addEventListener('input', e => { const i = e.target.dataset && e.target.dataset.i; if (i !== undefined) { textos[Number(i)] = e.target.value; atualizar(); } });
$('listaMensagens').addEventListener('click', e => { const b = e.target.closest('[data-remover]'); if (!b) return; textos.splice(Number(b.dataset.remover), 1); desenharMensagens(); });
$('btnAddMsg').addEventListener('click', () => { if (textos.length < MAX_MSGS) { textos.push(''); desenharMensagens(); $('m'+(textos.length-1)).focus(); } });
$('btnModeloAbordagens').addEventListener('click', () => Planilha.modeloAbordagensCsv());
$('arqAbordagens').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  $('aAviso').hidden = true;
  try {
    const r = Planilha.montarAbordagens(await Planilha.ler(f), { maxCaracteres: ${L.caracteres} });
    if (!r.abordagens.length) { caixa('aAviso','erro','Não encontrei nenhuma abordagem em '+esc(f.name)+'. Use uma coluna "abordagem" com um texto por linha.'); return; }
    const sobra = r.abordagens.length - MAX_MSGS;
    textos = r.abordagens.slice(0, MAX_MSGS).map(a => a.texto);
    const extras = [];
    if (sobra > 0) extras.push(sobra+' ficaram de fora (limite de '+MAX_MSGS+')');
    if (r.repetidas) extras.push(r.repetidas+' repetida(s) ignorada(s)');
    if (r.longas.length) extras.push(r.longas.length+' com mais de ${L.caracteres} caracteres ignorada(s) (linha '+r.longas.map(x => x.linha).join(', ')+')');
    caixa('aAviso', sobra > 0 || r.longas.length ? 'alerta' : 'sucesso', textos.length+' abordagem(ns) importada(s) de '+esc(f.name)+' (coluna <b>'+esc(r.coluna)+'</b>).'+(extras.length ? ' '+extras.join(' · ')+'.' : ''));
    desenharMensagens();
  } catch (err) { caixa('aAviso','erro', esc(err.message || 'Não consegui ler a planilha de abordagens.')); }
});
function aplicar(m, nome){ return m.replace(/\\{\\s*nome\\s*\\}/gi, (nome||'').trim()).replace(/[ \\t]{2,}/g,' ').replace(/\\s+([,.!?;:])/g,'$1').trim(); }

function opcoesSelect(sel, opcoes, valor, permiteNenhuma){
  sel.innerHTML = (permiteNenhuma ? '<option value="-1">Não usar</option>' : '') + opcoes.map(o => '<option value="'+o.indice+'">'+esc(o.rotulo)+'</option>').join('');
  sel.value = String(valor);
}
function mostrarPlanilha(r){
  $('pColunas').hidden = false;
  opcoesSelect($('colTel'), r.opcoes, r.mapa.telefone, false);
  opcoesSelect($('colNome'), r.opcoes, r.mapa.nome, true);
  opcoesSelect($('colMsg'), r.opcoes, r.mapa.mensagem, true);
  $('colCab').checked = r.mapa.cabecalho;
  if (!r.contatos.length) { planilha = null; $('pResumo').hidden = true; caixa('pErro','erro','Nenhum telefone válido na coluna escolhida. Confira em <b>Qual coluna é qual?</b> qual coluna tem o telefone com DDD.'); return; }
  if (r.contatos.length > ${L.contatos}) { planilha = null; $('pResumo').hidden = true; caixa('pErro','erro','A planilha tem '+r.contatos.length+' contatos válidos. Cada disparo vai até ${L.contatos}.'); return; }
  $('pErro').hidden = true;
  planilha = r;
  $('pResumo').hidden = false;
  $('pNumeros').innerHTML = '<span>Linhas <b>'+r.total+'</b></span><span>Contatos válidos <b>'+r.contatos.length+'</b></span><span>Telefone inválido <b>'+r.invalidos.length+'</b></span><span>Repetidos (entram uma vez) <b>'+r.duplicados+'</b></span>';
  $('pTabela').querySelector('tbody').innerHTML = r.contatos.slice(0,8).map(c => '<tr><td>'+c.linha+'</td><td>'+esc(c.nome||'—')+'</td><td>'+esc(c.mascarado)+'</td><td>'+(c.mensagem?'sim':'—')+'</td></tr>').join('')
    + (r.contatos.length > 8 ? '<tr><td colspan="4" class="dica">e mais '+(r.contatos.length-8)+' contato(s)</td></tr>' : '');
  $('pInvalidosBox').hidden = !r.invalidos.length;
  $('pInvalidosTit').textContent = r.invalidos.length+' linha(s) com telefone inválido ficam de fora (ver)';
  $('pInvalidos').innerHTML = r.invalidos.slice(0,50).map(x => '<tr><td>'+x.linha+'</td><td>'+esc(x.valor||'(vazio)')+'</td></tr>').join('');
}
function remapear(){
  if (!linhasAtuais) return;
  const mapa = { telefone: Number($('colTel').value), nome: Number($('colNome').value), mensagem: Number($('colMsg').value), cabecalho: $('colCab').checked };
  mostrarPlanilha(Planilha.montarContatos(linhasAtuais, mapa));
  atualizar();
}
['colTel','colNome','colMsg','colCab'].forEach(id => $(id).addEventListener('change', remapear));

async function abrir(arquivo){
  $('pErro').hidden = true; $('pResumo').hidden = true; $('pColunas').hidden = true; planilha = null; linhasAtuais = null; atualizar();
  $('nomeArquivo').textContent = arquivo.name;
  try {
    linhasAtuais = await Planilha.ler(arquivo);
    if (!linhasAtuais.length) { caixa('pErro','erro','A planilha está vazia.'); return; }
    if (!$('nomeDisparo').value) $('nomeDisparo').value = arquivo.name.replace(/\\.[^.]+$/, '');
    mostrarPlanilha(Planilha.montarContatos(linhasAtuais));
  } catch (e) { caixa('pErro','erro', esc(e.message || 'Não consegui ler a planilha.')); }
  atualizar();
}

function atualizar(){
  textos.forEach((v, i) => { const s = $('s'+i); if (s) s.innerHTML = v.trim() ? textoSegmentos(aplicar(v, 'Maria Aparecida')) : ''; });
  const ms = modelos();
  const primeiro = planilha && planilha.contatos[0];
  if (primeiro) {
    const txt = primeiro.mensagem ? aplicar(primeiro.mensagem, primeiro.nome) : (ms[0] ? aplicar(ms[0], primeiro.nome) : '');
    $('previaTxt').textContent = txt ? 'Para '+primeiro.mascarado+(primeiro.nome?' ('+primeiro.nome+')':'')+': "'+txt+'"' : 'Escreva pelo menos uma mensagem.';
  }
  const semMsg = planilha ? planilha.contatos.filter(c => !c.mensagem).length : 0;
  const iMin = Number($('intMin').value); const iMax = Number($('intMax').value);
  const dentro = v => Number.isFinite(v) && v >= ${L.intervaloMin} && v <= ${L.intervaloMax};
  const okInt = dentro(iMin) && dentro(iMax) && iMin <= iMax;
  $('intervaloAviso').textContent = !okInt ? (iMin > iMax ? 'O mínimo não pode ser maior que o máximo.' : 'O intervalo vai de ${L.intervaloMin} a ${L.intervaloMax} segundos.')
    : iMin < 3 ? 'Intervalo curto: chip que dispara rápido demais tem mais chance de ser bloqueado.'
    : 'Cada chip espera um tempo sorteado entre '+iMin+' e '+iMax+' s entre os próprios envios, para não disparar num ritmo fixo.';
  $('intervaloAviso').style.color = !okInt ? 'var(--erro)' : iMin < 3 ? 'var(--alerta-texto)' : '';
  let pronto = Boolean(planilha) && okInt && chips.length > 0 && (semMsg === 0 || ms.length > 0);
  if (planilha) {
    const n = planilha.contatos.length;
    const fmt = d => d >= 3600 ? Math.floor(d/3600)+' h '+Math.round((d%3600)/60)+' min' : d >= 60 ? Math.floor(d/60)+' min '+Math.round(d%60)+' s' : Math.round(d)+' s';
    const k = Math.max(chips.length, 1);
    const durTxt = iMin === iMax ? fmt(n / k * iMin) : '~'+fmt(n / k * (iMin + iMax) / 2)+' (entre '+fmt(n / k * iMin)+' e '+fmt(n / k * iMax)+')';
    const sms = planilha.contatos.reduce((t, c, i) => t + segmentos(c.mensagem ? aplicar(c.mensagem, c.nome) : aplicar(ms.length ? ms[i % ms.length] : '', c.nome)).seg, 0);
    $('resumoEnvio').innerHTML = '<span>Contatos <b>'+n+'</b></span><span>Chips <b>'+chips.length+'</b></span><span>SMS cobrados (estimativa) <b>'+sms+'</b></span><span>Duração estimada <b>'+(okInt && chips.length ? durTxt : '—')+'</b></span>'
      + (chips.length ? '<span>Por chip <b>~'+Math.ceil(n / chips.length)+'</b></span>' : '');
  } else $('resumoEnvio').innerHTML = '<span>Envie a planilha para ver o resumo.</span>';
  if (semMsg > 0 && !ms.length) pronto = false;
  $('btnIniciar').disabled = !pronto;
  $('n1').className = 'passo-n'+(planilha?' feito':''); $('n2').className = 'passo-n'+(planilha && (semMsg===0 || ms.length)?' feito':''); $('n3').className = 'passo-n'+(pronto?' feito':'');
}

async function carregarChips(){
  try { const c = await (await api('/api/chips')).json(); chips = c.data || [];
    $('chipsLista').innerHTML = chips.length ? chips.map(k => '<span class="badge triagem">'+esc(k.rotulo)+'</span>').join('') : '<span class="msg-erro">Nenhum chip disponível. Veja Aparelhos e chips.</span>'; }
  catch { $('chipsLista').innerHTML = '<span class="msg-erro">Não consegui ler os chips.</span>'; }
  atualizar();
}

const sol = $('soltar');
['dragenter','dragover'].forEach(ev => sol.addEventListener(ev, e => { e.preventDefault(); sol.classList.add('sobre'); }));
['dragleave','drop'].forEach(ev => sol.addEventListener(ev, e => { e.preventDefault(); sol.classList.remove('sobre'); }));
sol.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) abrir(f); });
$('arquivo').addEventListener('change', e => { const f = e.target.files[0]; if (f) abrir(f); });
$('btnModelo').addEventListener('click', () => Planilha.modeloCsv());
['intMin','intMax'].forEach(id => $(id).addEventListener('input', atualizar));
$('btnIniciar').addEventListener('click', async () => {
  $('eErro').hidden = true; $('btnIniciar').disabled = true;
  const corpo = { nome: $('nomeDisparo').value.trim() || undefined, mensagens: modelos(), intervaloMinSegundos: Number($('intMin').value), intervaloMaxSegundos: Number($('intMax').value),
    contatos: planilha.contatos.map(c => ({ linha: c.linha, telefone: c.telefone, nome: c.nome, mensagem: c.mensagem })) };
  try {
    const r = await postJson('/api/disparos', corpo); const c = await lerJson(r);
    if (r.ok) { location.href = '/disparos/' + c.id; return; }
    const det = (c.detalhes && c.detalhes.problemas) ? '<br>'+c.detalhes.problemas.slice(0,5).map(p => 'Linha '+p.linha+': '+esc(p.motivo)).join('<br>') : '';
    caixa('eErro','erro', esc(c.mensagem || 'Não foi possível criar o disparo.')+det);
  } catch (e) { if (e.message !== 'Sessão expirada') caixa('eErro','erro','Não foi possível falar com o serviço.'); }
  atualizar();
});
carregarChips(); desenharMensagens();
`;
  return shell({
    ...ctx,
    ativo: 'disparos',
    antetitulo: 'Disparos',
    titulo: 'Novo disparo',
    sub: 'Três passos: a planilha de contatos, as mensagens da roleta e o ritmo de envio.',
    corpo,
    script,
    extraHead: PLANILHA,
  });
}

// ───────────── Disparos: acompanhamento ─────────────
export function detalheDisparo(ctx: Ctx): string {
  const corpo = `
  <section class="card">
    <div class="card-cab"><div style="display:grid;gap:var(--space-1)"><h2 id="dNome">Carregando…</h2><span class="dica" id="dInfo"></span></div><div class="acoes"><span id="dStatus"></span><button class="botao perigo pequeno" type="button" id="btnCancelar" hidden>${icone('parar', 16)}Cancelar disparo</button><button class="botao secundario pequeno" type="button" id="btnExportar">${icone('baixar', 16)}Exportar resultado</button></div></div>
    <div class="progresso" aria-hidden="true"><i id="barra"></i></div>
    <div class="seg" id="dProgresso"></div>
    <div id="dAviso" hidden></div>
  </section>
  <div class="grade g5">
    <div class="card kpi"><span class="rot">Na fila</span><span class="valor" id="kFila">—</span><span class="det">ainda não saíram</span></div>
    <div class="card kpi"><span class="rot">Aguardando</span><span class="valor" id="kEnviadas">—</span><span class="det">saíram, esperando a operadora</span></div>
    <div class="card kpi"><span class="rot">Entregues</span><span class="valor" id="kEntregues">—</span><span class="det">confirmadas pela operadora</span></div>
    <div class="card kpi"><span class="rot">Falhas</span><span class="valor" id="kFalhas">—</span><span class="det" id="kCanc"></span></div>
    <div class="card kpi"><span class="rot">Responderam</span><span class="valor" id="kResp">—</span><span class="det" id="kRespDet"></span></div>
  </div>
  <section class="card neutro">
    <div class="card-cab"><h2>Contatos</h2><div class="segmentado" role="radiogroup" aria-label="Filtrar por status">
      <label><input type="radio" name="filtro" value="todos" checked><span>Todos</span></label>
      <label><input type="radio" name="filtro" value="entregue"><span>Entregues</span></label>
      <label><input type="radio" name="filtro" value="falha"><span>Falhas</span></label>
      <label><input type="radio" name="filtro" value="pendente"><span>Pendentes</span></label>
      <label><input type="radio" name="filtro" value="respondeu"><span>Responderam</span></label>
    </div></div>
    <div class="tabela"><table id="tabela"><thead><tr><th>Linha</th><th>Nome</th><th>Telefone</th><th>Texto</th><th>Chip</th><th>Status</th><th>Resposta</th><th>Atualizado</th></tr></thead><tbody></tbody></table></div>
  </section>`;
  const script = `
const ID = ${JSON.stringify(ctx.id)}; let ultimo = null; let timer = null;
function filtro(){ return (document.querySelector('input[name="filtro"]:checked')||{}).value || 'todos'; }
function seg(ms){ return ms % 1000 === 0 ? String(ms/1000) : String(ms/1000).replace('.', ','); }
function celulaResposta(m){
  if (!m.respostas.length) return '<span class="dica">—</span>';
  const u = m.respostas[m.respostas.length - 1];
  const depois = m.aceitaEm ? ' · ' + duracao(Math.round((new Date(m.respostas[0].recebidaEm) - new Date(m.aceitaEm)) / 1000)) + ' depois' : '';
  return esc(curto(u.texto)) + '<div class="dica">' + dataHora(u.recebidaEm) + depois + (m.respostas.length > 1 ? ' · ' + m.respostas.length + ' respostas' : '') + '</div>';
}
function curto(t){ t = String(t||''); return t.length > 70 ? t.slice(0, 70)+'…' : t; }
function pintar(){
  const d = ultimo; if (!d) return;
  const k = d.contagem;
  $('dNome').textContent = d.nome;
  $('dInfo').textContent = 'Criado por '+criador(d)+(d.bloqueados > 0 ? ' · Bloqueados '+d.bloqueados : '')+' · início '+dataHora(d.criadoEm)+(d.terminadoEm ? ' · fim '+dataHora(d.terminadoEm) : '')+(d.abordagens?' · '+d.abordagens+' texto(s) na roleta':'')+' · cada chip espera '+(d.intervaloMinMs===d.intervaloMaxMs ? seg(d.intervaloMinMs)+' s' : seg(d.intervaloMinMs)+' a '+seg(d.intervaloMaxMs)+' s (sorteado)')+(d.duplicados?' · '+d.duplicados+' repetido(s) ignorado(s)':'');
  $('dStatus').innerHTML = badgeDisparo(d.status);
  $('btnCancelar').hidden = d.status !== 'ENVIANDO';
  const parados = k.naFila + k.enviando;
  const saiu = k.total - parados - k.canceladas;
  $('barra').style.width = (k.total ? Math.round((k.total - parados) / k.total * 100) : 0) + '%';
  $('dProgresso').innerHTML = '<span>Saíram <b>'+saiu+' de '+k.total+'</b></span><span>Entregues <b>'+k.entregues+'</b></span>'+(k.canceladas?'<span>Canceladas <b>'+k.canceladas+'</b></span>':'')
    + (k.incertas?'<span style="color:var(--alerta-texto)">Incertas <b>'+k.incertas+'</b>: o serviço caiu enquanto enviava; confira no celular</span>':'');
  $('kFila').textContent = parados; $('kEnviadas').textContent = k.aguardando; $('kEntregues').textContent = k.entregues; $('kFalhas').textContent = k.falhas;
  $('kCanc').textContent = k.canceladas ? k.canceladas+' cancelada(s)' : 'recusadas pelo celular ou pela operadora';
  $('kResp').textContent = d.respostas ? d.respostas.respondidas : '—'; $('kRespDet').textContent = detalheResposta(d.respostas);
  const f = filtro();
  const lista = d.mensagens.filter(m => f === 'todos' || (f === 'entregue' && m.entregue) || (f === 'falha' && m.falhou) || (f === 'pendente' && !m.final) || (f === 'respondeu' && m.respostas.length));
  $('tabela').querySelector('tbody').innerHTML = lista.map(m => '<tr><td>'+(m.linha??'')+'</td><td>'+esc(m.nome||'—')+'</td><td>'+esc(m.telefone)+'</td><td>'+esc(curto(m.texto))+'</td><td>'+esc(m.chip||'')+'</td><td>'+badgeStatus(m)+(m.falhou && m.detalhe ? '<div class="dica">'+esc(m.detalhe)+'</div>' : '')+'</td><td>'+celulaResposta(m)+'</td><td>'+hora(m.atualizadoEm)+'</td></tr>').join('')
    || '<tr><td colspan="8" class="vazio">Nada neste filtro.</td></tr>';
}
async function carregar(){
  clearTimeout(timer);
  const r = await api('/api/disparos/'+ID);
  if (!r.ok) { $('dNome').textContent = 'Disparo não encontrado'; $('dInfo').textContent = 'Confira o endereço ou volte para a lista de disparos.'; return; }
  ultimo = await r.json(); pintar();
  // Continua atualizando enquanto houver mensagem esperando: a entrega é confirmada depois que o disparo fecha.
  const k = ultimo.contagem || {};
  const esperando = ultimo.status === 'ENVIANDO' || (k.naFila || 0) + (k.enviando || 0) + (k.aguardando || 0) > 0;
  if (esperando) timer = setTimeout(() => carregar().catch(() => { timer = setTimeout(carregar, 3000); }), ultimo.status === 'ENVIANDO' ? 3000 : 10000);
}
document.querySelectorAll('input[name="filtro"]').forEach(x => x.addEventListener('change', pintar));
$('btnCancelar').addEventListener('click', async () => {
  if (!confirm('Cancelar este disparo? O que ainda está na fila não será enviado.')) return;
  const b = $('dAviso'); const r = await postJson('/api/disparos/'+ID+'/cancelar'); const c = await lerJson(r);
  b.hidden = false; b.className = 'alerta-caixa ' + (r.ok ? 'alerta' : 'erro'); b.innerHTML = '<span>'+esc(c.mensagem || '')+'</span>';
  carregar().catch(() => {});
});
$('btnExportar').addEventListener('click', () => {
  if (!ultimo) return;
  Planilha.baixarXlsx('resultado-'+ultimo.nome.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.xlsx',
    [['linha','nome','telefone','texto','chip','status','detalhe','atualizado','resposta','respondida em']].concat(ultimo.mensagens.map(m => [m.linha??'', m.nome||'', m.telefone, m.texto||'', m.chip||'', m.rotulo, m.detalhe||'', m.atualizadoEm||'', m.respostas.map(r => r.texto).join(' | '), m.respostas.length ? m.respostas[0].recebidaEm : ''])));
});
carregar().catch(() => {});
`;
  return shell({ ...ctx, ativo: 'disparos', antetitulo: 'Disparos', titulo: 'Acompanhamento do disparo', sub: 'Atualiza sozinho a cada 3 s enquanto o disparo estiver enviando.', corpo, script, extraHead: PLANILHA });
}

// ───────────── Aparelhos e chips ─────────────
export function aparelhos(ctx: Ctx): string {
  const admin = ctx.usuario.papel === 'ADMIN';
  const form = admin ? `
  <form class="card" id="form" novalidate>
    <h2 id="formTitulo">Adicionar celular</h2>
    <div class="grade g2">
      <div class="campo"><label for="fNome">Nome</label><input id="fNome" maxlength="60" placeholder="Ex.: Celular 1" autocomplete="off" required></div>
      <div class="campo"><label for="fUrl">Endereço (URL)</label><input id="fUrl" placeholder="http://192.168.0.20:8080" value="${escHtml(ctx.celularUrlPadrao || '')}" autocomplete="off" required></div>
      <div class="campo"><label for="fUsuario">Usuário do app</label><input id="fUsuario" autocomplete="off" required></div>
      <div class="campo"><label for="fSenha">Senha do app</label><input id="fSenha" type="password" autocomplete="new-password"><span class="dica" id="fSenhaDica"></span></div>
    </div>
    <div id="fErro" hidden></div>
    <div class="acoes"><button class="botao primario" type="submit" id="fSalvar">${icone('mais', 16)}Adicionar celular</button><button class="botao secundario" type="button" id="fCancelar" hidden>Cancelar edição</button></div>
  </form>` : '';
  const corpo = `
  <div id="aviso" hidden></div>
  <div class="grade g2" id="lista"><div class="card vazio">Lendo os celulares…</div></div>
  ${form}
  <section class="card neutro">
    <h2>Como ligar um celular</h2>
    <ol class="apoio" style="display:grid;gap:var(--space-2);padding-left:var(--space-5)">
      <li>Instale o app <b>SMS Gateway for Android</b> (<code>sms-gate.app</code>) e libere as permissões de SMS, telefone e notificações.</li>
      <li>No app, ligue o <b>Local Server</b> e anote o usuário e a senha.</li>
      <li>Descubra o IP do celular na Wi-Fi (ele aparece no app). O endereço fica assim: <code>http://192.168.x.x:8080</code>.</li>
      <li>O celular e este serviço precisam estar na mesma rede. Depois use <b>Testar conexão</b>.</li>
    </ol>
  </section>`;
  const script = `
const ADMIN = ${JSON.stringify(Boolean(admin))};
let lista = []; let editando = null;
function aviso(tipo, html){ caixa('aviso', tipo, html); }
function chipHtml(a, c){
  const bad = !c.ativo ? '<span class="badge neutro">Desativado</span>' : !c.presente ? '<span class="badge alerta">Chip não encontrado</span>' : '<span class="badge sucesso">Ativo</span>';
  return '<div class="chip-linha"><span><b style="color:var(--texto-primario)">Chip '+esc(c.simNumero)+'</b> · '+esc(c.telefone||'número não informado')+' <span class="badge triagem">'+esc(c.operadora||'Operadora ?')+'</span>'+(c.falhasSeguidas?' <span class="dica">'+c.falhasSeguidas+' falha(s) seguida(s)</span>':'')+'</span>'
    + '<span class="acoes">'+sinalHtml(c.sinal)+bad+(ADMIN ? '<button class="botao secundario pequeno" type="button" data-chip="'+c.id+'" data-ativo="'+(c.ativo?'0':'1')+'">'+(c.ativo?'Desativar chip':'Ativar chip')+'</button>' : '')+'</span>'
    + '<span class="dica" style="flex-basis:100%">Hoje '+c.enviadosHoje+' de '+c.cotaEfetiva+(c.cotaDiaria == null ? ' (cota padrão)' : '')+(c.enviadosHoje >= c.cotaEfetiva ? ' · <span class="badge alerta">Cota do dia atingida</span>' : '')+'</span>'
    + (c.sinal && c.sinal.nivel !== 'ONLINE' ? '<span class="sinal-explica" style="flex-basis:100%">'+esc(c.sinal.explicacao)+'</span>' : '')
    + (ADMIN ? '<span class="acoes" style="flex-basis:100%"><label class="dica" for="cota'+c.id+'">Cota diária</label><input id="cota'+c.id+'" type="number" min="0" step="1" inputmode="numeric" placeholder="Padrão" value="'+(c.cotaDiaria == null ? '' : c.cotaDiaria)+'" style="width:120px;height:40px"><button class="botao secundario pequeno" type="button" data-cota="'+c.id+'">Salvar cota</button></span>' : '')
    + '</div>';
}
function cartao(a){
  const estado = !a.ativo ? '<span class="badge neutro">Desativado</span>' : a.online ? '<span class="badge sucesso">Conectado</span>' : '<span class="badge erro">Fora do ar</span>';
  return '<article class="card"><div class="card-cab"><div style="display:grid;gap:var(--space-1)"><h2>'+esc(a.nome)+'</h2><span class="dica">'+esc(a.url)+' · usuário '+esc(a.usuario)+'</span></div>'+estado+'</div>'
    + (a.ativo && a.online ? '<div class="linha-info"><span>'+${JSON.stringify(icone('bateria', 16))}+(a.bateria!=null ? a.bateria+'%' : '—')+'</span><span>Último contato '+(a.ultimoContatoEm ? dataHora(a.ultimoContatoEm) : '—')+'</span></div>'
      : (a.ativo ? '<div class="alerta-caixa erro"><span>'+esc(a.detalhe||'Sem resposta')+'. Confira o Wi-Fi, o IP e se o Local Server está ligado.</span></div>' : '<span class="dica">Fora da roleta até ser reativado.</span>'))
    + '<div class="secao">Chips</div><div class="aparelho-chips">'+(a.chips.length ? a.chips.map(c => chipHtml(a, c)).join('') : '<span class="dica">Nenhum chip informado por este celular.</span>')+'</div>'
    + (ADMIN ? '<div class="acoes"><button class="botao secundario pequeno" type="button" data-editar="'+a.id+'">${icone('editar', 16)}Editar</button><button class="botao secundario pequeno" type="button" data-testar="'+a.id+'">${icone('atividade', 16)}Testar conexão</button><button class="botao secundario pequeno" type="button" data-alternar="'+a.id+'">'+(a.ativo?'Desativar':'Ativar')+'</button></div>'
      : '<div class="acoes"><button class="botao secundario pequeno" type="button" data-testar="'+a.id+'">${icone('atividade', 16)}Testar conexão</button></div>')
    + '</article>';
}
async function carregar(){
  const r = await (await api('/api/aparelhos')).json(); lista = r.data || [];
  $('lista').innerHTML = lista.length ? lista.map(cartao).join('') : '<div class="card vazio">Nenhum celular cadastrado.'+(ADMIN ? ' Use o formulário abaixo.' : ' Peça a um administrador para cadastrar.')+'</div>';
}
$('lista').addEventListener('click', async (e) => {
  const t = e.target.closest('button'); if (!t) return;
  try {
    if (t.dataset.testar) {
      aviso('info', 'Testando a conexão…');
      const c = await lerJson(await postJson('/api/aparelhos/'+t.dataset.testar+'/testar'));
      aviso(c.ok ? 'sucesso' : 'erro', esc(c.mensagem || '')); carregar();
    } else if (t.dataset.alternar) {
      const a = lista.find(x => String(x.id) === t.dataset.alternar); if (!a) return;
      const r = await putJson('/api/aparelhos/'+a.id, { ativo: !a.ativo });
      if (!r.ok) aviso('erro', esc((await lerJson(r)).mensagem || 'Não foi possível salvar.')); else aviso('sucesso', 'Celular '+esc(a.nome)+(a.ativo ? ' desativado.' : ' ativado.'));
      carregar();
    } else if (t.dataset.chip) {
      const r = await patchJson('/api/chips/'+t.dataset.chip, { ativo: t.dataset.ativo === '1' });
      if (!r.ok) aviso('erro', esc((await lerJson(r)).mensagem || 'Não foi possível salvar.')); else aviso('sucesso', t.dataset.ativo === '1' ? 'Chip ativado.' : 'Chip desativado.');
      carregar();
    } else if (t.dataset.cota && ADMIN) {
      const v = $('cota'+t.dataset.cota).value.trim();
      const n = v === '' ? null : Number(v);
      if (n !== null && (!Number.isInteger(n) || n < 0)) { aviso('erro', 'A cota precisa ser um número inteiro maior ou igual a zero.'); return; }
      const r = await patchJson('/api/chips/'+t.dataset.cota, { cotaDiaria: n });
      if (!r.ok) aviso('erro', esc((await lerJson(r)).mensagem || 'Não foi possível salvar.')); else aviso('sucesso', n === null ? 'Cota do chip voltou ao padrão.' : 'Cota do chip salva.');
      carregar();
    } else if (t.dataset.editar && ADMIN) {
      const a = lista.find(x => String(x.id) === t.dataset.editar); if (!a) return;
      editando = a.id; $('fNome').value = a.nome; $('fUrl').value = a.url; $('fUsuario').value = a.usuario; $('fSenha').value = '';
      $('formTitulo').textContent = 'Editar celular'; $('fSalvar').lastChild.textContent = 'Salvar'; $('fCancelar').hidden = false;
      $('fSenhaDica').textContent = 'Deixe em branco para manter a senha atual.'; $('fErro').hidden = true;
      $('form').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('fNome').focus();
    }
  } catch (err) { if (err.message !== 'Sessão expirada') aviso('erro', 'Não foi possível falar com o serviço.'); }
});
function limparForm(){ editando = null; $('form').reset(); $('formTitulo').textContent = 'Adicionar celular'; $('fSalvar').lastChild.textContent = 'Adicionar celular'; $('fCancelar').hidden = true; $('fSenhaDica').textContent = ''; }
if (ADMIN) {
  $('fCancelar').addEventListener('click', limparForm);
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault(); $('fErro').hidden = true; $('fSalvar').disabled = true;
    const corpo = { nome: $('fNome').value.trim(), url: $('fUrl').value.trim(), usuario: $('fUsuario').value.trim() };
    if ($('fSenha').value) corpo.senha = $('fSenha').value;
    try {
      const r = editando ? await putJson('/api/aparelhos/'+editando, corpo) : await postJson('/api/aparelhos', corpo);
      if (r.ok) { aviso('sucesso', editando ? 'Celular atualizado.' : 'Celular adicionado. Use Testar conexão para conferir.'); limparForm(); carregar(); }
      else { const c = await lerJson(r); caixa('fErro', 'erro', esc(c.mensagem || 'Não foi possível salvar.')); }
    } catch (err) { if (err.message !== 'Sessão expirada') caixa('fErro', 'erro', 'Não foi possível falar com o serviço.'); }
    $('fSalvar').disabled = false;
  });
}
carregar().catch(() => {}); setInterval(() => { const ativoEl = document.activeElement; if (editando === null && !(ativoEl && ativoEl.tagName === 'INPUT' && $('lista').contains(ativoEl))) carregar().catch(() => {}); }, 15000);
`;
  return shell({
    ...ctx,
    ativo: 'aparelhos',
    antetitulo: 'Aparelhos e chips',
    titulo: 'Aparelhos e chips',
    sub: 'Cada celular, a saúde dele e os chips que ele informa. O teste de conexão não envia SMS.',
    acoes: `<button class="botao secundario pequeno" type="button" id="btnAtualizar">${icone('atualizar', 16)}Atualizar</button>`,
    corpo,
    script: script + `\n$('btnAtualizar').addEventListener('click', () => carregar().catch(() => {}));`,
  });
}

// ───────────── Logs ─────────────
export function logs(ctx: Ctx): string {
  const corpo = `
  <section class="card">
    <div class="grade g3">
      <div class="campo"><label for="fNivel">Nível</label><select id="fNivel"><option value="">Todos</option><option value="INFO">Info</option><option value="AVISO">Aviso</option><option value="ERRO">Erro</option></select></div>
    </div>
    <div class="acoes"><label class="dica check" for="fAuto"><input type="checkbox" id="fAuto" checked> Atualizar sozinho (a cada 5 s)</label><button class="botao secundario pequeno" type="button" id="btnExportar">${icone('baixar', 16)}Exportar CSV (esta página)</button><span class="dica" id="contagem"></span></div>
  </section>
  <section class="card neutro">
    <ul class="eventos" id="eventos"><li class="vazio" style="display:block">Carregando…</li></ul>
    ${PAGER}
  </section>`;
  const script = `
let pagina = 1; const TAM = 50; let atuais = [];
function detalheEvento(e){ return [e.chip, e.usuario, e.disparoId ? 'Disparo '+e.disparoId : ''].filter(Boolean).map(esc).join(' · '); }
async function carregar(){
  const nivel = $('fNivel').value;
  const r = await (await api('/api/eventos?page='+pagina+'&size='+TAM+(nivel ? '&nivel='+nivel : ''))).json();
  atuais = r.data;
  $('contagem').textContent = r.total + ' evento(s)';
  $('eventos').innerHTML = r.data.length ? r.data.map(e => { const d = detalheEvento(e); return '<li><time>'+dataHora(e.criadoEm)+'</time><span>'+badgeNivel(e.nivel)+'</span><span>'+esc(e.texto)+(d?'<small>'+d+'</small>':'')+'</span></li>'; }).join('') : '<li class="vazio" style="display:block">Nenhum evento neste filtro.</li>';
  pintarPager(r.page, r.size, r.total, (p) => { pagina = p; carregar().catch(() => {}); });
}
$('fNivel').addEventListener('change', () => { pagina = 1; carregar().catch(() => {}); });
$('btnExportar').addEventListener('click', () => Planilha.baixarXlsx('logs-servico-sms.xlsx', [['hora','nivel','tipo','texto','chip','disparo','usuario']].concat(atuais.map(e => [e.criadoEm, e.nivel, e.tipo, e.texto, e.chip||'', e.disparoId||'', e.usuario||'']))));
setInterval(() => { if ($('fAuto').checked) carregar().catch(() => {}); }, 5000);
carregar().catch(() => {});
`;
  return shell({ ...ctx, ativo: 'logs', antetitulo: 'Logs', titulo: 'Logs', sub: 'Tudo o que aconteceu: envios, entregas, falhas, disparos, celulares e acessos. Telefones aparecem mascarados e o texto das mensagens nunca é registrado.', corpo, script, extraHead: PLANILHA });
}

// ───────────── Usuários (ADMIN) ─────────────
export function usuarios(ctx: Ctx): string {
  const corpo = `
  <div id="aviso" hidden></div>
  <section class="card neutro">
    <div id="vazio" class="vazio">Carregando…</div>
    <div class="tabela"><table id="tabela" hidden><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Situação</th><th>Criado em</th><th></th></tr></thead><tbody></tbody></table></div>
  </section>
  <form class="card" id="form" novalidate>
    <h2 id="formTitulo">Novo usuário</h2>
    <div class="grade g2">
      <div class="campo"><label for="fNome">Nome</label><input id="fNome" maxlength="80" autocomplete="off" required></div>
      <div class="campo"><label for="fEmail">E-mail</label><input id="fEmail" type="email" autocomplete="off" required></div>
      <div class="campo"><label for="fPapel">Papel</label><select id="fPapel"><option value="OPERADOR">Operador</option><option value="ADMIN">Administrador</option></select><span class="dica">Operador cria disparos e vê tudo. Administrador também gerencia aparelhos, chips e usuários.</span></div>
      <div class="campo"><label for="fSenha" id="fSenhaRot">Senha</label><input id="fSenha" type="password" autocomplete="new-password"><span class="dica" id="fSenhaDica"></span></div>
    </div>
    <label class="check" for="fAtivo" id="fAtivoBox" hidden><input type="checkbox" id="fAtivo" checked> Usuário ativo</label>
    <div id="fErro" hidden></div>
    <div class="acoes"><button class="botao primario" type="submit" id="fSalvar">${icone('mais', 16)}<span>Criar usuário</span></button><button class="botao secundario" type="button" id="fCancelar" hidden>Cancelar edição</button></div>
  </form>`;
  const script = `
let lista = []; let editando = null;
function aviso(tipo, html){ caixa('aviso', tipo, html); }
const PAPEIS = { ADMIN: 'Administrador', OPERADOR: 'Operador' };
async function carregar(){
  const r = await (await api('/api/usuarios')).json(); lista = r.data || [];
  $('vazio').hidden = lista.length > 0; $('vazio').textContent = 'Nenhum usuário.'; $('tabela').hidden = !lista.length;
  $('tabela').querySelector('tbody').innerHTML = lista.map(u => '<tr><td><b>'+esc(u.nome)+'</b></td><td>'+esc(u.email)+'</td><td>'+esc(PAPEIS[u.papel]||u.papel)+'</td><td>'+(u.ativo?'<span class="badge sucesso">Ativo</span>':'<span class="badge neutro">Inativo</span>')+'</td><td>'+dataHora(u.criadoEm)+'</td><td><button class="botao secundario pequeno" type="button" data-editar="'+u.id+'">${icone('editar', 16)}Editar</button></td></tr>').join('');
}
function limpar(){ editando = null; $('form').reset(); $('fEmail').disabled = false; $('formTitulo').textContent = 'Novo usuário'; $('fSalvar').lastChild.textContent = 'Criar usuário'; $('fCancelar').hidden = true; $('fAtivoBox').hidden = true; $('fSenhaRot').textContent = 'Senha'; $('fSenhaDica').textContent = ''; }
$('tabela').addEventListener('click', (e) => {
  const b = e.target.closest('[data-editar]'); if (!b) return;
  const u = lista.find(x => String(x.id) === b.dataset.editar); if (!u) return;
  editando = u.id; $('fNome').value = u.nome; $('fEmail').value = u.email; $('fEmail').disabled = true; $('fPapel').value = u.papel; $('fAtivo').checked = u.ativo; $('fSenha').value = '';
  $('formTitulo').textContent = 'Editar usuário'; $('fSalvar').lastChild.textContent = 'Salvar'; $('fCancelar').hidden = false; $('fAtivoBox').hidden = false;
  $('fSenhaRot').textContent = 'Nova senha'; $('fSenhaDica').textContent = 'Deixe em branco para manter a senha atual.'; $('fErro').hidden = true;
  $('form').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('fNome').focus();
});
$('fCancelar').addEventListener('click', limpar);
$('form').addEventListener('submit', async (e) => {
  e.preventDefault(); $('fErro').hidden = true; $('fSalvar').disabled = true;
  try {
    let r;
    if (editando) {
      const corpo = { nome: $('fNome').value.trim(), papel: $('fPapel').value, ativo: $('fAtivo').checked };
      if ($('fSenha').value) corpo.senha = $('fSenha').value;
      r = await putJson('/api/usuarios/'+editando, corpo);
    } else r = await postJson('/api/usuarios', { nome: $('fNome').value.trim(), email: $('fEmail').value.trim(), papel: $('fPapel').value, senha: $('fSenha').value });
    if (r.ok) { aviso('sucesso', editando ? 'Usuário atualizado.' : 'Usuário criado.'); limpar(); carregar(); }
    else { const c = await lerJson(r); caixa('fErro', 'erro', esc(c.mensagem || 'Não foi possível salvar.')); }
  } catch (err) { if (err.message !== 'Sessão expirada') caixa('fErro', 'erro', 'Não foi possível falar com o serviço.'); }
  $('fSalvar').disabled = false;
});
carregar().catch(() => {});
`;
  return shell({ ...ctx, ativo: 'usuarios', antetitulo: 'Administração', titulo: 'Usuários', sub: 'Quem pode entrar no serviço e o que cada pessoa pode fazer.', corpo, script });
}

// ───────────── Revisão (falhas e incertas) ─────────────
export function revisao(ctx: Ctx): string {
  const corpo = `
  <div class="alerta-caixa info">${icone('alerta')}<span><b>Incerta</b> quer dizer que a mensagem pode ter saído. Confira no celular (app sms-gate) antes de reenviar, para não mandar em dobro. <b>Falhou</b> quer dizer que a operadora ou o celular recusou.</span></div>
  <div id="aviso" hidden></div>
  <section class="card neutro">
    <div class="card-cab">
      <div class="segmentado" role="radiogroup" aria-label="Tipo de revisão">
        <label><input type="radio" name="aba" value="FALHOU" checked><span>Falharam</span></label>
        <label><input type="radio" name="aba" value="INCERTA"><span>Incertas</span></label>
      </div>
      <span class="dica" id="contagem"></span>
    </div>
    <div id="vazio" class="vazio" hidden></div>
    <div class="tabela"><table id="tabela" hidden><thead><tr><th>Disparo</th><th>Telefone</th><th>Texto</th><th>Chip</th><th>Situação</th><th>Atualizado</th><th>Ação</th></tr></thead><tbody></tbody></table></div>
    ${PAGER}
  </section>`;
  const script = `
let pagina = 1; const TAM = 50;
function aba(){ return (document.querySelector('input[name="aba"]:checked')||{}).value || 'FALHOU'; }
function curto(t){ t = String(t||''); return t.length > 70 ? t.slice(0, 70)+'…' : t; }
function aviso(tipo, html){ caixa('aviso', tipo, html); }
async function carregar(){
  const st = aba();
  const r = await (await api('/api/revisao?status='+st+'&page='+pagina+'&size='+TAM)).json();
  const lista = r.data || [];
  $('contagem').textContent = r.total + ' mensagem(ns)';
  $('vazio').hidden = lista.length > 0; $('tabela').hidden = !lista.length;
  $('vazio').textContent = st === 'FALHOU' ? 'Nenhuma falha para revisar.' : 'Nenhuma mensagem incerta para revisar.';
  $('tabela').querySelector('tbody').innerHTML = lista.map(m => {
    const origem = (m.disparoId ? '<a href="/disparos/'+m.disparoId+'">'+esc(m.disparo || ('Disparo '+m.disparoId))+'</a>' : esc(m.disparo || '—')) + (m.time ? '<div class="dica">API · '+esc(m.time)+'</div>' : '');
    const cls = m.status === 'INCERTA' ? 'alerta' : 'erro';
    const acoes = '<span class="acoes"><button class="botao secundario pequeno" type="button" data-reenviar="'+m.id+'">Reenviar</button>'
      + (m.status === 'INCERTA' ? '<button class="botao secundario pequeno" type="button" data-saiu="'+m.id+'">Confirmei que saiu</button>' : '') + '</span>';
    return '<tr><td>'+origem+'</td><td>'+esc(m.telefone)+(m.nome ? '<div class="dica">'+esc(m.nome)+'</div>' : '')+'</td><td>'+esc(curto(m.texto))+'</td><td>'+esc(m.chip||'—')+'</td><td><span class="badge '+cls+'">'+esc(m.rotulo)+'</span>'+(m.detalhe ? '<div class="dica">'+esc(m.detalhe)+'</div>' : '')+'<div class="dica">'+m.tentativas+' tentativa(s)</div></td><td>'+dataHora(m.atualizadoEm)+'</td><td>'+acoes+'</td></tr>';
  }).join('');
  pintarPager(r.page, r.size, r.total, (p) => { pagina = p; carregar().catch(() => {}); });
}
document.querySelectorAll('input[name="aba"]').forEach(x => x.addEventListener('change', () => { pagina = 1; $('aviso').hidden = true; carregar().catch(() => {}); }));
$('tabela').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const reenviar = b.dataset.reenviar; const saiu = b.dataset.saiu;
  if (!reenviar && !saiu) return;
  b.disabled = true;
  try {
    const r = await postJson('/api/mensagens/'+(reenviar || saiu)+(reenviar ? '/reprocessar' : '/marcar-enviada'));
    if (r.ok) aviso('sucesso', reenviar ? 'Mensagem de volta na fila para reenvio.' : 'Mensagem marcada como enviada.');
    else aviso('erro', esc((await lerJson(r)).mensagem || 'Não foi possível concluir a ação.'));
    await carregar();
  } catch (err) { if (err.message !== 'Sessão expirada') aviso('erro', 'Não foi possível falar com o serviço.'); b.disabled = false; }
});
carregar().catch(() => {}); setInterval(() => carregar().catch(() => {}), 10000);
`;
  return shell({ ...ctx, ativo: 'revisao', antetitulo: 'Revisão', titulo: 'Revisão de mensagens', sub: 'Mensagens que falharam ou ficaram incertas. Decida uma a uma: reenviar ou confirmar que saiu.', corpo, script });
}

// ───────────── Bloqueios ─────────────
export function bloqueios(ctx: Ctx): string {
  const admin = ctx.usuario.papel === 'ADMIN';
  const corpo = `
  <div id="aviso" hidden></div>
  <form class="card" id="form" novalidate>
    <h2>Bloquear números</h2>
    <p class="apoio">Números bloqueados não recebem mais SMS, em nenhum disparo.</p>
    <div class="grade g21">
      <div class="campo"><label for="fTelefones">Telefones (um por linha)</label><textarea id="fTelefones" rows="4" placeholder="11999998888"></textarea></div>
      <div class="campo"><label for="fMotivo">Motivo</label><select id="fMotivo"><option value="Pediu para sair">Pediu para sair</option><option value="Número errado">Número errado</option><option value="Reclamação">Reclamação</option><option value="Outro">Outro</option></select></div>
    </div>
    <div id="fErro" hidden></div>
    <div class="acoes"><button class="botao primario" type="submit" id="fSalvar">${icone('bloqueio', 16)}Bloquear</button></div>
  </form>
  <section class="card neutro">
    <div class="card-cab"><h2>Números bloqueados</h2><div class="campo" style="max-width:260px"><label for="fBusca">Buscar pelos 4 últimos dígitos</label><input id="fBusca" inputmode="numeric" maxlength="4" placeholder="Ex.: 8888" autocomplete="off"></div></div>
    <div id="vazio" class="vazio" hidden>Nenhum número bloqueado.</div>
    <div class="tabela"><table id="tabela" hidden><thead><tr><th>Telefone</th><th>Motivo</th><th>Bloqueado por</th><th>Em</th>${admin ? '<th></th>' : ''}</tr></thead><tbody></tbody></table></div>
    ${PAGER}
  </section>`;
  const script = `
const ADMIN = ${JSON.stringify(admin)};
let pagina = 1; const TAM = 50; let timerBusca = null;
function aviso(tipo, html){ caixa('aviso', tipo, html); }
async function carregar(){
  const busca = $('fBusca').value.trim();
  const r = await (await api('/api/bloqueios?page='+pagina+'&size='+TAM+(busca ? '&busca='+encodeURIComponent(busca) : ''))).json();
  const lista = r.data || [];
  $('vazio').hidden = lista.length > 0; $('tabela').hidden = !lista.length;
  $('tabela').querySelector('tbody').innerHTML = lista.map(b => '<tr><td>'+esc(b.telefone)+'</td><td>'+esc(b.motivo)+'</td><td>'+esc(b.criadoPor || '—')+'</td><td>'+dataHora(b.criadoEm)+'</td>'
    + (ADMIN ? '<td><button class="botao secundario pequeno" type="button" data-remover="'+b.id+'">Remover</button></td>' : '') + '</tr>').join('');
  pintarPager(r.page, r.size, r.total, (p) => { pagina = p; carregar().catch(() => {}); });
}
$('fBusca').addEventListener('input', () => { clearTimeout(timerBusca); timerBusca = setTimeout(() => { pagina = 1; carregar().catch(() => {}); }, 300); });
$('tabela').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-remover]'); if (!b || !ADMIN) return;
  b.disabled = true;
  try {
    const r = await api('/api/bloqueios/'+b.dataset.remover, { method: 'DELETE' });
    if (r.status === 204 || r.ok) aviso('sucesso', 'Bloqueio removido. O número volta a poder receber SMS.');
    else aviso('erro', esc((await lerJson(r)).mensagem || 'Não foi possível remover.'));
    await carregar();
  } catch (err) { if (err.message !== 'Sessão expirada') aviso('erro', 'Não foi possível falar com o serviço.'); b.disabled = false; }
});
$('form').addEventListener('submit', async (e) => {
  e.preventDefault(); $('fErro').hidden = true;
  const telefones = $('fTelefones').value.split(/\\r?\\n/).map(x => x.trim()).filter(Boolean);
  if (!telefones.length) { caixa('fErro', 'erro', 'Informe pelo menos um telefone.'); return; }
  $('fSalvar').disabled = true;
  try {
    const r = await postJson('/api/bloqueios', { telefones, motivo: $('fMotivo').value });
    const c = await lerJson(r);
    if (r.ok) {
      const inv = c.invalidos || [];
      aviso(inv.length ? 'alerta' : 'sucesso', 'Adicionados: <b>'+c.adicionados+'</b> · Já existiam: <b>'+c.jaExistiam+'</b> · Inválidos: <b>'+inv.length+'</b>'+(inv.length ? ' ('+inv.slice(0,10).map(esc).join(', ')+(inv.length > 10 ? '…' : '')+')' : '')+'.');
      $('fTelefones').value = ''; pagina = 1; await carregar();
    } else caixa('fErro', 'erro', esc(c.mensagem || 'Não foi possível bloquear.'));
  } catch (err) { if (err.message !== 'Sessão expirada') caixa('fErro', 'erro', 'Não foi possível falar com o serviço.'); }
  $('fSalvar').disabled = false;
});
carregar().catch(() => {});
`;
  return shell({ ...ctx, ativo: 'bloqueios', antetitulo: 'Bloqueios', titulo: 'Números bloqueados', sub: 'Números que não recebem mais SMS. Os telefones aparecem mascarados.', corpo, script });
}

// ───────────── Times (API) — ADMIN ─────────────
export function times(ctx: Ctx): string {
  const corpo = `
  <div id="aviso" hidden></div>
  <section class="card" id="caixaChave" hidden>
    <h2>Chave de API</h2>
    <div class="alerta-caixa alerta">${icone('alerta')}<span>Guarde agora: ela não aparece de novo. Se perder, gere uma nova chave.</span></div>
    <div class="acoes"><code id="chaveTexto" style="font-size:14px;padding:var(--space-3)"></code><button class="botao secundario pequeno" type="button" id="btnCopiar">${icone('copiar', 16)}Copiar</button><button class="botao secundario pequeno" type="button" id="btnFecharChave">Já guardei</button></div>
  </section>
  <section class="card neutro">
    <div id="vazio" class="vazio">Carregando…</div>
    <div class="tabela"><table id="tabela" hidden><thead><tr><th>Time</th><th>Chave</th><th>Cota diária</th><th>Hoje</th><th>Prioridade</th><th>Situação</th><th>Webhook</th><th></th></tr></thead><tbody></tbody></table></div>
  </section>
  <form class="card" id="form" novalidate>
    <h2 id="formTitulo">Novo time</h2>
    <div class="grade g2">
      <div class="campo"><label for="fNome">Nome</label><input id="fNome" maxlength="80" autocomplete="off" required></div>
      <div class="campo"><label for="fCota">Cota diária (SMS por dia)</label><input id="fCota" type="number" min="0" step="1" value="1000"></div>
      <div class="campo"><label for="fPrioridade">Prioridade (0 a 10)</label><input id="fPrioridade" type="number" min="0" max="10" step="1" value="5"><span class="dica">Quanto maior, mais cedo as mensagens do time saem.</span></div>
      <div class="campo"><label for="fWebhook">Webhook URL (opcional)</label><input id="fWebhook" type="url" placeholder="https://sistema.exemplo.com.br/sms" autocomplete="off"></div>
    </div>
    <label class="check" for="fAtivo" id="fAtivoBox" hidden><input type="checkbox" id="fAtivo" checked> Time ativo</label>
    <div id="fErro" hidden></div>
    <div class="acoes"><button class="botao primario" type="submit" id="fSalvar">${icone('mais', 16)}<span>Criar time</span></button><button class="botao secundario" type="button" id="fCancelar" hidden>Cancelar edição</button></div>
  </form>
  <section class="card neutro">
    <h2>Como o time usa a API</h2>
    <ol class="apoio" style="display:grid;gap:var(--space-2);padding-left:var(--space-5)">
      <li>Enviar: <code>POST /v1/mensagens</code> com os headers <code>X-Api-Key</code> e <code>Idempotency-Key</code> e o corpo <code>{ "telefone": "11999998888", "texto": "Olá", "nome": "Maria" }</code> (o <code>nome</code> é opcional).</li>
      <li>Consultar: <code>GET /v1/mensagens/:id</code> com o header <code>X-Api-Key</code>.</li>
      <li>A documentação completa fica em <a href="/v1/openapi.json">/v1/openapi.json</a>.</li>
    </ol>
  </section>`;
  const script = `
let lista = []; let editando = null; let confirmando = null; let timerConf = null;
function aviso(tipo, html){ caixa('aviso', tipo, html); }
function mostrarChave(chave){ $('chaveTexto').textContent = chave; $('caixaChave').hidden = false; $('caixaChave').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
async function carregar(){
  const r = await (await api('/api/times')).json(); lista = r.data || [];
  $('vazio').hidden = lista.length > 0; $('vazio').textContent = 'Nenhum time cadastrado.'; $('tabela').hidden = !lista.length;
  $('tabela').querySelector('tbody').innerHTML = lista.map(t => '<tr><td><b>'+esc(t.nome)+'</b><div class="dica">Criado em '+dataHora(t.criadoEm)+'</div></td><td><code>'+esc(t.chavePrefixo)+'…</code></td><td>'+t.cotaDiaria+'</td><td>'+t.hoje+'</td><td>'+t.prioridade+'</td><td>'+(t.ativo?'<span class="badge sucesso">Ativo</span>':'<span class="badge neutro">Inativo</span>')+'</td><td>'+(t.webhookUrl ? esc(t.webhookUrl) : '<span class="dica">—</span>')+'</td>'
    + '<td><span class="acoes"><button class="botao secundario pequeno" type="button" data-editar="'+t.id+'">${icone('editar', 16)}Editar</button><button class="botao secundario pequeno" type="button" data-chave="'+t.id+'">'+(confirmando === t.id ? 'Confirmar nova chave' : 'Gerar nova chave')+'</button></span></td></tr>').join('');
}
function limpar(){ editando = null; $('form').reset(); $('fCota').value = '1000'; $('fPrioridade').value = '5'; $('formTitulo').textContent = 'Novo time'; $('fSalvar').lastChild.textContent = 'Criar time'; $('fCancelar').hidden = true; $('fAtivoBox').hidden = true; }
$('btnCopiar').addEventListener('click', async () => {
  const txt = $('chaveTexto').textContent;
  try { await navigator.clipboard.writeText(txt); aviso('sucesso', 'Chave copiada.'); }
  catch { const rg = document.createRange(); rg.selectNodeContents($('chaveTexto')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); aviso('alerta', 'Não consegui copiar sozinho. A chave está selecionada: use Ctrl+C.'); }
});
$('btnFecharChave').addEventListener('click', () => { $('caixaChave').hidden = true; $('chaveTexto').textContent = ''; });
$('tabela').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.editar) {
    const t = lista.find(x => String(x.id) === b.dataset.editar); if (!t) return;
    editando = t.id; $('fNome').value = t.nome; $('fCota').value = t.cotaDiaria; $('fPrioridade').value = t.prioridade; $('fWebhook').value = t.webhookUrl || ''; $('fAtivo').checked = t.ativo;
    $('formTitulo').textContent = 'Editar time'; $('fSalvar').lastChild.textContent = 'Salvar'; $('fCancelar').hidden = false; $('fAtivoBox').hidden = false; $('fErro').hidden = true;
    $('form').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('fNome').focus();
  } else if (b.dataset.chave) {
    const id = Number(b.dataset.chave);
    if (confirmando !== id) {
      confirmando = id; clearTimeout(timerConf); timerConf = setTimeout(() => { confirmando = null; carregar().catch(() => {}); }, 6000);
      aviso('alerta', 'Gerar uma nova chave invalida a chave atual. Clique em <b>Confirmar nova chave</b> para continuar.'); await carregar(); return;
    }
    clearTimeout(timerConf); confirmando = null; b.disabled = true;
    try {
      const r = await postJson('/api/times/'+id+'/nova-chave'); const c = await lerJson(r);
      if (r.ok) { mostrarChave(c.chave); aviso('sucesso', 'Nova chave gerada. A chave antiga não vale mais.'); }
      else aviso('erro', esc(c.mensagem || 'Não foi possível gerar a chave.'));
    } catch (err) { if (err.message !== 'Sessão expirada') aviso('erro', 'Não foi possível falar com o serviço.'); }
    await carregar();
  }
});
$('fCancelar').addEventListener('click', limpar);
$('form').addEventListener('submit', async (e) => {
  e.preventDefault(); $('fErro').hidden = true;
  const nome = $('fNome').value.trim();
  const cota = Number($('fCota').value); const prioridade = Number($('fPrioridade').value);
  if (!nome) { caixa('fErro', 'erro', 'Informe o nome do time.'); return; }
  if (!Number.isInteger(cota) || cota < 0) { caixa('fErro', 'erro', 'A cota diária precisa ser um número inteiro maior ou igual a zero.'); return; }
  if (!Number.isInteger(prioridade) || prioridade < 0 || prioridade > 10) { caixa('fErro', 'erro', 'A prioridade vai de 0 a 10.'); return; }
  const webhook = $('fWebhook').value.trim();
  $('fSalvar').disabled = true;
  try {
    let r;
    if (editando) r = await putJson('/api/times/'+editando, { nome, cotaDiaria: cota, prioridade, ativo: $('fAtivo').checked, webhookUrl: webhook || null });
    else r = await postJson('/api/times', { nome, cotaDiaria: cota, prioridade, webhookUrl: webhook || undefined });
    const c = await lerJson(r);
    if (r.ok) {
      const novo = !editando;
      aviso('sucesso', novo ? 'Time criado.' : 'Time atualizado.');
      if (novo && c.chave) mostrarChave(c.chave);
      limpar(); await carregar();
    } else caixa('fErro', 'erro', esc(c.mensagem || 'Não foi possível salvar.'));
  } catch (err) { if (err.message !== 'Sessão expirada') caixa('fErro', 'erro', 'Não foi possível falar com o serviço.'); }
  $('fSalvar').disabled = false;
});
carregar().catch(() => {});
`;
  return shell({ ...ctx, ativo: 'times', antetitulo: 'Administração', titulo: 'Times (API)', sub: 'Sistemas e áreas que enviam SMS pela API. Cada time tem a própria chave, cota diária e prioridade.', corpo, script });
}
