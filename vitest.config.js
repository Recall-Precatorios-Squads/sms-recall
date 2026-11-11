import { defineConfig } from 'vitest/config';

// Testes de fila rodam contra um Postgres de verdade (banco sms_teste). Ver README, seção "Testes".
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TESTE ?? 'postgresql://sms:dev@localhost:5433/sms_teste',
      APP_SECRET: 'teste-0123456789abcdef0123456789abcdef',
      SMSGATE_SIMULADO: '1',
    },
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
