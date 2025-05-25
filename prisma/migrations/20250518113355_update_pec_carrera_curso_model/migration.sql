/*
  Warnings:

  - You are about to drop the column `cursoAcademicoId` on the `PecCarreraCurso` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pecId,carreraId,curso]` on the table `PecCarreraCurso` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `curso` to the `PecCarreraCurso` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PecCarreraCurso" DROP CONSTRAINT "PecCarreraCurso_cursoAcademicoId_fkey";

-- DropIndex
DROP INDEX "PecCarreraCurso_pecId_carreraId_cursoAcademicoId_key";

-- AlterTable
ALTER TABLE "PecCarreraCurso" DROP COLUMN "cursoAcademicoId",
ADD COLUMN     "curso" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PecCarreraCurso_pecId_carreraId_curso_key" ON "PecCarreraCurso"("pecId", "carreraId", "curso");
