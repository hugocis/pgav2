/*
  Warnings:

  - Added the required column `asignaturaId` to the `HorariosProfesor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HorariosProfesor" ADD COLUMN     "asignaturaId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ManagerCarrera" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "carreraId" TEXT NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerCarrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PecCarreraCurso" (
    "id" TEXT NOT NULL,
    "pecId" TEXT NOT NULL,
    "carreraId" TEXT NOT NULL,
    "cursoAcademicoId" TEXT NOT NULL,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PecCarreraCurso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagerCarrera_managerId_carreraId_key" ON "ManagerCarrera"("managerId", "carreraId");

-- CreateIndex
CREATE UNIQUE INDEX "PecCarreraCurso_pecId_carreraId_cursoAcademicoId_key" ON "PecCarreraCurso"("pecId", "carreraId", "cursoAcademicoId");

-- AddForeignKey
ALTER TABLE "HorariosProfesor" ADD CONSTRAINT "HorariosProfesor_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerCarrera" ADD CONSTRAINT "ManagerCarrera_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerCarrera" ADD CONSTRAINT "ManagerCarrera_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecCarreraCurso" ADD CONSTRAINT "PecCarreraCurso_pecId_fkey" FOREIGN KEY ("pecId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecCarreraCurso" ADD CONSTRAINT "PecCarreraCurso_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PecCarreraCurso" ADD CONSTRAINT "PecCarreraCurso_cursoAcademicoId_fkey" FOREIGN KEY ("cursoAcademicoId") REFERENCES "CursoAcademico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
