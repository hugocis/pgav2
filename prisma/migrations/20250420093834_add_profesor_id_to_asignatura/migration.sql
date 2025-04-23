/*
  Warnings:

  - Added the required column `profesorId` to the `Asignatura` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Asignatura" ADD COLUMN     "profesorId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Asignatura" ADD CONSTRAINT "Asignatura_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
