// Servidor HTTP: telas (renderizadas no servidor) + API JSON. Zod valida tudo que entra.
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { config } from './config.js';
import { prisma } from './db.js';
import { conferir, gerarHash } from './auth/senha.js';
import { COOKIE, criarSessao, encerrarSessao, encerrarSessoesDoUsuario, usuarioDaSessao } from './auth/sessao.js';
import { alternarChip, chipsDisponiveis, criarAparelho, editarAparelho, listarAparelhos, testarAparelho } from './servicos/aparelhos.js';
import { ErroNegocio, LIMITES, cancelarDisparo, criarDisparo, detalheDisparo, listarDisparos, resumoDisparo } from './servicos/disparos.js';
import { registrarEvento, rotuloChip } from './servicos/eventos.js';
import { inicioDeHoje } from './lib/tempo.js';
import * as paginas from './web/paginas.js';

const erro = (reply, status, codigo, mensagem, detalhes = {}) => reply.code(status).send({ codigo, mensagem, detalhes });

// ── Esquemas de entrada ──
const id = z.coerce.number().int().positive();
const paginacao = z.object({ page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) });
const url = z.string().trim().url().max(200).refine((u) => /^https?:\/\//.test(u), 'use http:// ou https://');
const esquemas = {
  login: z.object({ email: z.string().trim().toLowerCase().email().max(120), senha: z.string().min(1).max(200) }),
  aparelhoNovo: z.object({ nome: z.string().trim().min(1).max(60), url, usuario: z.string().trim().min(1).max(100), senha: z.string().min(1).max(200) }),
  aparelhoEdicao: z.object({ nome: z.string().trim().min(1).max(60).optional(), url: url.optional(), usuario: z.string().trim().min(1).max(100).optional(), senha: z.string().max(200).optional(), ativo: z.boolean().optional() }),
  chip: z.object({ ativo: z.boolean() }),
  disparo: z.object({
    nome: z.string().max(80).optional(),
    contatos: z
      .array(z.object({ linha: z.number().int().positive().optional(), telefone: z.union([z.string().max(40), z.number()]), nome: z.string().max(200).optional().nullable(), mensagem: z.string().max(2000).optional().nullable() }))
      .min(1, 'A planilha não tem nenhum contato.')
      .max(LIMITES.contatos, `Cada disparo vai até ${LIMITES.contatos} contatos.`),
    mensagens: z.array(z.string().max(LIMITES.caracteres)).max(LIMITES.modelos, `Use até ${LIMITES.modelos} mensagens na roleta.`).default([]),
    intervaloMinSegundos: z.number().min(LIMITES.intervaloMin).max(LIMITES.intervaloMax).default(45),
    intervaloMaxSegundos: z.number().min(LIMITES.intervaloMin).max(LIMITES.intervaloMax).default(80),
  }),
  eventos: paginacao.extend({ size: z.coerce.number().int().min(1).max(200).default(50), nivel: z.enum(['INFO', 'AVISO', 'ERRO']).optional() }),
  usuarioNovo: z.object({ nome: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email().max(120), papel: z.enum(['ADMIN', 'OPERADOR']), senha: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(200) }),
  usuarioEdicao: z.object({ nome: z.string().trim().min(1).max(80).optional(), papel: z.enum(['ADMIN', 'OPERADOR']).optional(), ativo: z.boolean().optional(), senha: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(200).optional() }),
};

const SELECT_USUARIO = { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true };

// Login: no máximo 10 tentativas erradas por IP em 10 minutos.
const tentativas = new Map();
function bloqueado(ip) {
  const t = tentativas.get(ip);
  return t && t.n >= 10 && Date.now() - t.desde < 600_000;
}
function errou(ip) {
  const t = tentativas.get(ip);
  if (!t || Date.now() - t.desde > 600_000) tentativas.set(ip, { n: 1, desde: Date.now() });
  else t.n += 1;
}

export async function criarApp({ logger = false } = {}) {
  const app = Fastify({ logger, bodyLimit: 2 * 1024 * 1024, trustProxy: false });
  await app.register(cookie);

  // Valida com Zod; erro de validação vira 422 no formato padrão.
  const validar = (esquema, dados, reply) => {
    const r = esquema.safeParse(dados ?? {});
    if (r.success) return r.data;
    const primeiro = r.error.issues[0];
    erro(reply, 422, 'DADOS_INVALIDOS', primeiro?.message ?? 'Dados inválidos.', { campos: r.error.issues.map((i) => ({ campo: i.path.join('.'), motivo: i.message })) });
    return null;
  };

  // ── Travas: sessão, papel e origem ──
  app.decorateRequest('usuario', null);
  app.addHook('preHandler', async (req, reply) => {
    req.usuario = await usuarioDaSessao(req.cookies[COOKIE]);
    // Mudança de estado só com JSON e da própria origem: outro site aberto no navegador não consegue disparar.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origem = req.headers.origin;
      if (origem && origem !== `http://${req.headers.host}` && origem !== `https://${req.headers.host}`) return erro(reply, 403, 'ORIGEM_NAO_PERMITIDA', 'Origem não permitida.');
      if (req.body !== undefined && !String(req.headers['content-type'] ?? '').startsWith('application/json')) return erro(reply, 415, 'TIPO_NAO_ACEITO', 'Envie JSON.');
    }
  });
  const exigeLogin = async (req, reply) => {
    if (!req.usuario) return erro(reply, 401, 'NAO_AUTENTICADO', 'Entre de novo.');
  };
  const exigeAdmin = async (req, reply) => {
    if (!req.usuario) return erro(reply, 401, 'NAO_AUTENTICADO', 'Entre de novo.');
    if (req.usuario.papel !== 'ADMIN') return erro(reply, 403, 'SEM_PERMISSAO', 'Só administradores podem fazer isso.');
  };

  app.setErrorHandler((e, req, reply) => {
    if (e instanceof ErroNegocio) return erro(reply, e.status, e.codigo, e.message, e.detalhes);
    if (e instanceof z.ZodError) return erro(reply, 422, 'DADOS_INVALIDOS', e.issues[0]?.message ?? 'Dados inválidos.');
    if (e.code === 'P2002') return erro(reply, 409, 'JA_EXISTE', 'Já existe um cadastro com esse valor.');
    if (e.code === 'P2025') return erro(reply, 404, 'NAO_ENCONTRADO', 'Registro não encontrado.');
    if (e.statusCode && e.statusCode < 500) return erro(reply, e.statusCode, 'REQUISICAO_INVALIDA', 'Requisição inválida.');
    req.log?.error?.(e);
    console.error(JSON.stringify({ em: new Date().toISOString(), nivel: 'error', evento: 'http.erro', erro: e.message }));
    return erro(reply, 500, 'ERRO_INTERNO', 'Erro interno. Tente de novo.');
  });

  // ── Saúde e arquivos ──
  app.get('/health', async (req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
  const publico = join(import.meta.dirname, 'web', 'public');
  for (const [arquivo, tipo] of [['tokens.css', 'text/css; charset=utf-8'], ['planilha.js', 'text/javascript; charset=utf-8']])
    app.get(`/public/${arquivo}`, async (req, reply) => reply.type(tipo).header('Cache-Control', 'public, max-age=300').send(await readFile(join(publico, arquivo))));

  // ── Telas ──
  const tela = (fn, { admin = false } = {}) => async (req, reply) => {
    if (!req.usuario) return reply.redirect('/login');
    if (admin && req.usuario.papel !== 'ADMIN') return reply.redirect('/');
    return reply.type('text/html; charset=utf-8').header('Cache-Control', 'no-store').send(fn({ usuario: req.usuario, limites: LIMITES, id: req.params?.id ? Number(req.params.id) : undefined }));
  };
  app.get('/login', async (req, reply) => (req.usuario ? reply.redirect('/') : reply.type('text/html; charset=utf-8').send(paginas.paginaLogin())));
  app.get('/', tela(paginas.visaoGeral));
  app.get('/disparos', tela(paginas.listaDisparos));
  app.get('/disparos/novo', tela(paginas.novoDisparo));
  app.get('/disparos/:id', async (req, reply) => (id.safeParse(req.params.id).success ? tela(paginas.detalheDisparo)(req, reply) : reply.redirect('/disparos')));
  app.get('/aparelhos', tela(paginas.aparelhos));
  app.get('/logs', tela(paginas.logs));
  app.get('/usuarios', tela(paginas.usuarios, { admin: true }));

  // ── Login ──
  app.post('/api/login', async (req, reply) => {
    if (bloqueado(req.ip)) return erro(reply, 429, 'MUITAS_TENTATIVAS', 'Muitas tentativas. Espere alguns minutos.');
    const d = validar(esquemas.login, req.body, reply);
    if (!d) return;
    const u = await prisma.usuario.findUnique({ where: { email: d.email } });
    if (!u || !u.ativo || !(await conferir(d.senha, u.senhaHash))) {
      errou(req.ip);
      return erro(reply, 401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
    }
    tentativas.delete(req.ip);
    const s = await criarSessao(u.id);
    reply.setCookie(COOKIE, s.token, { httpOnly: true, sameSite: 'lax', path: '/', expires: s.expiraEm, secure: req.protocol === 'https' });
    await registrarEvento({ tipo: 'login', texto: `${u.nome} entrou.`, usuarioId: u.id });
    return { id: u.id, nome: u.nome, papel: u.papel };
  });
  app.post('/api/logout', async (req, reply) => {
    await encerrarSessao(req.cookies[COOKIE]);
    reply.clearCookie(COOKIE, { path: '/' });
    return reply.code(204).send();
  });
  app.get('/api/eu', { preHandler: exigeLogin }, async (req) => req.usuario);

  // ── Painel ──
  app.get('/api/painel', { preHandler: exigeLogin }, async () => {
    const hoje = inicioDeHoje();
    const [grupos, porChip, chips, ultimos, eventos, pendentes] = await Promise.all([
      prisma.mensagem.groupBy({ by: ['status'], where: { enviandoEm: { gte: hoje } }, _count: { _all: true } }),
      prisma.mensagem.groupBy({ by: ['chipId', 'status'], where: { enviandoEm: { gte: hoje }, chipId: { not: null } }, _count: { _all: true } }),
      prisma.chip.findMany({ include: { aparelho: { select: { nome: true, ativo: true, online: true, bateria: true } } }, orderBy: [{ aparelhoId: 'asc' }, { simNumero: 'asc' }] }),
      listarDisparos({ page: 1, size: 5 }),
      prisma.evento.findMany({ orderBy: { id: 'desc' }, take: 10, include: { chip: { include: { aparelho: { select: { nome: true } } } }, usuario: { select: { nome: true } } } }),
      prisma.mensagem.count({ where: { status: 'PENDENTE' } }),
    ]);
    const n = (lista, f) => lista.filter(f).reduce((t, g) => t + g._count._all, 0);
    const entregues = n(grupos, (g) => g.status === 'ENTREGUE');
    const falhas = n(grupos, (g) => g.status === 'FALHOU');
    return {
      hoje: {
        total: n(grupos, () => true),
        entregues,
        falhas,
        aguardando: n(grupos, (g) => ['ENVIANDO', 'ACEITA', 'ENVIADA'].includes(g.status)),
        incertas: n(grupos, (g) => g.status === 'INCERTA'),
        taxaEntrega: entregues + falhas ? Math.round((entregues / (entregues + falhas)) * 100) : null,
      },
      fila: { pendentes },
      chips: chips.map((c) => {
        const meus = porChip.filter((g) => g.chipId === c.id);
        return {
          id: c.id, rotulo: rotuloChip(c), aparelho: c.aparelho.nome, simNumero: c.simNumero, operadora: c.operadora, telefone: c.telefone,
          ativo: c.ativo && c.aparelho.ativo, presente: c.presente, online: c.aparelho.online, bateria: c.aparelho.bateria,
          hoje: { total: n(meus, () => true), entregues: n(meus, (g) => g.status === 'ENTREGUE'), falhas: n(meus, (g) => g.status === 'FALHOU') },
        };
      }),
      disparos: ultimos.data,
      eventos: eventos.map(dtoEvento),
    };
  });

  // ── Celulares e chips ──
  app.get('/api/aparelhos', { preHandler: exigeLogin }, async () => ({ data: await listarAparelhos() }));
  app.get('/api/chips', { preHandler: exigeLogin }, async () => ({ data: await chipsDisponiveis() }));
  app.post('/api/aparelhos', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.aparelhoNovo, req.body, reply);
    if (d) return reply.code(201).send(await criarAparelho(d, req.usuario.id));
  });
  app.put('/api/aparelhos/:id', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.aparelhoEdicao, req.body, reply);
    if (d) return editarAparelho(id.parse(req.params.id), d, req.usuario.id);
  });
  app.post('/api/aparelhos/:id/testar', { preHandler: exigeLogin }, async (req, reply) => {
    const r = await testarAparelho(id.parse(req.params.id), req.usuario.id);
    return r ?? erro(reply, 404, 'NAO_ENCONTRADO', 'Celular não encontrado.');
  });
  app.patch('/api/chips/:id', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.chip, req.body, reply);
    if (d) return alternarChip(id.parse(req.params.id), d.ativo, req.usuario.id);
  });

  // ── Disparos ──
  app.get('/api/disparos', { preHandler: exigeLogin }, async (req, reply) => {
    const p = validar(paginacao, req.query, reply);
    if (p) return listarDisparos(p);
  });
  app.post('/api/disparos', { preHandler: exigeLogin }, async (req, reply) => {
    const d = validar(esquemas.disparo, req.body, reply);
    if (d) return reply.code(202).send(await criarDisparo(d, req.usuario));
  });
  app.get('/api/disparos/:id', { preHandler: exigeLogin }, async (req, reply) => (await detalheDisparo(id.parse(req.params.id))) ?? erro(reply, 404, 'NAO_ENCONTRADO', 'Disparo não encontrado.'));
  app.post('/api/disparos/:id/cancelar', { preHandler: exigeLogin }, async (req, reply) => reply.code(202).send(await cancelarDisparo(id.parse(req.params.id), req.usuario)));

  // ── Logs ──
  app.get('/api/eventos', { preHandler: exigeLogin }, async (req, reply) => {
    const p = validar(esquemas.eventos, req.query, reply);
    if (!p) return;
    const where = p.nivel ? { nivel: p.nivel } : {};
    const [total, lista] = await Promise.all([
      prisma.evento.count({ where }),
      prisma.evento.findMany({ where, orderBy: { id: 'desc' }, skip: (p.page - 1) * p.size, take: p.size, include: { chip: { include: { aparelho: { select: { nome: true } } } }, usuario: { select: { nome: true } } } }),
    ]);
    return { data: lista.map(dtoEvento), page: p.page, size: p.size, total };
  });

  // ── Usuários (ADMIN) ──
  app.get('/api/usuarios', { preHandler: exigeAdmin }, async () => ({ data: await prisma.usuario.findMany({ select: SELECT_USUARIO, orderBy: { nome: 'asc' } }) }));
  app.post('/api/usuarios', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.usuarioNovo, req.body, reply);
    if (!d) return;
    const u = await prisma.usuario.create({ data: { nome: d.nome, email: d.email, papel: d.papel, senhaHash: await gerarHash(d.senha) }, select: SELECT_USUARIO });
    await registrarEvento({ tipo: 'usuario', texto: `${req.usuario.nome} criou o usuário ${u.nome} (${u.papel}).`, usuarioId: req.usuario.id });
    return reply.code(201).send(u);
  });
  app.put('/api/usuarios/:id', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.usuarioEdicao, req.body, reply);
    if (!d) return;
    const alvo = id.parse(req.params.id);
    if (alvo === req.usuario.id && (d.ativo === false || d.papel === 'OPERADOR')) return erro(reply, 422, 'PROPRIO_USUARIO', 'Você não pode desativar nem rebaixar o seu próprio usuário.');
    const data = { ...d };
    delete data.senha;
    if (d.senha) data.senhaHash = await gerarHash(d.senha);
    const u = await prisma.usuario.update({ where: { id: alvo }, data, select: SELECT_USUARIO });
    if (d.senha || d.ativo === false) await encerrarSessoesDoUsuario(alvo);
    await registrarEvento({ tipo: 'usuario', texto: `${req.usuario.nome} editou o usuário ${u.nome}${d.senha ? ' (senha trocada)' : ''}.`, usuarioId: req.usuario.id });
    return u;
  });

  return app;
}

function dtoEvento(e) {
  return { id: e.id, tipo: e.tipo, nivel: e.nivel, texto: e.texto, criadoEm: e.criadoEm, chip: rotuloChip(e.chip), disparoId: e.disparoId, usuario: e.usuario?.nome ?? null };
}

/** Cria o primeiro administrador pelo .env, só se o banco ainda não tem nenhum usuário. */
export async function garantirAdmin() {
  if ((await prisma.usuario.count()) > 0) return false;
  const { email, nome, senha } = config.admin;
  if (!email || !senha || senha.length < 8) throw new Error('Nenhum usuário no banco: defina ADMIN_EMAIL e ADMIN_SENHA (8+ caracteres) no .env para criar o primeiro administrador.');
  await prisma.usuario.create({ data: { email: email.trim().toLowerCase(), nome, papel: 'ADMIN', senhaHash: await gerarHash(senha) } });
  await registrarEvento({ tipo: 'usuario', texto: `Primeiro administrador criado (${nome}).` });
  return true;
}

export { resumoDisparo };
