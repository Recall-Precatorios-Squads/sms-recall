// Servidor HTTP: telas (renderizadas no servidor), API interna /api (sessão) e API /v1 (chave de time).
import cookie from '@fastify/cookie';
import { Prisma } from '@prisma/client';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { config, janelaAberta } from './config.js';
import { prisma } from './db.js';
import { conferir, gerarHash } from './auth/senha.js';
import { COOKIE, criarSessao, encerrarSessao, encerrarSessoesDoUsuario, usuarioDaSessao } from './auth/sessao.js';
import { inicioDeHoje } from './lib/tempo.js';
import { rotasV1 } from './rotas/v1.js';
import { chipsDisponiveis, cotaEfetiva, sinalDoChip, criarAparelho, editarAparelho, editarChip, enviadosHojePorChip, listarAparelhos, testarAparelho } from './servicos/aparelhos.js';
import { bloquear, criarTime, desbloquear, editarTime, listarBloqueios, listarTimes, trocarChave } from './servicos/cadastros.js';
import { LIMITES, cancelarDisparo, criarDisparo, detalheDisparo, listarDisparos } from './servicos/disparos.js';
import { TIPOS_ALERTA, registrarEvento, rotuloChip } from './servicos/eventos.js';
import { ErroNegocio, listarRevisao, marcarEnviada, reprocessar } from './servicos/mensagens.js';
import { metricaResposta, ultimasRespostas } from './servicos/respostas.js';
import * as paginas from './web/paginas.js';

type Usuario = NonNullable<Awaited<ReturnType<typeof usuarioDaSessao>>>;
declare module 'fastify' {
  interface FastifyRequest {
    usuario: Usuario | null;
  }
}

const erro = (reply: FastifyReply, status: number, codigo: string, mensagem: string, detalhes: Record<string, unknown> = {}) => reply.code(status).send({ codigo, mensagem, detalhes });

// ── Esquemas de entrada ──
const idParam = z.coerce.number().int().positive();
const paginacao = z.object({ page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20) });
const url = z.string().trim().url().max(300).refine((u) => /^https?:\/\//.test(u), 'use http:// ou https://');
const senhaForte = z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(200);
const esquemas = {
  login: z.object({ email: z.string().trim().toLowerCase().email().max(120), senha: z.string().min(1).max(200) }),
  aparelhoNovo: z.object({ nome: z.string().trim().min(1).max(60), url, usuario: z.string().trim().min(1).max(100), senha: z.string().min(1).max(200) }),
  aparelhoEdicao: z.object({ nome: z.string().trim().min(1).max(60).optional(), url: url.optional(), usuario: z.string().trim().min(1).max(100).optional(), senha: z.string().max(200).optional(), ativo: z.boolean().optional() }),
  chip: z.object({ ativo: z.boolean().optional(), cotaDiaria: z.number().int().min(0).max(5000).nullable().optional() }).refine((d) => d.ativo !== undefined || d.cotaDiaria !== undefined, 'Nada para alterar.'),
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
  revisao: paginacao.extend({ size: z.coerce.number().int().min(1).max(200).default(50), status: z.enum(['FALHOU', 'INCERTA']).default('FALHOU') }),
  bloqueiosLista: paginacao.extend({ size: z.coerce.number().int().min(1).max(200).default(50), busca: z.string().max(20).optional() }),
  bloqueio: z.object({ telefones: z.array(z.string().max(40)).min(1, 'Informe pelo menos um telefone.').max(5000), motivo: z.string().trim().min(1).max(80) }),
  timeNovo: z.object({ nome: z.string().trim().min(1).max(60), cotaDiaria: z.number().int().min(1).max(100_000).default(1000), prioridade: z.number().int().min(0).max(10).default(0), webhookUrl: url.optional().nullable() }),
  timeEdicao: z.object({ nome: z.string().trim().min(1).max(60).optional(), cotaDiaria: z.number().int().min(1).max(100_000).optional(), prioridade: z.number().int().min(0).max(10).optional(), ativo: z.boolean().optional(), webhookUrl: url.nullable().optional().or(z.literal('').transform(() => null)) }),
  usuarioNovo: z.object({ nome: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email().max(120), papel: z.enum(['ADMIN', 'OPERADOR']), senha: senhaForte }),
  usuarioEdicao: z.object({ nome: z.string().trim().min(1).max(80).optional(), papel: z.enum(['ADMIN', 'OPERADOR']).optional(), ativo: z.boolean().optional(), senha: senhaForte.optional() }),
};

const SELECT_USUARIO = { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true } as const;
const TENTATIVAS_LOGIN = 10;
const JANELA_LOGIN_MS = 600_000;

export async function criarApp({ logger = false }: { logger?: boolean } = {}) {
  const app = Fastify({
    logger,
    bodyLimit: 2 * 1024 * 1024,
    // Correlação: aceita o X-Request-Id de quem chamou ou cria um; volta em toda resposta.
    genReqId: (req) => {
      const r = req.headers['x-request-id'];
      return typeof r === 'string' && /^[\w.-]{1,100}$/.test(r) ? r : randomUUID();
    },
  });
  await app.register(cookie);
  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Request-Id', req.id);
  });

  // Valida com Zod; erro de validação vira 422 no formato padrão.
  function validar<T extends z.ZodTypeAny>(esquema: T, dados: unknown, reply: FastifyReply): z.infer<T> | null {
    const r = esquema.safeParse(dados ?? {});
    if (r.success) return r.data as z.infer<T>;
    erro(reply, 422, 'DADOS_INVALIDOS', r.error.issues[0]?.message ?? 'Dados inválidos.', { campos: r.error.issues.map((i) => ({ campo: i.path.join('.'), motivo: i.message })) });
    return null;
  }

  // ── Travas: sessão e origem ──
  app.decorateRequest('usuario', null);
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url.startsWith('/v1/')) return; // API dos times: autenticação própria (X-Api-Key)
    req.usuario = await usuarioDaSessao(req.cookies[COOKIE]);
    // Mudança de estado só com JSON e da própria origem: outro site aberto no navegador não consegue disparar.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origem = req.headers.origin;
      if (origem && origem !== `http://${req.headers.host}` && origem !== `https://${req.headers.host}`) return erro(reply, 403, 'ORIGEM_NAO_PERMITIDA', 'Origem não permitida.');
      if (req.body !== undefined && !String(req.headers['content-type'] ?? '').startsWith('application/json')) return erro(reply, 415, 'TIPO_NAO_ACEITO', 'Envie JSON.');
    }
  });
  const exigeLogin = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.usuario) return erro(reply, 401, 'NAO_AUTENTICADO', 'Entre de novo.');
  };
  const exigeAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.usuario) return erro(reply, 401, 'NAO_AUTENTICADO', 'Entre de novo.');
    if (req.usuario.papel !== 'ADMIN') return erro(reply, 403, 'SEM_PERMISSAO', 'Só administradores podem fazer isso.');
  };
  const eu = (req: FastifyRequest): Usuario => req.usuario as Usuario;
  const id = (req: FastifyRequest): number => idParam.parse((req.params as { id: string }).id);

  app.setErrorHandler((e: Error & { code?: string; statusCode?: number }, req, reply) => {
    if (e instanceof ErroNegocio) return erro(reply, e.status, e.codigo, e.message, e.detalhes);
    if (e instanceof z.ZodError) return erro(reply, 422, 'DADOS_INVALIDOS', e.issues[0]?.message ?? 'Dados inválidos.');
    if (e.code === 'P2002') return erro(reply, 409, 'JA_EXISTE', 'Já existe um cadastro com esse valor.');
    if (e.code === 'P2025') return erro(reply, 404, 'NAO_ENCONTRADO', 'Registro não encontrado.');
    if (e.statusCode && e.statusCode < 500) return erro(reply, e.statusCode, 'REQUISICAO_INVALIDA', 'Requisição inválida.');
    console.error(JSON.stringify({ em: new Date().toISOString(), nivel: 'error', evento: 'http.erro', requestId: req.id, erro: e.message }));
    return erro(reply, 500, 'ERRO_INTERNO', 'Erro interno. Tente de novo.', { requestId: req.id });
  });

  // ── Saúde e arquivos ──
  const estadoWorker = async () => {
    const b = await prisma.batidaWorker.findFirst({ orderBy: { ultimaEm: 'desc' } });
    return { vivo: !!b && Date.now() - b.ultimaEm.getTime() < 60_000, ultimaBatidaEm: b?.ultimaEm ?? null };
  };
  app.get('/health', async (req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, worker: await estadoWorker() };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });
  const publico = join(import.meta.dirname, 'web', 'public');
  for (const [arquivo, tipo] of [
    ['tokens.css', 'text/css; charset=utf-8'],
    ['planilha.js', 'text/javascript; charset=utf-8'],
  ] as const)
    app.get(`/public/${arquivo}`, async (req, reply) => reply.type(tipo).header('Cache-Control', 'public, max-age=300').send(await readFile(join(publico, arquivo))));

  // ── Telas ──
  const tela =
    (fn: (ctx: paginas.Ctx) => string, { admin = false } = {}) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.usuario) return reply.redirect('/login');
      if (admin && req.usuario.papel !== 'ADMIN') return reply.redirect('/');
      const p = req.params as { id?: string };
      return reply
        .type('text/html; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .send(fn({ usuario: req.usuario, limites: LIMITES, celularUrlPadrao: config.celularUrlPadrao, id: p.id ? Number(p.id) : undefined }));
    };
  app.get('/login', async (req, reply) => (req.usuario ? reply.redirect('/') : reply.type('text/html; charset=utf-8').send(paginas.paginaLogin())));
  app.get('/', tela(paginas.visaoGeral));
  app.get('/disparos', tela(paginas.listaDisparos));
  app.get('/disparos/novo', tela(paginas.novoDisparo));
  app.get('/disparos/:id', async (req, reply) => (idParam.safeParse((req.params as { id: string }).id).success ? tela(paginas.detalheDisparo)(req, reply) : reply.redirect('/disparos')));
  app.get('/revisao', tela(paginas.revisao));
  app.get('/aparelhos', tela(paginas.aparelhos));
  app.get('/bloqueios', tela(paginas.bloqueios));
  app.get('/logs', tela(paginas.logs));
  app.get('/usuarios', tela(paginas.usuarios, { admin: true }));
  app.get('/times', tela(paginas.times, { admin: true }));

  // ── Login (limite por IP guardado no banco: vale para todas as réplicas) ──
  app.post('/api/login', async (req, reply) => {
    const desde = new Date(Date.now() - JANELA_LOGIN_MS);
    if ((await prisma.tentativaLogin.count({ where: { ip: req.ip, criadoEm: { gte: desde } } })) >= TENTATIVAS_LOGIN) return erro(reply, 429, 'MUITAS_TENTATIVAS', 'Muitas tentativas. Espere alguns minutos.');
    const d = validar(esquemas.login, req.body, reply);
    if (!d) return;
    const u = await prisma.usuario.findUnique({ where: { email: d.email } });
    if (!u || !u.ativo || !(await conferir(d.senha, u.senhaHash))) {
      await prisma.tentativaLogin.create({ data: { ip: req.ip } });
      await prisma.tentativaLogin.deleteMany({ where: { criadoEm: { lt: new Date(Date.now() - 24 * 3_600_000) } } });
      return erro(reply, 401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
    }
    await prisma.tentativaLogin.deleteMany({ where: { ip: req.ip } });
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
    const [grupos, porChip, chips, ultimos, eventos, pendentes, worker, falhas, incertas, respostasHoje, respostas] = await Promise.all([
      prisma.mensagem.groupBy({ by: ['status'], where: { enviandoEm: { gte: hoje } }, _count: { _all: true } }),
      prisma.mensagem.groupBy({ by: ['chipId', 'status'], where: { enviandoEm: { gte: hoje }, chipId: { not: null } }, _count: { _all: true } }),
      prisma.chip.findMany({ include: { aparelho: { select: { nome: true, ativo: true, online: true, bateria: true } } }, orderBy: [{ aparelhoId: 'asc' }, { simNumero: 'asc' }] }),
      listarDisparos({ page: 1, size: 5 }),
      prisma.evento.findMany({ orderBy: { id: 'desc' }, take: 10, include: { chip: { include: { aparelho: { select: { nome: true } } } }, usuario: { select: { nome: true } } } }),
      prisma.mensagem.count({ where: { status: 'PENDENTE' } }),
      estadoWorker(),
      prisma.mensagem.count({ where: { status: 'FALHOU' } }),
      prisma.mensagem.count({ where: { status: 'INCERTA' } }),
      metricaResposta(Prisma.sql`m.enviando_em >= ${hoje}`),
      ultimasRespostas(8),
    ]);
    type G = { status: string; _count: { _all: number } };
    const n = (lista: G[], f: (g: G) => boolean) => lista.filter(f).reduce((t, g) => t + g._count._all, 0);
    const entregues = n(grupos, (g) => g.status === 'ENTREGUE' || g.status === 'SEM_CONFIRMACAO');
    const qtdFalhas = n(grupos, (g) => g.status === 'FALHOU');
    return {
      hoje: {
        total: n(grupos, () => true),
        entregues,
        falhas: qtdFalhas,
        aguardando: n(grupos, (g) => ['ENVIANDO', 'ACEITA', 'ENVIADA'].includes(g.status)),
        incertas: n(grupos, (g) => g.status === 'INCERTA'),
        taxaEntrega: entregues + qtdFalhas ? Math.round((entregues / (entregues + qtdFalhas)) * 100) : null,
        respostas: respostasHoje,
      },
      respostas,
      fila: { pendentes },
      janela: { inicio: config.janela.inicio, fim: config.janela.fim, aberta: janelaAberta() },
      worker,
      revisao: { falhas, incertas },
      chips: chips.map((c) => {
        const meus = porChip.filter((g) => g.chipId === c.id);
        const total = n(meus, () => true);
        const cota = cotaEfetiva(c);
        return {
          id: c.id,
          rotulo: rotuloChip(c),
          aparelho: c.aparelho.nome,
          simNumero: c.simNumero,
          operadora: c.operadora,
          telefone: c.telefone,
          ativo: c.ativo && c.aparelho.ativo,
          presente: c.presente,
          online: c.aparelho.online,
          bateria: c.aparelho.bateria,
          cota,
          cotaAtingida: total >= cota,
          sinal: sinalDoChip(c, c.aparelho),
          hoje: { total, entregues: n(meus, (g) => g.status === 'ENTREGUE' || g.status === 'SEM_CONFIRMACAO'), falhas: n(meus, (g) => g.status === 'FALHOU') },
        };
      }),
      disparos: ultimos.data,
      eventos: eventos.map(dtoEvento),
    };
  });

  // ── Celulares e chips ──
  app.get('/api/aparelhos', { preHandler: exigeLogin }, async () => ({ data: await listarAparelhos() }));
  app.get('/api/chips', { preHandler: exigeLogin }, async () => {
    const [lista, hoje] = await Promise.all([chipsDisponiveis(), enviadosHojePorChip()]);
    return { data: lista.map((c) => ({ ...c, enviadosHoje: hoje.get(c.id) ?? 0 })) };
  });
  app.post('/api/aparelhos', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.aparelhoNovo, req.body, reply);
    if (d) return reply.code(201).send(await criarAparelho(d, eu(req).id));
  });
  app.put('/api/aparelhos/:id', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.aparelhoEdicao, req.body, reply);
    if (d) return editarAparelho(id(req), d, eu(req).id);
  });
  app.post('/api/aparelhos/:id/testar', { preHandler: exigeLogin }, async (req, reply) => (await testarAparelho(id(req), eu(req).id)) ?? erro(reply, 404, 'NAO_ENCONTRADO', 'Celular não encontrado.'));
  app.patch('/api/chips/:id', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.chip, req.body, reply);
    if (d) return editarChip(id(req), d, eu(req).id);
  });

  // ── Disparos ──
  app.get('/api/disparos', { preHandler: exigeLogin }, async (req, reply) => {
    const p = validar(paginacao, req.query, reply);
    if (p) return listarDisparos(p);
  });
  app.post('/api/disparos', { preHandler: exigeLogin }, async (req, reply) => {
    const d = validar(esquemas.disparo, req.body, reply);
    if (d) return reply.code(202).send(await criarDisparo(d, { usuario: eu(req) }));
  });
  app.get('/api/disparos/:id', { preHandler: exigeLogin }, async (req, reply) => (await detalheDisparo(id(req))) ?? erro(reply, 404, 'NAO_ENCONTRADO', 'Disparo não encontrado.'));
  app.post('/api/disparos/:id/cancelar', { preHandler: exigeLogin }, async (req, reply) => reply.code(202).send(await cancelarDisparo(id(req), eu(req))));

  // ── Revisão (falhas e incertas) ──
  app.get('/api/revisao', { preHandler: exigeLogin }, async (req, reply) => {
    const p = validar(esquemas.revisao, req.query, reply);
    if (p) return listarRevisao(p.status, p.page, p.size);
  });
  app.post('/api/mensagens/:id/reprocessar', { preHandler: exigeLogin }, async (req, reply) => reply.code(202).send(await reprocessar(id(req), eu(req))));
  app.post('/api/mensagens/:id/marcar-enviada', { preHandler: exigeLogin }, async (req) => marcarEnviada(id(req), eu(req)));

  // ── Bloqueios ──
  app.get('/api/bloqueios', { preHandler: exigeLogin }, async (req, reply) => {
    const p = validar(esquemas.bloqueiosLista, req.query, reply);
    if (p) return listarBloqueios(p);
  });
  app.post('/api/bloqueios', { preHandler: exigeLogin }, async (req, reply) => {
    const d = validar(esquemas.bloqueio, req.body, reply);
    if (d) return reply.code(201).send(await bloquear(d.telefones, d.motivo, eu(req)));
  });
  app.delete('/api/bloqueios/:id', { preHandler: exigeAdmin }, async (req, reply) => {
    await desbloquear(id(req), eu(req));
    return reply.code(204).send();
  });

  // ── Times (API) ──
  app.get('/api/times', { preHandler: exigeAdmin }, async () => ({ data: await listarTimes() }));
  app.post('/api/times', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.timeNovo, req.body, reply);
    if (d) return reply.code(201).send(await criarTime(d, eu(req)));
  });
  app.put('/api/times/:id', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.timeEdicao, req.body, reply);
    if (d) return editarTime(id(req), d, eu(req));
  });
  app.post('/api/times/:id/nova-chave', { preHandler: exigeAdmin }, async (req) => trocarChave(id(req), eu(req)));

  // ── Alertas na tela (sino e avisos em todas as páginas): ERRO e AVISO importantes das últimas 24 h ──
  app.get('/api/alertas', { preHandler: exigeLogin }, async () => {
    const lista = await prisma.evento.findMany({
      where: { criadoEm: { gte: new Date(Date.now() - 24 * 3_600_000) }, OR: [{ nivel: 'ERRO' }, { nivel: 'AVISO', tipo: { in: TIPOS_ALERTA } }] },
      orderBy: { id: 'desc' },
      take: 50,
      include: { chip: { include: { aparelho: { select: { nome: true } } } }, usuario: { select: { nome: true } } },
    });
    return { data: lista.map(dtoEvento) };
  });

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
    await registrarEvento({ tipo: 'usuario', texto: `${eu(req).nome} criou o usuário ${u.nome} (${u.papel}).`, usuarioId: eu(req).id });
    return reply.code(201).send(u);
  });
  app.put('/api/usuarios/:id', { preHandler: exigeAdmin }, async (req, reply) => {
    const d = validar(esquemas.usuarioEdicao, req.body, reply);
    if (!d) return;
    const alvo = id(req);
    if (alvo === eu(req).id && (d.ativo === false || d.papel === 'OPERADOR')) return erro(reply, 422, 'PROPRIO_USUARIO', 'Você não pode desativar nem rebaixar o seu próprio usuário.');
    const { senha, ...resto } = d;
    const u = await prisma.usuario.update({ where: { id: alvo }, data: { ...resto, ...(senha ? { senhaHash: await gerarHash(senha) } : {}) }, select: SELECT_USUARIO });
    if (senha || d.ativo === false) await encerrarSessoesDoUsuario(alvo);
    await registrarEvento({ tipo: 'usuario', texto: `${eu(req).nome} editou o usuário ${u.nome}${senha ? ' (senha trocada)' : ''}.`, usuarioId: eu(req).id });
    return u;
  });

  // ── API dos times ──
  await app.register(rotasV1);

  return app;
}

type EventoComRelacoes = { id: number; tipo: string; nivel: string; texto: string; criadoEm: Date; disparoId: number | null; chip: { simNumero: number; operadora: string | null; aparelho: { nome: string } } | null; usuario: { nome: string } | null };
function dtoEvento(e: EventoComRelacoes) {
  return { id: e.id, tipo: e.tipo, nivel: e.nivel, texto: e.texto, criadoEm: e.criadoEm, chip: rotuloChip(e.chip), disparoId: e.disparoId, usuario: e.usuario?.nome ?? null };
}

/** Cria o primeiro administrador pelo .env, só se o banco ainda não tem nenhum usuário. */
export async function garantirAdmin(): Promise<boolean> {
  if ((await prisma.usuario.count()) > 0) return false;
  const { email, nome, senha } = config.admin;
  if (!email || !senha || senha.length < 8) throw new Error('Nenhum usuário no banco: defina ADMIN_EMAIL e ADMIN_SENHA (8+ caracteres) no .env para criar o primeiro administrador.');
  try {
    await prisma.usuario.create({ data: { email: email.trim().toLowerCase(), nome, papel: 'ADMIN', senhaHash: await gerarHash(senha) } });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return false; // outra réplica criou ao mesmo tempo
    throw e;
  }
  await registrarEvento({ tipo: 'usuario', texto: `Primeiro administrador criado (${nome}).` });
  return true;
}
