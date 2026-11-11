-- CreateEnum
CREATE TYPE "StatusEntrega" AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU');

-- DropForeignKey
ALTER TABLE "disparos" DROP CONSTRAINT "disparos_criado_por_id_fkey";

-- DropForeignKey
ALTER TABLE "mensagens" DROP CONSTRAINT "mensagens_disparo_id_fkey";

-- DropIndex
DROP INDEX "mensagens_chip_id_idx";

-- AlterTable
ALTER TABLE "chips" ADD COLUMN     "cota_diaria" INTEGER;

-- AlterTable
ALTER TABLE "disparos" ADD COLUMN     "bloqueados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "time_id" INTEGER,
ALTER COLUMN "criado_por_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "mensagens" ADD COLUMN     "chave_idempotencia" TEXT,
ADD COLUMN     "intervalo_max_ms" INTEGER,
ADD COLUMN     "intervalo_min_ms" INTEGER,
ADD COLUMN     "prioridade" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "time_id" INTEGER,
ALTER COLUMN "disparo_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "times" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "chave_hash" TEXT NOT NULL,
    "chave_prefixo" TEXT NOT NULL,
    "cota_diaria" INTEGER NOT NULL DEFAULT 1000,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "webhook_url" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueios" (
    "id" SERIAL NOT NULL,
    "telefone" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "criado_por_id" INTEGER,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "status" "StatusEntrega" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proxima_tentativa_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_em" TIMESTAMPTZ(3),
    "erro" TEXT,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avisos" (
    "id" SERIAL NOT NULL,
    "mensagem_id" INTEGER NOT NULL,
    "time_id" INTEGER NOT NULL,
    "status_mensagem" TEXT NOT NULL,
    "status" "StatusEntrega" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proxima_tentativa_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_em" TIMESTAMPTZ(3),
    "erro" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentativas_login" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batidas_worker" (
    "id" TEXT NOT NULL,
    "ultima_em" TIMESTAMPTZ(3) NOT NULL,
    "fora_da_janela" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "batidas_worker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "times_nome_key" ON "times"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "times_chave_hash_key" ON "times"("chave_hash");

-- CreateIndex
CREATE UNIQUE INDEX "bloqueios_telefone_key" ON "bloqueios"("telefone");

-- CreateIndex
CREATE INDEX "bloqueios_criado_por_id_idx" ON "bloqueios"("criado_por_id");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_evento_id_key" ON "alertas"("evento_id");

-- CreateIndex
CREATE INDEX "alertas_status_proxima_tentativa_em_idx" ON "alertas"("status", "proxima_tentativa_em");

-- CreateIndex
CREATE INDEX "avisos_status_proxima_tentativa_em_idx" ON "avisos"("status", "proxima_tentativa_em");

-- CreateIndex
CREATE INDEX "avisos_mensagem_id_idx" ON "avisos"("mensagem_id");

-- CreateIndex
CREATE INDEX "avisos_time_id_idx" ON "avisos"("time_id");

-- CreateIndex
CREATE INDEX "tentativas_login_ip_criado_em_idx" ON "tentativas_login"("ip", "criado_em");

-- CreateIndex
CREATE INDEX "disparos_time_id_idx" ON "disparos"("time_id");

-- CreateIndex
CREATE INDEX "mensagens_chip_id_enviando_em_idx" ON "mensagens"("chip_id", "enviando_em");

-- CreateIndex
CREATE INDEX "mensagens_time_id_criado_em_idx" ON "mensagens"("time_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_time_id_chave_idempotencia_key" ON "mensagens"("time_id", "chave_idempotencia");

-- AddForeignKey
ALTER TABLE "disparos" ADD CONSTRAINT "disparos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disparos" ADD CONSTRAINT "disparos_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "times"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_disparo_id_fkey" FOREIGN KEY ("disparo_id") REFERENCES "disparos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "times"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "mensagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "times"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

