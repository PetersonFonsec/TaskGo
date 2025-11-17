/*
  Warnings:

  - A unique constraint covering the columns `[cpf]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cpf` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "cpf" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cpf_key" ON "usuarios"("cpf");
