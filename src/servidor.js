// Sobe as telas e a API. O envio fica no worker (src/worker/index.js).
import { config, validarConfig } from './config.js';
import { prisma } from './db.js';
import { criarApp, garantirAdmin } from './app.js';
import { log } from './lib/log.js';

validarConfig();
const app = await criarApp();
if (await garantirAdmin()) log('admin.criado', { email: config.admin.email.replace(/^(.).*(@.*)$/, '$1***$2') });
await app.listen({ port: config.porta, host: config.host });
log('app.inicio', { porta: config.porta, simulado: config.simulado });

for (const sinal of ['SIGTERM', 'SIGINT'])
  process.on(sinal, async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
