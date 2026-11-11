// Telas do serviço de SMS no design system da Recall (tokens oficiais em /tokens.css, Inter, ícones Lucide).

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
};
function icone(nome, tam = 20) {
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
@media(max-width:999px){.lateral{border-right:0;border-bottom:1px solid var(--borda-padrao);border-radius:0 0 var(--radius-xl) var(--radius-xl);padding:var(--space-4) 0;gap:var(--space-3)}.menu{grid-auto-flow:column;overflow-x:auto;padding:0 var(--space-4)}.item{margin:0;white-space:nowrap}.rodape-lateral{display:none}}
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

const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('sms-mvp-tema');if(t==='escuro'||t==='claro')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

const SCRIPT_COMUM = `
const $ = (id) => document.getElementById(id);
function esc(x){ return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function hora(iso){ return iso ? new Date(iso).toLocaleTimeString('pt-BR') : ''; }
function dataHora(iso){ return iso ? new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''; }
async function postJson(url, corpo){ return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(corpo ?? {}) }); }
function badgeStatus(m){ const cls = m.entregue ? 'sucesso' : m.falhou ? 'erro' : m.status === 'INCERTA' ? 'alerta' : m.status === 'CANCELADA' ? 'neutro' : m.status === 'CRIADA' ? 'neutro' : 'triagem'; return '<span class="badge '+cls+'">'+esc(m.rotulo)+'</span>'; }
function badgeDisparo(s){ return s === 'ENVIANDO' ? '<span class="badge triagem">Enviando</span>' : s === 'CANCELADO' ? '<span class="badge alerta">Cancelado</span>' : '<span class="badge sucesso">Concluído</span>'; }
function badgeNivel(n){ return n === 'erro' ? '<span class="badge erro">Erro</span>' : n === 'aviso' ? '<span class="badge alerta">Aviso</span>' : '<span class="badge neutro">Info</span>'; }
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
    document.documentElement.setAttribute('data-theme', novo); try { localStorage.setItem('sms-mvp-tema', novo); } catch(e){} pintar(); });
  pintar();
})();
`;

const MENU = [
  ['geral', '/', 'painel', 'Visão geral'],
  ['disparos', '/disparos', 'disparo', 'Disparos'],
  ['avulso', '/avulso', 'mensagem', 'Envio avulso'],
  ['aparelhos', '/aparelhos', 'celular', 'Aparelhos e chips'],
  ['logs', '/logs', 'logs', 'Logs'],
  ['config', '/config', 'ajustes', 'Configurações'],
];

function shell({ ativo, antetitulo, titulo, sub, simulado, configurado, acoes = '', corpo, script = '', extraHead = '' }) {
  return `<!doctype html>
<html lang="pt-BR" data-theme="claro">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} · Serviço de SMS</title>
<script>${SCRIPT_TEMA}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/tokens.css">
<style>${CSS}</style>
${extraHead}
</head>
<body>
<div class="shell">
  <aside class="lateral">
    <div class="marca"><span class="ante">Recall Precatórios</span><b>Serviço de SMS</b><span>MVP · envio pelos chips</span></div>
    <nav class="menu" aria-label="Menu">
      ${MENU.map(([k, href, ic, nome]) => `<a class="item${k === ativo ? ' ativo' : ''}" href="${href}"${k === ativo ? ' aria-current="page"' : ''}>${icone(ic, 24)}<span>${nome}</span></a>`).join('')}
    </nav>
    <div class="rodape-lateral"><span>${simulado ? 'Modo simulado: nenhum SMS real sai.' : 'Modo real.'}</span><span>Os dados ficam só nesta máquina e somem ao reiniciar o serviço.</span></div>
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
        <span class="pilula">${simulado ? '<span class="badge alerta">Modo simulado</span>' : '<span class="badge sucesso">Modo real</span>'}</span>
        <button class="pilula" type="button" id="btnTema" aria-label="Trocar tema"></button>
      </div>
    </div>
    ${!configurado ? `<div class="alerta-caixa alerta">${icone('alerta')}<span>Nenhum celular configurado ainda. <a href="/config">Abrir Configurações</a></span></div>` : ''}
    ${corpo}
  </main>
</div>
<script>${SCRIPT_COMUM}${script}</script>
</body></html>`;
}

// ───────────── Visão geral: painel de todos os chips ─────────────
export function visaoGeral(ctx) {
  const corpo = `
  <div id="avisoDisparo" hidden></div>
  <div class="grade g4">
    <div class="card kpi"><span class="rot">Enviadas hoje</span><span class="valor" id="kTotal">—</span><span class="det" id="kFila"></span></div>
    <div class="card kpi"><span class="rot">Entregues</span><span class="valor" id="kEntregues">—</span><span class="det">confirmadas pela operadora</span></div>
    <div class="card kpi"><span class="rot">Falhas</span><span class="valor" id="kFalhas">—</span><span class="det">recusadas pelo celular ou pela operadora</span></div>
    <div class="card kpi"><span class="rot">Taxa de entrega</span><span class="valor" id="kTaxa">—</span><span class="det">entregues ÷ concluídas</span></div>
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
      <div class="tabela"><table id="dTabela" hidden><thead><tr><th>Disparo</th><th>Contatos</th><th>Entregues</th><th>Falhas</th><th>Status</th></tr></thead><tbody></tbody></table></div>
    </section>
    <section class="card">
      <div class="card-cab"><h2>Últimos eventos</h2><a class="dica" href="/logs">Ver todos os logs</a></div>
      <ul class="eventos" id="eventos"><li class="vazio" style="display:block">Carregando…</li></ul>
    </section>
  </div>`;
  const script = `
async function carregar(){
  const [p, a, e] = await Promise.all([fetch('/api/painel').then(r=>r.json()), fetch('/api/aparelhos').then(r=>r.json()), fetch('/api/eventos').then(r=>r.json())]);
  $('kTotal').textContent = p.hoje.total; $('kEntregues').textContent = p.hoje.entregues; $('kFalhas').textContent = p.hoje.falhas;
  $('kTaxa').textContent = p.hoje.taxaEntrega === null ? '—' : p.hoje.taxaEntrega + '%';
  $('kFila').textContent = (p.hoje.naFila + p.hoje.enviadas) ? (p.hoje.naFila + p.hoje.enviadas) + ' aguardando confirmação' : 'nenhuma aguardando';
  const av = $('avisoDisparo');
  if (p.disparoAtivo) { av.hidden = false; av.className = 'alerta-caixa info';
    const k = p.disparoAtivo.contagem; av.innerHTML = ${JSON.stringify(icone('disparo'))} + '<span>Disparo em andamento: <b>'+esc(p.disparoAtivo.nome)+'</b> · '+(k.total-k.naFila)+' de '+k.total+' saíram. <a href="/disparos/'+p.disparoAtivo.id+'">Acompanhar</a></span>'; }
  else av.hidden = true;
  const saude = new Map(a.aparelhos.map(x => [x.id, x]));
  const erros = (a.erros || []).concat((p.errosAparelhos||[]).filter(x => !(a.erros||[]).some(y => y.aparelhoId === x.aparelhoId)));
  const aa = $('avisoAparelhos');
  if (erros.length) { aa.hidden = false; aa.className = 'alerta-caixa alerta'; aa.innerHTML = ${JSON.stringify(icone('alerta'))} + '<span>'+erros.map(x => esc(x.aparelho)+': '+esc(x.motivo)).join(' · ')+'. Os chips desse celular saíram da roleta. <a href="/aparelhos">Ver aparelhos</a></span>'; }
  else aa.hidden = true;
  $('chips').innerHTML = p.chips.length ? p.chips.map(c => {
    const s = saude.get(c.aparelhoId) || {};
    const k = c.hoje;
    return '<article class="card chip-card"><div class="chip-topo"><div><b>'+esc(c.aparelho)+' · Chip '+c.chip+'</b><div class="chip-num">'+esc(c.telefone)+'</div></div><span class="badge '+(s.online===false?'erro':'sucesso')+'">'+(s.online===false?'Fora da roleta':'Na roleta')+'</span></div>'
      + '<div class="linha-info"><span class="badge triagem">'+esc(c.operadora)+'</span>'
      + (s.bateria!=null ? '<span>'+${JSON.stringify(icone('bateria', 16))}+s.bateria+'%'+(s.carregando?' · carregando':'')+'</span>' : '')
      + (s.internet!=null ? '<span>'+${JSON.stringify(icone('wifi', 16))}+(s.internet?'internet ok':'sem internet')+'</span>' : '') + '</div>'
      + '<div class="mini"><div><span>Hoje</span><b>'+k.total+'</b></div><div><span>Entregues</span><b>'+k.entregues+'</b></div><div><span>Falhas</span><b>'+k.falhas+'</b></div><div><span>Taxa</span><b>'+(c.taxaEntrega===null?'—':c.taxaEntrega+'%')+'</b></div></div>'
      + '<span class="dica">'+(c.ultimoEnvio ? 'Último envio às '+hora(c.ultimoEnvio) : 'Nenhum envio hoje')+'</span></article>';
  }).join('') : '<div class="card vazio">Nenhum chip encontrado. Confira os celulares em <a href="/aparelhos">Aparelhos e chips</a>.</div>';
  $('dVazio').hidden = p.ultimosDisparos.length > 0; $('dTabela').hidden = !p.ultimosDisparos.length;
  $('dTabela').querySelector('tbody').innerHTML = p.ultimosDisparos.map(d => '<tr class="clicavel" data-href="/disparos/'+d.id+'"><td><b>'+esc(d.nome)+'</b><div class="dica">'+dataHora(d.criadoEm)+'</div></td><td>'+d.contagem.total+'</td><td>'+d.contagem.entregues+'</td><td>'+d.contagem.falhas+'</td><td>'+badgeDisparo(d.status)+'</td></tr>').join('');
  const ult = e.data.slice(-8).reverse();
  $('eventos').innerHTML = ult.length ? ult.map(x => '<li><time>'+hora(x.em)+'</time><span>'+badgeNivel(x.nivel)+'</span><span>'+esc(x.texto)+'</span></li>').join('') : '<li class="vazio" style="display:block">Nenhum evento ainda.</li>';
  $('atualizadoEm').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR') + ' · a cada 5 s';
}
document.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) location.href = tr.dataset.href; });
carregar(); setInterval(carregar, 5000);
`;
  return shell({ ...ctx, ativo: 'geral', antetitulo: 'Serviço de SMS', titulo: 'Visão geral', sub: 'Os números de hoje, cada chip dos celulares e o que aconteceu por último.', corpo, script });
}

// ───────────── Disparos: lista ─────────────
export function listaDisparos(ctx) {
  const corpo = `
  <section class="card neutro">
    <div id="vazio" class="vazio">Nenhum disparo nesta sessão. Comece pelo botão "Novo disparo".</div>
    <div class="tabela"><table id="tabela" hidden><thead><tr><th>Disparo</th><th>Início</th><th>Contatos</th><th>Entregues</th><th>Falhas</th><th>Canceladas</th><th>Status</th></tr></thead><tbody></tbody></table></div>
  </section>`;
  const script = `
async function carregar(){
  const { data } = await (await fetch('/api/disparos')).json();
  $('vazio').hidden = data.length > 0; $('tabela').hidden = !data.length;
  $('tabela').querySelector('tbody').innerHTML = data.map(d => '<tr class="clicavel" data-href="/disparos/'+d.id+'"><td><b>'+esc(d.nome)+'</b></td><td>'+dataHora(d.criadoEm)+'</td><td>'+d.contagem.total+'</td><td>'+d.contagem.entregues+'</td><td>'+d.contagem.falhas+'</td><td>'+d.contagem.canceladas+'</td><td>'+badgeDisparo(d.status)+'</td></tr>').join('');
}
document.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) location.href = tr.dataset.href; });
carregar(); setInterval(carregar, 5000);
`;
  return shell({ ...ctx, ativo: 'disparos', antetitulo: 'Disparos', titulo: 'Disparos', sub: 'Cada disparo envia uma planilha de contatos, alternando os chips e as mensagens.', acoes: `<a class="botao primario pequeno" href="/disparos/novo">${icone('mais', 16)}Novo disparo</a>`, corpo, script });
}

// ───────────── Disparos: novo (planilha → mensagens → envio) ─────────────
export function novoDisparo(ctx) {
  const L = ctx.limites;
  const corpo = `
  <div class="passos">
    <section class="card">
      <div class="passo-cab"><span class="passo-n" id="n1">1</span><h2>Planilha de contatos</h2></div>
      <p class="apoio">Envie um arquivo <b>.xlsx</b> ou <b>.csv</b> com uma coluna <b>telefone</b>. As colunas <b>nome</b> e <b>mensagem</b> são opcionais. Até ${L.contatos} contatos por disparo. O arquivo é lido aqui no navegador.</p>
      <label class="soltar" id="soltar" for="arquivo">
        ${icone('upload', 24)}
        <span><b>Arraste a planilha aqui</b> ou clique para escolher</span>
        <span class="dica">.xlsx ou .csv, até 5 MB</span>
        <input type="file" id="arquivo" accept=".xlsx,.csv,.txt">
      </label>
      <div class="acoes"><button class="botao secundario pequeno" type="button" id="btnModelo">${icone('baixar', 16)}Baixar planilha modelo</button><span class="dica" id="nomeArquivo"></span></div>
      <div id="pErro" hidden></div>
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
        <div class="campo"><span class="rotulo">Chips na roleta</span><div class="seg" id="chipsLista">Lendo os chips…</div><span class="dica">Cada mensagem sai pelo próximo chip. Os chips de um celular fora do ar saem da roleta.</span></div>
        <div class="campo"><span class="rotulo">Intervalo entre mensagens (sorteado a cada envio)</span>
          <div class="grade g2">
            <div class="campo"><label for="intMin">Mínimo (segundos)</label><input id="intMin" type="number" min="${L.intervaloMin}" max="${L.intervaloMax}" value="45"></div>
            <div class="campo"><label for="intMax">Máximo (segundos)</label><input id="intMax" type="number" min="${L.intervaloMin}" max="${L.intervaloMax}" value="80"></div>
          </div>
          <span class="dica" id="intervaloAviso">Cada mensagem espera um tempo diferente dentro dessa faixa, para o chip não disparar num ritmo fixo.</span></div>
      </div>
      <div class="seg" id="resumoEnvio"></div>
      <div id="eErro" hidden></div>
      <div class="acoes"><button class="botao primario" type="button" id="btnIniciar" disabled>${icone('disparo')}Iniciar disparo</button><a class="botao secundario" href="/disparos">Voltar</a></div>
    </section>
  </div>`;
  const script = `
let planilha = null; let chips = [];
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
function caixa(id, tipo, html){ const b=$(id); b.hidden=false; b.className='alerta-caixa '+tipo; b.innerHTML='<span>'+html+'</span>'; }

async function abrir(arquivo){
  $('pErro').hidden = true; $('pResumo').hidden = true; planilha = null; atualizar();
  $('nomeArquivo').textContent = arquivo.name;
  try {
    const linhas = await Planilha.ler(arquivo);
    const r = Planilha.montarContatos(linhas);
    if (!r.contatos.length) { caixa('pErro','erro','Não encontrei nenhum telefone válido. Confira se existe uma coluna "telefone" com DDD e número.'); return; }
    if (r.contatos.length > ${L.contatos}) { caixa('pErro','erro','A planilha tem '+r.contatos.length+' contatos válidos. No MVP, cada disparo vai até ${L.contatos}.'); return; }
    planilha = r;
    if (!$('nomeDisparo').value) $('nomeDisparo').value = arquivo.name.replace(/\\.[^.]+$/, '');
    $('pResumo').hidden = false;
    $('pNumeros').innerHTML = '<span>Linhas <b>'+r.total+'</b></span><span>Contatos válidos <b>'+r.contatos.length+'</b></span><span>Telefone inválido <b>'+r.invalidos.length+'</b></span><span>Repetidos (entram uma vez) <b>'+r.duplicados+'</b></span>'
      + '<span>Colunas: telefone = <b>'+esc(r.colunas.telefone)+'</b>'+(r.colunas.nome?' · nome = <b>'+esc(r.colunas.nome)+'</b>':'')+(r.colunas.mensagem?' · mensagem = <b>'+esc(r.colunas.mensagem)+'</b>':'')+'</span>';
    $('pTabela').querySelector('tbody').innerHTML = r.contatos.slice(0,8).map(c => '<tr><td>'+c.linha+'</td><td>'+esc(c.nome||'—')+'</td><td>'+esc(c.mascarado)+'</td><td>'+(c.mensagem?'sim':'—')+'</td></tr>').join('')
      + (r.contatos.length > 8 ? '<tr><td colspan="4" class="dica">e mais '+(r.contatos.length-8)+' contato(s)</td></tr>' : '');
    $('pInvalidosBox').hidden = !r.invalidos.length;
    $('pInvalidosTit').textContent = r.invalidos.length+' linha(s) com telefone inválido ficam de fora (ver)';
    $('pInvalidos').innerHTML = r.invalidos.slice(0,50).map(x => '<tr><td>'+x.linha+'</td><td>'+esc(x.valor||'(vazio)')+'</td></tr>').join('');
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
    : 'Cada mensagem espera um tempo diferente entre '+iMin+' e '+iMax+' s, para o chip não disparar num ritmo fixo.';
  $('intervaloAviso').style.color = !okInt ? 'var(--erro)' : iMin < 3 ? 'var(--alerta-texto)' : '';
  let pronto = Boolean(planilha) && okInt && chips.length > 0 && (semMsg === 0 || ms.length > 0);
  if (planilha) {
    const n = planilha.contatos.length;
    const fmt = d => d >= 3600 ? Math.floor(d/3600)+' h '+Math.round((d%3600)/60)+' min' : d >= 60 ? Math.floor(d/60)+' min '+Math.round(d%60)+' s' : Math.round(d)+' s';
    const durTxt = iMin === iMax ? fmt((n - 1) * iMin) : '~'+fmt((n - 1) * (iMin + iMax) / 2)+' (entre '+fmt((n - 1) * iMin)+' e '+fmt((n - 1) * iMax)+')';
    const sms = planilha.contatos.reduce((t, c, i) => t + segmentos(c.mensagem ? aplicar(c.mensagem, c.nome) : aplicar(ms.length ? ms[i % ms.length] : '', c.nome)).seg, 0);
    $('resumoEnvio').innerHTML = '<span>Contatos <b>'+n+'</b></span><span>Chips <b>'+chips.length+'</b></span><span>SMS cobrados (estimativa) <b>'+sms+'</b></span><span>Duração estimada <b>'+(okInt?durTxt:'—')+'</b></span>'
      + (chips.length ? '<span>Por chip <b>~'+Math.ceil(n / chips.length)+'</b></span>' : '');
  } else $('resumoEnvio').innerHTML = '<span>Envie a planilha para ver o resumo.</span>';
  if (semMsg > 0 && !ms.length) pronto = false;
  $('btnIniciar').disabled = !pronto;
  $('n1').className = 'passo-n'+(planilha?' feito':''); $('n2').className = 'passo-n'+(planilha && (semMsg===0 || ms.length)?' feito':''); $('n3').className = 'passo-n'+(pronto?' feito':'');
}

async function carregarChips(){
  try { const c = await (await fetch('/api/chips')).json(); chips = c.chips;
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
  const corpo = { nome: $('nomeDisparo').value, mensagens: modelos(), intervaloMinSegundos: Number($('intMin').value), intervaloMaxSegundos: Number($('intMax').value),
    contatos: planilha.contatos.map(c => ({ linha: c.linha, telefone: c.telefone, nome: c.nome, mensagem: c.mensagem })) };
  try {
    const r = await postJson('/api/disparos', corpo); const c = await r.json();
    if (r.ok) { location.href = '/disparos/' + c.id; return; }
    const det = (c.detalhes && c.detalhes.problemas) ? '<br>'+c.detalhes.problemas.slice(0,5).map(p => 'Linha '+p.linha+': '+esc(p.motivo)).join('<br>') : '';
    const link = c.codigo === 'DISPARO_EM_ANDAMENTO' && c.detalhes.id ? ' <a href="/disparos/'+c.detalhes.id+'">Ver o disparo em andamento</a>' : '';
    caixa('eErro','erro', esc(c.mensagem)+det+link);
  } catch { caixa('eErro','erro','Não foi possível falar com o serviço.'); }
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
    extraHead: '<script src="/planilha.js"></script>',
  });
}

// ───────────── Disparos: acompanhamento ─────────────
export function detalheDisparo(ctx) {
  const corpo = `
  <section class="card">
    <div class="card-cab"><div style="display:grid;gap:var(--space-1)"><h2 id="dNome">Carregando…</h2><span class="dica" id="dInfo"></span></div><div class="acoes"><span id="dStatus"></span><button class="botao perigo pequeno" type="button" id="btnCancelar" hidden>${icone('parar', 16)}Cancelar disparo</button><button class="botao secundario pequeno" type="button" id="btnExportar">${icone('baixar', 16)}Exportar resultado</button></div></div>
    <div class="progresso" aria-hidden="true"><i id="barra"></i></div>
    <div class="seg" id="dProgresso"></div>
    <div id="dAviso" hidden></div>
  </section>
  <div class="grade g4">
    <div class="card kpi"><span class="rot">Na fila</span><span class="valor" id="kFila">—</span><span class="det">ainda não saíram</span></div>
    <div class="card kpi"><span class="rot">Aguardando</span><span class="valor" id="kEnviadas">—</span><span class="det">saíram, esperando a operadora</span></div>
    <div class="card kpi"><span class="rot">Entregues</span><span class="valor" id="kEntregues">—</span><span class="det">confirmadas pela operadora</span></div>
    <div class="card kpi"><span class="rot">Falhas</span><span class="valor" id="kFalhas">—</span><span class="det" id="kCanc"></span></div>
  </div>
  <section class="card neutro">
    <div class="card-cab"><h2>Contatos</h2><div class="segmentado" role="radiogroup" aria-label="Filtrar por status">
      <label><input type="radio" name="filtro" value="todos" checked><span>Todos</span></label>
      <label><input type="radio" name="filtro" value="entregue"><span>Entregues</span></label>
      <label><input type="radio" name="filtro" value="falha"><span>Falhas</span></label>
      <label><input type="radio" name="filtro" value="pendente"><span>Pendentes</span></label>
    </div></div>
    <div class="tabela"><table id="tabela"><thead><tr><th>Linha</th><th>Nome</th><th>Telefone</th><th>Texto</th><th>Chip</th><th>Status</th><th>Atualizado</th></tr></thead><tbody></tbody></table></div>
  </section>`;
  const script = `
const ID = ${JSON.stringify(ctx.id)}; let ultimo = null; let timer = null;
function filtro(){ return (document.querySelector('input[name="filtro"]:checked')||{}).value || 'todos'; }
function pintar(){
  const d = ultimo; if (!d) return;
  const k = d.contagem;
  $('dNome').textContent = d.nome;
  $('dInfo').textContent = 'Início '+dataHora(d.criadoEm)+' · '+d.chips+' chip(s) na roleta'+(d.modelos?' · '+d.modelos+' texto(s) na roleta':'')+' · 1 mensagem a cada '+(d.intervaloMinMs===d.intervaloMaxMs ? (d.intervaloMinMs/1000)+' s' : (d.intervaloMinMs/1000)+' a '+(d.intervaloMaxMs/1000)+' s (sorteado)')+(d.duplicados?' · '+d.duplicados+' repetido(s) ignorado(s)':'');
  $('dStatus').innerHTML = badgeDisparo(d.status);
  $('btnCancelar').hidden = d.status !== 'ENVIANDO';
  const saiu = k.total - k.naFila - k.canceladas;
  $('barra').style.width = (k.total ? Math.round((k.total - k.naFila) / k.total * 100) : 0) + '%';
  $('dProgresso').innerHTML = '<span>Saíram <b>'+saiu+' de '+k.total+'</b></span><span>Entregues <b>'+k.entregues+'</b></span>'+(k.canceladas?'<span>Canceladas <b>'+k.canceladas+'</b></span>':'')
    + (k.incertas?'<span style="color:var(--alerta-texto)">Incertas <b>'+k.incertas+'</b>: o serviço caiu enquanto enviava; confira no celular</span>':'');
  $('kFila').textContent = k.naFila; $('kEnviadas').textContent = k.enviadas; $('kEntregues').textContent = k.entregues; $('kFalhas').textContent = k.falhas;
  $('kCanc').textContent = k.canceladas ? k.canceladas+' cancelada(s)' : 'recusadas pelo celular ou pela operadora';
  const f = filtro();
  const lista = d.mensagens.filter(m => f === 'todos' || (f === 'entregue' && m.entregue) || (f === 'falha' && m.falhou) || (f === 'pendente' && !m.final));
  $('tabela').querySelector('tbody').innerHTML = lista.map(m => '<tr><td>'+(m.linha??'')+'</td><td>'+esc(m.nome||'—')+'</td><td>'+esc(m.telefone)+'</td><td>'+(m.indiceTexto?'Mensagem '+m.indiceTexto:'Da planilha')+'</td><td>'+esc(m.chipRotulo||'')+'</td><td>'+badgeStatus(m)+(m.falhou && m.detalhe ? '<div class="dica">'+esc(m.detalhe)+'</div>' : '')+'</td><td>'+hora(m.historico.at(-1)?.em)+'</td></tr>').join('')
    || '<tr><td colspan="7" class="vazio">Nada neste filtro.</td></tr>';
}
async function carregar(){
  const r = await fetch('/api/disparos/'+ID);
  if (!r.ok) { $('dNome').textContent = 'Disparo não encontrado'; $('dInfo').textContent = 'Ele pode ter sido de antes do último reinício do serviço.'; return; }
  ultimo = await r.json(); pintar();
  const pendentes = ultimo.mensagens.some(m => !m.final);
  if (pendentes) timer = setTimeout(carregar, 2000);
}
document.querySelectorAll('input[name="filtro"]').forEach(x => x.addEventListener('change', pintar));
$('btnCancelar').addEventListener('click', async () => {
  const b = $('dAviso'); const r = await postJson('/api/disparos/'+ID+'/cancelar'); const c = await r.json();
  b.hidden = false; b.className = 'alerta-caixa ' + (r.ok ? 'alerta' : 'erro'); b.innerHTML = '<span>'+esc(c.mensagem)+'</span>';
  clearTimeout(timer); carregar();
});
$('btnExportar').addEventListener('click', () => {
  if (!ultimo) return;
  Planilha.baixarCsv('resultado-'+ultimo.nome.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.csv',
    [['linha','nome','telefone','texto','chip','status','detalhe','atualizado']].concat(ultimo.mensagens.map(m => [m.linha??'', m.nome||'', m.telefone, m.indiceTexto?'Mensagem '+m.indiceTexto:'Da planilha', m.chipRotulo||'', m.rotulo, m.detalhe||'', m.historico.at(-1)?.em||''])));
});
carregar();
`;
  return shell({ ...ctx, ativo: 'disparos', antetitulo: 'Disparos', titulo: 'Acompanhamento do disparo', sub: 'Atualiza sozinho a cada 2 s enquanto houver mensagem pendente.', corpo, script, extraHead: '<script src="/planilha.js"></script>' });
}

// ───────────── Envio avulso ─────────────
export function envioAvulso(ctx) {
  const corpo = `
  <div class="grade g2">
    <form class="card" id="form" novalidate>
      <h2>Enviar uma mensagem</h2>
      <div class="campo"><label for="telefone">Telefone</label><input id="telefone" inputmode="tel" autocomplete="off" placeholder="(11) 99999-1234" required><span class="dica">DDD e número. O 55 do Brasil entra sozinho.</span></div>
      <div class="campo"><label for="texto">Mensagem</label><textarea id="texto" maxlength="640" required>Recall: teste do servico de SMS.</textarea><div class="seg" id="seg"></div></div>
      <div class="campo"><span class="rotulo" id="rotChip">Por qual chip sai</span>
        <div class="segmentado" role="radiogroup" aria-labelledby="rotChip" id="chipsOpcoes"><label><input type="radio" name="chip" value="roleta" checked><span>Roleta</span></label></div>
        <span class="dica" id="chipsFonte">Lendo os chips…</span></div>
      <div id="erro" hidden></div>
      <div class="acoes"><button class="botao primario" id="btn" type="submit">${icone('disparo')}Enviar</button></div>
    </form>
    <section class="card" aria-live="polite">
      <h2>Status</h2>
      <div id="vazio" class="vazio">Nenhuma mensagem enviada ainda.</div>
      <div id="atual" hidden style="display:grid;gap:var(--space-4)"><div class="trilha" id="trilha"></div><div class="resultado" id="resultado"></div><ul class="eventos" id="hist"></ul></div>
    </section>
  </div>
  <section class="card neutro">
    <h2>Envios avulsos desta sessão</h2>
    <div id="listaVazia" class="vazio">Ainda nada por aqui.</div>
    <div class="tabela"><table id="lista" hidden><thead><tr><th>Hora</th><th>Telefone</th><th>Chip</th><th>SMS cobrados</th><th>Status</th></tr></thead><tbody></tbody></table></div>
  </section>`;
  const script = `
const ETAPAS = [['CRIADA','Na fila'],['ACEITA','Aceita'],['Sent','Enviada'],['Delivered','Entregue']];
const CHECK = ${JSON.stringify('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>')};
let atualId = null, timer = null;
function pintarSeg(){ $('seg').innerHTML = textoSegmentos($('texto').value); }
async function carregarChips(){
  try { const c = await (await fetch('/api/chips')).json();
    const esc0 = (document.querySelector('input[name="chip"]:checked')||{}).value || 'roleta';
    $('chipsOpcoes').innerHTML = '<label><input type="radio" name="chip" value="roleta"'+(esc0==='roleta'?' checked':'')+'><span>Roleta · '+c.chips.length+' chip(s)</span></label>' + c.chips.map(k => '<label><input type="radio" name="chip" value="'+esc(k.chave)+'"'+(esc0===k.chave?' checked':'')+'><span>'+esc(k.rotulo)+'</span></label>').join('');
    $('chipsFonte').textContent = c.chips.length ? 'Operadora e número vêm do próprio celular.' : 'Nenhum chip disponível. Veja Aparelhos e chips.'; }
  catch { $('chipsFonte').textContent = 'Não consegui ler os chips.'; }
}
function pintar(m){
  $('vazio').hidden = true; $('atual').hidden = false;
  const feitos = new Set(m.historico.map(h => h.status));
  $('trilha').innerHTML = ETAPAS.map(e => '<div class="etapa '+(feitos.has(e[0])?'feita':'')+'"><span class="bola">'+(feitos.has(e[0])?CHECK:'')+'</span>'+esc(e[1])+'</div>').join('');
  const r = $('resultado'); r.className = 'resultado' + (m.entregue ? ' sucesso' : (m.falhou ? ' erro' : ''));
  r.innerHTML = '<b>'+esc(m.rotulo)+'</b><span>Para '+esc(m.telefone)+' · '+m.segmentos+' SMS cobrado(s) · '+esc(m.alfabeto)+'</span><span>Saiu por: <b>'+esc(m.chipRotulo||'')+'</b></span>';
  $('hist').innerHTML = m.historico.map(h => '<li><time>'+hora(h.em)+'</time><span></span><span>'+esc(h.rotulo)+(h.detalhe?'<small>'+esc(h.detalhe)+'</small>':'')+'</span></li>').join('');
}
async function acompanhar(id){
  clearTimeout(timer); atualId = id; const ini = Date.now();
  const passo = async () => { if (atualId !== id) return; const r = await fetch('/api/mensagens/'+id); if (!r.ok) return; const m = await r.json(); pintar(m); carregarLista();
    if (!m.final && Date.now()-ini < 10*60*1000) timer = setTimeout(passo, 1500); };
  passo();
}
async function carregarLista(){
  const { data } = await (await fetch('/api/mensagens')).json();
  $('listaVazia').hidden = data.length > 0; $('lista').hidden = !data.length;
  $('lista').querySelector('tbody').innerHTML = data.map(m => '<tr class="clicavel" data-id="'+m.id+'"><td>'+hora(m.criadaEm)+'</td><td>'+esc(m.telefone)+'</td><td>'+esc(m.chipRotulo||'')+'</td><td>'+m.segmentos+'</td><td>'+badgeStatus(m)+'</td></tr>').join('');
}
$('lista').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) acompanhar(tr.dataset.id); });
$('form').addEventListener('submit', async (e) => {
  e.preventDefault(); const box = $('erro'); box.hidden = true; $('btn').disabled = true;
  try {
    const chip = (document.querySelector('input[name="chip"]:checked')||{}).value || 'roleta';
    const r = await postJson('/api/mensagens', { telefone: $('telefone').value, texto: $('texto').value, chip }); const c = await r.json();
    if (r.ok) acompanhar(c.id);
    else { box.className = 'alerta-caixa erro'; box.hidden = false; box.innerHTML = '<span>'+esc(c.mensagem)+'</span>'; if (c.detalhes && c.detalhes.mensagem) acompanhar(c.detalhes.mensagem.id); }
  } catch { box.className = 'alerta-caixa erro'; box.hidden = false; box.textContent = 'Não foi possível falar com o serviço.'; }
  finally { $('btn').disabled = false; }
});
$('texto').addEventListener('input', pintarSeg);
pintarSeg(); carregarChips(); carregarLista();
`;
  return shell({ ...ctx, ativo: 'avulso', antetitulo: 'Envio avulso', titulo: 'Envio avulso', sub: 'Uma mensagem para um número, para testar um chip ou confirmar um contato.', corpo, script });
}

// ───────────── Aparelhos e chips ─────────────
export function aparelhos(ctx) {
  const corpo = `
  <div id="aviso" hidden></div>
  <div class="grade g2" id="lista"><div class="card vazio">Lendo os celulares…</div></div>
  <section class="card neutro">
    <h2>Como ligar um celular</h2>
    <details><summary>Passo a passo (cabo USB + ADB)</summary>
      <ol class="apoio" style="display:grid;gap:var(--space-2);padding-left:var(--space-5)">
        <li>Instale o app <b>SMS Gateway for Android</b> pelo site <code>sms-gate.app</code>.</li>
        <li>Libere as permissões de SMS, telefone e notificações. Em Xiaomi, isso é feito pelo ADB.</li>
        <li>No app, ligue o <b>Local Server</b> e anote o usuário e a senha.</li>
        <li>Ligue o cabo e redirecione a porta: celular 1 em <code>127.0.0.1:8080</code>, celular 2 em <code>127.0.0.1:8081</code>.</li>
        <li>Preencha em <a href="/config">Configurações</a> e use <b>Testar conexão</b>.</li>
      </ol>
    </details>
  </section>`;
  const script = `
async function carregar(forcar){
  const a = await (await fetch('/api/aparelhos'+(forcar?'?atualizar=1':''))).json();
  $('lista').innerHTML = a.aparelhos.length ? a.aparelhos.map(x => '<article class="card"><div class="card-cab"><div style="display:grid;gap:var(--space-1)"><h2>'+esc(x.nome)+'</h2><span class="dica">'+esc(x.endereco||'simulado')+(x.versao?' · app '+esc(x.versao):'')+'</span></div><span class="badge '+(x.online?'sucesso':'erro')+'">'+(x.online?'Conectado':'Fora do ar')+'</span></div>'
    + (x.online ? '<div class="mini"><div><span>Bateria</span><b>'+(x.bateria??'—')+'%</b></div><div><span>Carregando</span><b>'+(x.carregando?'sim':'não')+'</b></div><div><span>Internet</span><b>'+(x.internet?'ok':'sem')+'</b></div><div><span>Falhas 1 h</span><b>'+(x.falhasUltimaHora??'—')+'</b></div></div>' : '<div class="alerta-caixa erro"><span>'+esc(x.motivo||'Sem resposta')+'. Confira o cabo, o redirecionamento da porta e se o app está Online.</span></div>')
    + '<div class="secao">Chips</div>' + (x.chips.length ? x.chips.map(c => '<div class="linha-info" style="justify-content:space-between"><span><b style="color:var(--texto-primario)">Chip '+c.chip+'</b> · '+esc(c.telefone)+'</span><span class="badge triagem">'+esc(c.operadora)+'</span></div>').join('') : '<span class="dica">Nenhum chip informado por este celular.</span>')
    + '</article>').join('') : '<div class="card vazio">Nenhum celular configurado. <a href="/config">Abrir Configurações</a></div>';
}
$('btnTestar').addEventListener('click', async () => {
  const b = $('aviso'); b.hidden = false; b.className = 'alerta-caixa info'; b.innerHTML = '<span>Testando os celulares…</span>';
  const c = await (await postJson('/api/aparelhos/testar')).json();
  b.className = 'alerta-caixa ' + (c.ok ? 'sucesso' : 'erro'); b.innerHTML = '<span>'+esc(c.mensagem)+'</span>'; carregar(true);
});
$('btnAtualizar').addEventListener('click', () => carregar(true));
carregar(false); setInterval(() => carregar(false), 15000);
`;
  return shell({
    ...ctx,
    ativo: 'aparelhos',
    antetitulo: 'Aparelhos e chips',
    titulo: 'Aparelhos e chips',
    sub: 'Cada celular, a saúde dele e os chips que ele informa. O teste de conexão não envia SMS.',
    acoes: `<button class="botao secundario pequeno" type="button" id="btnAtualizar">${icone('atualizar', 16)}Atualizar</button><button class="botao primario pequeno" type="button" id="btnTestar">${icone('atividade', 16)}Testar conexão</button>`,
    corpo,
    script,
  });
}

// ───────────── Logs ─────────────
export function logs(ctx) {
  const corpo = `
  <section class="card">
    <div class="grade g3">
      <div class="campo"><label for="fNivel">Nível</label><select id="fNivel"><option value="">Todos</option><option value="info">Info</option><option value="aviso">Aviso</option><option value="erro">Erro</option></select></div>
      <div class="campo"><label for="fChip">Chip</label><select id="fChip"><option value="">Todos os chips</option></select></div>
      <div class="campo"><label for="fBusca">Buscar no texto</label><input id="fBusca" placeholder="Ex.: falha, Celular 2, 9****-3395"></div>
    </div>
    <div class="acoes"><label class="dica" style="display:inline-flex;gap:var(--space-2);align-items:center;font-weight:400"><input type="checkbox" id="fAuto" checked style="width:auto;height:auto"> Atualizar sozinho (a cada 3 s)</label><button class="botao secundario pequeno" type="button" id="btnExportar">${icone('baixar', 16)}Exportar CSV</button><span class="dica" id="contagem"></span></div>
  </section>
  <section class="card neutro">
    <ul class="eventos" id="eventos"><li class="vazio" style="display:block">Carregando…</li></ul>
  </section>`;
  const script = `
let todos = []; let ultimo = 0;
function filtrados(){ const n = $('fNivel').value, c = $('fChip').value, b = $('fBusca').value.trim().toLowerCase();
  return todos.filter(e => (!n || e.nivel === n) && (!c || e.chip === c) && (!b || e.texto.toLowerCase().includes(b))); }
function pintar(){
  const lista = filtrados().slice().reverse();
  $('contagem').textContent = lista.length + ' evento(s)';
  $('eventos').innerHTML = lista.length ? lista.slice(0, 300).map(e => '<li><time>'+hora(e.em)+'</time><span>'+badgeNivel(e.nivel)+'</span><span>'+esc(e.texto)+(e.chipRotulo?'<small>'+esc(e.chipRotulo)+'</small>':'')+'</span></li>').join('') : '<li class="vazio" style="display:block">Nenhum evento neste filtro.</li>';
}
async function carregar(){
  const r = await (await fetch('/api/eventos?desde='+ultimo)).json();
  if (r.data.length) { todos = todos.concat(r.data).slice(-1000); ultimo = r.ultimo; pintar(); }
  else if (!todos.length) pintar();
}
async function chips(){ try { const c = await (await fetch('/api/chips')).json(); $('fChip').innerHTML = '<option value="">Todos os chips</option>' + c.chips.map(k => '<option value="'+esc(k.chave)+'">'+esc(k.rotulo)+'</option>').join(''); } catch {} }
['fNivel','fChip','fBusca'].forEach(id => $(id).addEventListener('input', pintar));
$('btnExportar').addEventListener('click', () => Planilha.baixarCsv('logs-servico-sms.csv', [['hora','nivel','evento','chip']].concat(filtrados().map(e => [e.em, e.nivel, e.texto, e.chipRotulo||'']))));
setInterval(() => { if ($('fAuto').checked) carregar(); }, 3000);
chips(); carregar();
`;
  return shell({ ...ctx, ativo: 'logs', antetitulo: 'Logs', titulo: 'Logs', sub: 'Tudo o que aconteceu desde que o serviço foi iniciado: envios, entregas, falhas, disparos, celulares e configuração. Telefones aparecem mascarados e o texto das mensagens nunca é registrado.', corpo, script, extraHead: '<script src="/planilha.js"></script>' });
}

// ───────────── Configurações ─────────────
export function configuracoes(ctx) {
  const corpo = `
  <div class="alerta-caixa info"><span>Os valores ficam no arquivo <code>.env</code> desta máquina e valem na hora, sem reiniciar. Senhas nunca voltam para a tela: aparece só o final. Para manter uma senha, deixe o campo em branco.</span></div>
  <form class="grade" id="form" novalidate style="gap:var(--space-6)">
    <section class="card"><span class="secao">Geral</span><h2>sms-gate</h2><div class="grade" id="g-geral" style="gap:var(--space-5)"></div></section>
    <div class="grade g2">
      <section class="card"><span class="secao">Aparelho</span><h2>Celular 1</h2><div class="grade" id="g-a1" style="gap:var(--space-5)"></div></section>
      <section class="card"><span class="secao">Aparelho (opcional)</span><h2>Celular 2</h2><div class="grade" id="g-a2" style="gap:var(--space-5)"></div></section>
    </div>
    <div id="aviso" hidden></div>
    <div class="acoes"><button class="botao primario" type="submit">Salvar</button><button class="botao secundario" type="button" id="btnTestar">${icone('atividade', 16)}Testar conexão</button></div>
  </form>`;
  const script = `
let CAMPOS = [];
function campoHtml(c){
  const id = 'f-'+c.chave; let entrada;
  if (c.opcoes) entrada = '<div class="segmentado" role="radiogroup" aria-label="'+esc(c.rotulo)+'">' + c.opcoes.map(o => '<label><input type="radio" name="'+c.chave+'" value="'+o+'"'+(c.valor===o?' checked':'')+'><span>'+(o==='cloud'?'Nuvem':'Local')+'</span></label>').join('') + '</div>';
  else if (c.segredo) entrada = '<input id="'+id+'" name="'+c.chave+'" type="password" autocomplete="new-password" placeholder="'+esc(c.preenchido ? 'Salva · termina em '+c.final+' (deixe em branco para manter)' : 'Não preenchida')+'">';
  else entrada = '<input id="'+id+'" name="'+c.chave+'" type="text" autocomplete="off" value="'+esc(c.valor)+'">';
  return '<div class="campo"><div class="acoes" style="justify-content:space-between"><label for="'+id+'">'+esc(c.rotulo)+'</label>'+(c.preenchido?'<span class="badge sucesso">Preenchido</span>':'<span class="badge neutro">Vazio</span>')+'</div>'+entrada+'<span class="dica">'+esc(c.dica||'')+'</span><span class="msg-erro" id="err-'+c.chave+'" hidden></span></div>';
}
function pintar(){ for (const g of ['geral','a1','a2']) $('g-'+g).innerHTML = CAMPOS.filter(c => c.grupo === g).map(campoHtml).join(''); }
function avisar(tipo, html){ const a = $('aviso'); a.hidden = false; a.className = 'alerta-caixa '+tipo; a.innerHTML = '<span>'+html+'</span>'; }
async function carregar(){ CAMPOS = (await (await fetch('/api/config')).json()).campos; pintar(); }
$('form').addEventListener('submit', async (e) => {
  e.preventDefault(); const dados = {};
  for (const c of CAMPOS) dados[c.chave] = c.opcoes ? ((document.querySelector('[name="'+c.chave+'"]:checked')||{}).value || c.opcoes[0]) : document.querySelector('[name="'+c.chave+'"]').value;
  document.querySelectorAll('.msg-erro').forEach(x => x.hidden = true);
  const r = await postJson('/api/config', dados); const c = await r.json();
  if (r.ok) { CAMPOS = c.campos; pintar(); avisar('sucesso', 'Configuração salva. Use Testar conexão para conferir os celulares.'); }
  else { for (const [k, m] of Object.entries((c.detalhes||{}).erros||{})) { const el = $('err-'+k); if (el) { el.hidden = false; el.textContent = m; } } avisar('erro', esc(c.mensagem)); }
});
$('btnTestar').addEventListener('click', async () => { avisar('info', 'Testando os celulares…'); const c = await (await postJson('/api/aparelhos/testar')).json(); avisar(c.ok ? 'sucesso' : 'erro', esc(c.mensagem)); });
carregar();
`;
  return shell({ ...ctx, ativo: 'config', antetitulo: 'Configurações', titulo: 'Configurações', sub: 'O endereço, o usuário e a senha do app sms-gate em cada celular.', corpo, script });
}
