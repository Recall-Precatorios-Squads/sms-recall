// Sobe as telas e as APIs. O envio fica no worker (src/worker/index.ts).
import { criarApp, garantirAdmin } from './app.js';
import { config, validarConfig } from './config.js';
import { prisma } from './db.js';
import { log } from './lib/log.js';

validarConfig();
const app = await criarApp();
if (await garantirAdmin()) log('admin.criado', { email: config.admin.email.replace(/^(.).*(@.*)$/, '$1***$2') });
await app.listen({ port: config.porta, host: config.host });
log('app.inicio', { porta: config.porta, simulado: config.simulado, janela: `${config.janela.inicio}-${config.janela.fim}` });

for (const sinal of ['SIGTERM', 'SIGINT'] as const)
  process.on(sinal, () => {
    void app
      .close()
      .then(() => prisma.$disconnect())
      .finally(() => process.exit(0));
  });
