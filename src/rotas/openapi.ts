// Contrato da API /v1 (OpenAPI 3.1), servido em GET /v1/openapi.json.
const erro = { type: 'object', properties: { codigo: { type: 'string' }, mensagem: { type: 'string' }, detalhes: { type: 'object' } }, required: ['codigo', 'mensagem', 'detalhes'] };
const status = { type: 'string', enum: ['PENDENTE', 'RESERVADA', 'ENVIANDO', 'ACEITA', 'ENVIADA', 'ENTREGUE', 'FALHOU', 'INCERTA', 'CANCELADA', 'SEM_CONFIRMACAO'] };
const mensagem = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    status,
    rotulo: { type: 'string' },
    chaveIdempotencia: { type: ['string', 'null'] },
    disparoId: { type: ['integer', 'null'] },
    criadoEm: { type: 'string', format: 'date-time' },
    atualizadoEm: { type: 'string', format: 'date-time' },
    entregueEm: { type: ['string', 'null'], format: 'date-time' },
    detalhe: { type: ['string', 'null'] },
  },
};
const respostasErro = {
  '401': { description: 'Chave ausente ou inválida', content: { 'application/json': { schema: erro } } },
  '422': { description: 'Dados inválidos, telefone inválido ou bloqueado', content: { 'application/json': { schema: erro } } },
  '429': { description: 'Cota do dia do time atingida', content: { 'application/json': { schema: erro } } },
};

export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'sms-recall API',
    version: '1.0.0',
    description:
      'Envio de SMS pelos chips da empresa. Assíncrono: o pedido entra na fila e responde 202. ' +
      'Status por GET ou pelo webhook do time (POST com JSON {evento:"mensagem.status", id, chaveIdempotencia, disparoId, status, rotulo, entregueEm, avisoId}; ' +
      'quando o contato responde: {evento:"mensagem.respondida", id, chaveIdempotencia, disparoId, resposta:{id, texto, recebidaEm}, avisoId} ' +
      'e header X-SMS-Assinatura = HMAC-SHA256 do corpo, com chave = SHA-256 hex da chave de API do time). Erros: {codigo, mensagem, detalhes}. ' +
      'Envios só saem dentro da janela de envio e respeitando a cota de cada chip; status INCERTA = pode ter saído, nunca é reenviado sozinho.',
  },
  components: { securitySchemes: { chave: { type: 'apiKey', in: 'header', name: 'X-Api-Key' } } },
  security: [{ chave: [] }],
  paths: {
    '/v1/mensagens': {
      get: {
        summary: 'Lista paginada das mensagens do time',
        parameters: [
          { name: 'status', in: 'query', required: false, schema: status },
          { name: 'de', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'ate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'size', in: 'query', required: false, schema: { type: 'integer', default: 50, maximum: 200 } },
        ],
        responses: { '200': { description: '{ data: [mensagem], page, size, total, periodo }' } },
      },
      post: {
        summary: 'Envia uma mensagem',
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string', maxLength: 100 }, description: 'Repetir o pedido com a mesma chave devolve a mesma mensagem (200), nunca cria outra.' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['telefone', 'texto'], properties: { telefone: { type: 'string', example: '51999991234' }, texto: { type: 'string', maxLength: 640, example: 'Ola {nome}, aqui e da Recall.' }, nome: { type: 'string' } } } } },
        },
        responses: { '202': { description: 'Na fila', content: { 'application/json': { schema: mensagem } } }, '200': { description: 'Já existia (mesma Idempotency-Key)', content: { 'application/json': { schema: mensagem } } }, ...respostasErro },
      },
    },
    '/v1/metricas': {
      get: {
        summary: 'Métricas do time no período (padrão: hoje)',
        parameters: [
          { name: 'de', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'ate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'periodo, resumo, porStatus, taxaEntrega, tempoMedioEntregaSegundos, respostas {respondidas, base, taxaResposta, tempoMedianoRespostaSegundos, tempoMedioRespostaSegundos}, porDia, cotaHoje' }, '422': { description: 'Período inválido', content: { 'application/json': { schema: erro } } } },
      },
    },
    '/v1/mensagens/{id}': {
      get: { summary: 'Status de uma mensagem do time', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Mensagem', content: { 'application/json': { schema: mensagem } } }, '404': { description: 'Não encontrada', content: { 'application/json': { schema: erro } } } } },
    },
    '/v1/disparos': {
      post: {
        summary: 'Envia um lote (até 500 contatos, roleta de até 20 textos)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['contatos'],
                properties: {
                  nome: { type: 'string' },
                  contatos: { type: 'array', maxItems: 500, items: { type: 'object', required: ['telefone'], properties: { telefone: { type: 'string' }, nome: { type: 'string' }, mensagem: { type: 'string' } } } },
                  mensagens: { type: 'array', maxItems: 20, items: { type: 'string' } },
                  intervaloMinSegundos: { type: 'number', default: 45 },
                  intervaloMaxSegundos: { type: 'number', default: 80 },
                },
              },
            },
          },
        },
        responses: { '202': { description: 'Resumo do disparo' }, ...respostasErro },
      },
    },
    '/v1/disparos/{id}': { get: { summary: 'Resumo de um disparo do time', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Resumo' }, '404': { description: 'Não encontrado' } } } },
    '/v1/disparos/{id}/cancelar': { post: { summary: 'Cancela o que ainda não saiu', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '202': { description: 'Cancelado' }, '409': { description: 'Já terminou' } } } },
  },
} as const;
