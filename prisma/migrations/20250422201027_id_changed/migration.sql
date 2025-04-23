/*
  Warnings:

  - The primary key for the `ActivityLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AlumnoGrupo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AlumnoPlan` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Asignatura` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AsistenciaAlumno` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Carrera` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ConfiguracionCarrera` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CursoAcademico` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Docencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `DocumentacionDispensa` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `DocumentacionJustificacion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Escuela` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EstadoAsistencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EstadoDispensa` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EstadoJustificacion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Grupo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `HorariosProfesor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Matricula` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PlanDeEstudios` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SesionClase` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SolicitudDispensa` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SolicitudJustificacion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserRole` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_dispensasEstados` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "AlumnoGrupo" DROP CONSTRAINT "AlumnoGrupo_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "AlumnoPlan" DROP CONSTRAINT "AlumnoPlan_cursoAcademicoId_fkey";

-- DropForeignKey
ALTER TABLE "AlumnoPlan" DROP CONSTRAINT "AlumnoPlan_plandeEstudiosId_fkey";

-- DropForeignKey
ALTER TABLE "Asignatura" DROP CONSTRAINT "Asignatura_carreraId_fkey";

-- DropForeignKey
ALTER TABLE "Asignatura" DROP CONSTRAINT "Asignatura_cursoAcademicoId_fkey";

-- DropForeignKey
ALTER TABLE "AsistenciaAlumno" DROP CONSTRAINT "AsistenciaAlumno_estadoAsistenciaId_fkey";

-- DropForeignKey
ALTER TABLE "AsistenciaAlumno" DROP CONSTRAINT "AsistenciaAlumno_sesionClaseId_fkey";

-- DropForeignKey
ALTER TABLE "Carrera" DROP CONSTRAINT "Carrera_escuelaId_fkey";

-- DropForeignKey
ALTER TABLE "ConfiguracionCarrera" DROP CONSTRAINT "ConfiguracionCarrera_carreraId_fkey";

-- DropForeignKey
ALTER TABLE "Docencia" DROP CONSTRAINT "Docencia_asignaturaId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentacionDispensa" DROP CONSTRAINT "DocumentacionDispensa_solicitudDispensaId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentacionJustificacion" DROP CONSTRAINT "DocumentacionJustificacion_solicitudJustificacionId_fkey";

-- DropForeignKey
ALTER TABLE "Grupo" DROP CONSTRAINT "Grupo_asignaturaId_fkey";

-- DropForeignKey
ALTER TABLE "Matricula" DROP CONSTRAINT "Matricula_asignaturaId_fkey";

-- DropForeignKey
ALTER TABLE "PlanDeEstudios" DROP CONSTRAINT "PlanDeEstudios_carreraId_fkey";

-- DropForeignKey
ALTER TABLE "SesionClase" DROP CONSTRAINT "SesionClase_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "SolicitudDispensa" DROP CONSTRAINT "SolicitudDispensa_estadoDispensaId_fkey";

-- DropForeignKey
ALTER TABLE "SolicitudDispensa" DROP CONSTRAINT "SolicitudDispensa_matriculaId_fkey";

-- DropForeignKey
ALTER TABLE "SolicitudJustificacion" DROP CONSTRAINT "SolicitudJustificacion_asistenciaAlumnoId_fkey";

-- DropForeignKey
ALTER TABLE "SolicitudJustificacion" DROP CONSTRAINT "SolicitudJustificacion_estadoJustificacionId_fkey";

-- DropForeignKey
ALTER TABLE "_dispensasEstados" DROP CONSTRAINT "_dispensasEstados_A_fkey";

-- DropForeignKey
ALTER TABLE "_dispensasEstados" DROP CONSTRAINT "_dispensasEstados_B_fkey";

-- AlterTable
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ActivityLog_id_seq";

-- AlterTable
ALTER TABLE "AlumnoGrupo" DROP CONSTRAINT "AlumnoGrupo_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "grupoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AlumnoGrupo_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AlumnoGrupo_id_seq";

-- AlterTable
ALTER TABLE "AlumnoPlan" DROP CONSTRAINT "AlumnoPlan_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "cursoAcademicoId" SET DATA TYPE TEXT,
ALTER COLUMN "plandeEstudiosId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AlumnoPlan_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AlumnoPlan_id_seq";

-- AlterTable
ALTER TABLE "Asignatura" DROP CONSTRAINT "Asignatura_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "carreraId" SET DATA TYPE TEXT,
ALTER COLUMN "cursoAcademicoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Asignatura_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Asignatura_id_seq";

-- AlterTable
ALTER TABLE "AsistenciaAlumno" DROP CONSTRAINT "AsistenciaAlumno_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "sesionClaseId" SET DATA TYPE TEXT,
ALTER COLUMN "estadoAsistenciaId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AsistenciaAlumno_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AsistenciaAlumno_id_seq";

-- AlterTable
ALTER TABLE "Carrera" DROP CONSTRAINT "Carrera_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "escuelaId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Carrera_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Carrera_id_seq";

-- AlterTable
ALTER TABLE "ConfiguracionCarrera" DROP CONSTRAINT "ConfiguracionCarrera_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "carreraId" SET DATA TYPE TEXT,
ADD CONSTRAINT "ConfiguracionCarrera_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ConfiguracionCarrera_id_seq";

-- AlterTable
ALTER TABLE "CursoAcademico" DROP CONSTRAINT "CursoAcademico_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "CursoAcademico_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CursoAcademico_id_seq";

-- AlterTable
ALTER TABLE "Docencia" DROP CONSTRAINT "Docencia_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "asignaturaId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Docencia_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Docencia_id_seq";

-- AlterTable
ALTER TABLE "DocumentacionDispensa" DROP CONSTRAINT "DocumentacionDispensa_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "solicitudDispensaId" SET DATA TYPE TEXT,
ADD CONSTRAINT "DocumentacionDispensa_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "DocumentacionDispensa_id_seq";

-- AlterTable
ALTER TABLE "DocumentacionJustificacion" DROP CONSTRAINT "DocumentacionJustificacion_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "solicitudJustificacionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "DocumentacionJustificacion_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "DocumentacionJustificacion_id_seq";

-- AlterTable
ALTER TABLE "Escuela" DROP CONSTRAINT "Escuela_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Escuela_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Escuela_id_seq";

-- AlterTable
ALTER TABLE "EstadoAsistencia" DROP CONSTRAINT "EstadoAsistencia_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "EstadoAsistencia_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EstadoAsistencia_id_seq";

-- AlterTable
ALTER TABLE "EstadoDispensa" DROP CONSTRAINT "EstadoDispensa_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "EstadoDispensa_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EstadoDispensa_id_seq";

-- AlterTable
ALTER TABLE "EstadoJustificacion" DROP CONSTRAINT "EstadoJustificacion_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "EstadoJustificacion_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EstadoJustificacion_id_seq";

-- AlterTable
ALTER TABLE "Grupo" DROP CONSTRAINT "Grupo_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "asignaturaId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Grupo_id_seq";

-- AlterTable
ALTER TABLE "HorariosProfesor" DROP CONSTRAINT "HorariosProfesor_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "HorariosProfesor_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "HorariosProfesor_id_seq";

-- AlterTable
ALTER TABLE "Matricula" DROP CONSTRAINT "Matricula_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "asignaturaId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Matricula_id_seq";

-- AlterTable
ALTER TABLE "PlanDeEstudios" DROP CONSTRAINT "PlanDeEstudios_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "carreraId" SET DATA TYPE TEXT,
ADD CONSTRAINT "PlanDeEstudios_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PlanDeEstudios_id_seq";

-- AlterTable
ALTER TABLE "SesionClase" DROP CONSTRAINT "SesionClase_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "grupoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "SesionClase_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SesionClase_id_seq";

-- AlterTable
ALTER TABLE "SolicitudDispensa" DROP CONSTRAINT "SolicitudDispensa_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "matriculaId" SET DATA TYPE TEXT,
ALTER COLUMN "estadoDispensaId" SET DATA TYPE TEXT,
ADD CONSTRAINT "SolicitudDispensa_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SolicitudDispensa_id_seq";

-- AlterTable
ALTER TABLE "SolicitudJustificacion" DROP CONSTRAINT "SolicitudJustificacion_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "estadoJustificacionId" SET DATA TYPE TEXT,
ALTER COLUMN "asistenciaAlumnoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "SolicitudJustificacion_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SolicitudJustificacion_id_seq";

-- AlterTable
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "UserRole_id_seq";

-- AlterTable
ALTER TABLE "_dispensasEstados" DROP CONSTRAINT "_dispensasEstados_AB_pkey",
ALTER COLUMN "A" SET DATA TYPE TEXT,
ALTER COLUMN "B" SET DATA TYPE TEXT,
ADD CONSTRAINT "_dispensasEstados_AB_pkey" PRIMARY KEY ("A", "B");

-- AddForeignKey
ALTER TABLE "Carrera" ADD CONSTRAINT "Carrera_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionCarrera" ADD CONSTRAINT "ConfiguracionCarrera_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDeEstudios" ADD CONSTRAINT "PlanDeEstudios_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignatura" ADD CONSTRAINT "Asignatura_carreraId_fkey" FOREIGN KEY ("carreraId") REFERENCES "Carrera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignatura" ADD CONSTRAINT "Asignatura_cursoAcademicoId_fkey" FOREIGN KEY ("cursoAcademicoId") REFERENCES "CursoAcademico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Docencia" ADD CONSTRAINT "Docencia_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoPlan" ADD CONSTRAINT "AlumnoPlan_cursoAcademicoId_fkey" FOREIGN KEY ("cursoAcademicoId") REFERENCES "CursoAcademico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoPlan" ADD CONSTRAINT "AlumnoPlan_plandeEstudiosId_fkey" FOREIGN KEY ("plandeEstudiosId") REFERENCES "PlanDeEstudios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoGrupo" ADD CONSTRAINT "AlumnoGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionClase" ADD CONSTRAINT "SesionClase_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaAlumno" ADD CONSTRAINT "AsistenciaAlumno_sesionClaseId_fkey" FOREIGN KEY ("sesionClaseId") REFERENCES "SesionClase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaAlumno" ADD CONSTRAINT "AsistenciaAlumno_estadoAsistenciaId_fkey" FOREIGN KEY ("estadoAsistenciaId") REFERENCES "EstadoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudJustificacion" ADD CONSTRAINT "SolicitudJustificacion_estadoJustificacionId_fkey" FOREIGN KEY ("estadoJustificacionId") REFERENCES "EstadoJustificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudJustificacion" ADD CONSTRAINT "SolicitudJustificacion_asistenciaAlumnoId_fkey" FOREIGN KEY ("asistenciaAlumnoId") REFERENCES "AsistenciaAlumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentacionJustificacion" ADD CONSTRAINT "DocumentacionJustificacion_solicitudJustificacionId_fkey" FOREIGN KEY ("solicitudJustificacionId") REFERENCES "SolicitudJustificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentacionDispensa" ADD CONSTRAINT "DocumentacionDispensa_solicitudDispensaId_fkey" FOREIGN KEY ("solicitudDispensaId") REFERENCES "SolicitudDispensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudDispensa" ADD CONSTRAINT "SolicitudDispensa_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudDispensa" ADD CONSTRAINT "SolicitudDispensa_estadoDispensaId_fkey" FOREIGN KEY ("estadoDispensaId") REFERENCES "EstadoDispensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dispensasEstados" ADD CONSTRAINT "_dispensasEstados_A_fkey" FOREIGN KEY ("A") REFERENCES "EstadoDispensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dispensasEstados" ADD CONSTRAINT "_dispensasEstados_B_fkey" FOREIGN KEY ("B") REFERENCES "SolicitudDispensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
