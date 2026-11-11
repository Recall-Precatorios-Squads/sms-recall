// Copia os arquivos estáticos das telas para dist/ depois do tsc.
import { cpSync } from 'node:fs';
cpSync('src/web/public', 'dist/web/public', { recursive: true });
