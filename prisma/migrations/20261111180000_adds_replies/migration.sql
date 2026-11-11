-- AlterTable
ALTER TABLE "avisos" ADD COLUMN     "resposta_id" INTEGER;

-- CreateTable
CREATE TABLE "respostas" (
    "id" SERIAL NOT NULL,
    "aparelho_id" INTEGER NOT NULL,
    "chip_id" INTEGER,
    "id_externo" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "recebida_em" TIMESTAMPTZ(3) NOT NULL,
    "mensagem_id" INTEGER,
    "disparo_id" INTEGER,
    "time_id" INTEGER,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respostas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "respostas_chip_id_idx" ON "respostas"("chip_id");

-- CreateIndex
CREATE INDEX "respostas_mensagem_id_idx" ON "respostas"("mensagem_id");

-- CreateIndex
CREATE INDEX "respostas_disparo_id_idx" ON "respostas"("disparo_id");

-- CreateIndex
CREATE INDEX "respostas_time_id_recebida_em_idx" ON "respostas"("time_id", "recebida_em");

-- CreateIndex
CREATE INDEX "respostas_recebida_em_idx" ON "respostas"("recebida_em");

-- CreateIndex
CREATE INDEX "respostas_telefone_idx" ON "respostas"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "respostas_aparelho_id_id_externo_key" ON "respostas"("aparelho_id", "id_externo");

-- CreateIndex
CREATE INDEX "avisos_resposta_id_idx" ON "avisos"("resposta_id");

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_resposta_id_fkey" FOREIGN KEY ("resposta_id") REFERENCES "respostas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_aparelho_id_fkey" FOREIGN KEY ("aparelho_id") REFERENCES "aparelhos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_chip_id_fkey" FOREIGN KEY ("chip_id") REFERENCES "chips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "mensagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_disparo_id_fkey" FOREIGN KEY ("disparo_id") REFERENCES "disparos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "times"("id") ON DELETE SET NULL ON UPDATE CASCADE;

