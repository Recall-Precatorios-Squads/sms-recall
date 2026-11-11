-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "StatusDisparo" AS ENUM ('ENVIANDO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusMensagem" AS ENUM ('PENDENTE', 'RESERVADA', 'ENVIANDO', 'ACEITA', 'ENVIADA', 'ENTREGUE', 'FALHOU', 'INCERTA', 'CANCELADA', 'SEM_CONFIRMACAO');

-- CreateEnum
CREATE TYPE "NivelEvento" AS ENUM ('INFO', 'AVISO', 'ERRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aparelhos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "senha_cifrada" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "bateria" INTEGER,
    "detalhe" TEXT,
    "ultimo_contato_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aparelhos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chips" (
    "id" SERIAL NOT NULL,
    "aparelho_id" INTEGER NOT NULL,
    "sim_numero" INTEGER NOT NULL,
    "operadora" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "proximo_envio_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "falhas_seguidas" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disparos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_por_id" INTEGER NOT NULL,
    "status" "StatusDisparo" NOT NULL DEFAULT 'ENVIANDO',
    "intervalo_min_ms" INTEGER NOT NULL,
    "intervalo_max_ms" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "abordagens" INTEGER NOT NULL DEFAULT 0,
    "duplicados" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminado_em" TIMESTAMPTZ(3),

    CONSTRAINT "disparos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens" (
    "id" SERIAL NOT NULL,
    "disparo_id" INTEGER NOT NULL,
    "linha" INTEGER,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "texto" TEXT NOT NULL,
    "indice_abordagem" INTEGER,
    "status" "StatusMensagem" NOT NULL DEFAULT 'PENDENTE',
    "chip_id" INTEGER,
    "id_externo" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proxima_tentativa_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservada_ate" TIMESTAMPTZ(3),
    "enviando_em" TIMESTAMPTZ(3),
    "aceita_em" TIMESTAMPTZ(3),
    "entregue_em" TIMESTAMPTZ(3),
    "detalhe" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "nivel" "NivelEvento" NOT NULL DEFAULT 'INFO',
    "texto" TEXT NOT NULL,
    "disparo_id" INTEGER,
    "chip_id" INTEGER,
    "usuario_id" INTEGER,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_token_hash_key" ON "sessoes"("token_hash");

-- CreateIndex
CREATE INDEX "sessoes_usuario_id_idx" ON "sessoes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "aparelhos_nome_key" ON "aparelhos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "chips_aparelho_id_sim_numero_key" ON "chips"("aparelho_id", "sim_numero");

-- CreateIndex
CREATE INDEX "disparos_criado_por_id_idx" ON "disparos"("criado_por_id");

-- CreateIndex
CREATE INDEX "disparos_status_idx" ON "disparos"("status");

-- CreateIndex
CREATE INDEX "mensagens_status_proxima_tentativa_em_idx" ON "mensagens"("status", "proxima_tentativa_em");

-- CreateIndex
CREATE INDEX "mensagens_disparo_id_idx" ON "mensagens"("disparo_id");

-- CreateIndex
CREATE INDEX "mensagens_chip_id_idx" ON "mensagens"("chip_id");

-- CreateIndex
CREATE INDEX "eventos_criado_em_idx" ON "eventos"("criado_em");

-- CreateIndex
CREATE INDEX "eventos_disparo_id_idx" ON "eventos"("disparo_id");

-- CreateIndex
CREATE INDEX "eventos_chip_id_idx" ON "eventos"("chip_id");

-- CreateIndex
CREATE INDEX "eventos_usuario_id_idx" ON "eventos"("usuario_id");

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chips" ADD CONSTRAINT "chips_aparelho_id_fkey" FOREIGN KEY ("aparelho_id") REFERENCES "aparelhos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disparos" ADD CONSTRAINT "disparos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_disparo_id_fkey" FOREIGN KEY ("disparo_id") REFERENCES "disparos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_chip_id_fkey" FOREIGN KEY ("chip_id") REFERENCES "chips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_disparo_id_fkey" FOREIGN KEY ("disparo_id") REFERENCES "disparos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_chip_id_fkey" FOREIGN KEY ("chip_id") REFERENCES "chips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
