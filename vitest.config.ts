import { defineConfig } from 'vitest/config';

// Testes de fila e API rodam contra um Postgres de verdade (banco sms_teste). Ver README, seção "Testes".
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TESTE ?? 'postgresql://sms:dev@localhost:5433/sms_teste',
      APP_SECRET: 'teste-0123456789abcdef0123456789abcdef',
      SMSGATE_SIMULADO: '1',
      JANELA_ENVIO: '08:00-20:00',
      COTA_DIARIA_CHIP: '167',
      TZ_TELA: 'America/Sao_Paulo',
    },
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
