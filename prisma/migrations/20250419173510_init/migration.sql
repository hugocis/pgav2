-- CreateTable
CREATE TABLE "OfertaAcademica" (
    "id" SERIAL NOT NULL,
    "ANY_ANYACA" TEXT,
    "DENOMINACION" TEXT,
    "ID_BOLONIA" TEXT,
    "BOLONIA" TEXT,
    "CARRERAS" TEXT,
    "DEN_GUIAS_DOC" TEXT,
    "CURSOS" TEXT,
    "CURSO_PLAN" TEXT,
    "COD_AGORA" TEXT,
    "MATERIA" TEXT,
    "MATERIA_PLAN" TEXT,
    "GRUPOS" TEXT,
    "CREDITOS" DOUBLE PRECISION,
    "CUATRIMESTRE" TEXT,
    "TIPODEMATERIA" TEXT,
    "HORAS_SEMANA_1C" DOUBLE PRECISION,
    "HORAS_SEMANA_2C" DOUBLE PRECISION,
    "PORC_DOC" TEXT,
    "MODULO_PLAN" TEXT,
    "AREA" TEXT,
    "COD_MATERIA" TEXT,

    CONSTRAINT "OfertaAcademica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfesoresDetalle" (
    "id" SERIAL NOT NULL,
    "CODPROF" TEXT,
    "ID_ASIGNACION" INTEGER,
    "PORCENTAJE_DOCENCIA" TEXT,
    "CODASIGNATURA" TEXT,
    "MATERIA" TEXT,
    "AREA" TEXT,
    "GRUPO_GA" TEXT,
    "GRUPOS_UXXI" TEXT,
    "HORARIOS_1C_LUNES" TEXT,
    "HORARIOS_1C_MARTES" TEXT,
    "HORARIOS_1C_MIERCOLES" TEXT,
    "HORARIOS_1C_JUEVES" TEXT,
    "HORARIOS_1C_VIERNES" TEXT,
    "HORARIOS_1C_SABADO" TEXT,
    "HORARIOS_2C_LUNES" TEXT,
    "HORARIOS_2C_MARTES" TEXT,
    "HORARIOS_2C_MIERCOLES" TEXT,
    "HORARIOS_2C_JUEVES" TEXT,
    "HORARIOS_2C_VIERNES" TEXT,
    "HORARIOS_2C_SABADO" TEXT,
    "AULASL1" TEXT,
    "AULASM1" TEXT,
    "AULASX1" TEXT,
    "AULASJ1" TEXT,
    "AULASV1" TEXT,
    "AULASS1" TEXT,
    "AULASL2" TEXT,
    "AULASM2" TEXT,
    "AULASX2" TEXT,
    "AULASJ2" TEXT,
    "AULASV2" TEXT,
    "AULASS2" TEXT,
    "CODCURSO" TEXT,
    "CODCURSOPLAN" TEXT,
    "APELLIDO1" TEXT,
    "APELLIDO2" TEXT,
    "NOMBRE" TEXT,
    "DNI" TEXT,
    "LETRADNI" TEXT,
    "DOC_COMPLETO" TEXT,
    "EMAIL" TEXT,
    "TANDA" TEXT,
    "ANY_ANYACA" TEXT,
    "COD_CARRERA" TEXT,
    "CARRERA" TEXT,
    "TITULACION" TEXT,
    "ID_DIRECTOR" TEXT,
    "DIRECTOR" TEXT,
    "RESPONSABLE" TEXT,
    "FACULTAD" TEXT,
    "ID_DECANO" TEXT,
    "DECANO" TEXT,
    "TITULOPROPIO" TEXT,
    "ID_TIPO_DOCENCIA" INTEGER,
    "ACTIVO" TEXT,
    "COD_MATERIA" TEXT,
    "GENERO" TEXT,

    CONSTRAINT "ProfesoresDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpedienteAlumno" (
    "id" SERIAL NOT NULL,
    "PRS_CODNUM" INTEGER,
    "DNI" TEXT,
    "LLENIF" TEXT,
    "APE1" TEXT,
    "APE2" TEXT,
    "NOMBRE" TEXT,
    "FECHA_NACIMIENTO" TEXT,
    "SEXO" TEXT,
    "EMAIL" TEXT,
    "CARRERA" TEXT,
    "MODO_ACCESO" TEXT,
    "CARDENOM" TEXT,
    "CONVOCA" TEXT,
    "CODIGO" TEXT,
    "ASIG_DENOM" TEXT,
    "CURSO" DOUBLE PRECISION,
    "CURSO_PLAN" DOUBLE PRECISION,
    "GRUPO" TEXT,
    "DOBLE_GRADO" TEXT,
    "NUMMAT" DOUBLE PRECISION,
    "BLOQUEO" TEXT,
    "FECHA_ULT_MOD_MATRICULA" TEXT,

    CONSTRAINT "ExpedienteAlumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "surname1" TEXT,
    "surname2" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "lockout" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoAcademico" (
    "id" SERIAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "denominacion" TEXT NOT NULL,
    "cursoAnterior" TEXT,
    "cursoSiguiente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursoAcademico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escuela" (
    "id" SERIAL NOT NULL,
    "denominacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escuela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrera" (
    "id" SERIAL NOT NULL,
    "denominacion" TEXT NOT NULL,
    "escuelaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionCarrera" (
    "id" SERIAL NOT NULL,
    "FechaInicioDispensa" TIMESTAMP(3),
    "FechaFinDispensa" TIMESTAMP(3),
    "SolDispensa" BOOLEAN NOT NULL DEFAULT false,
    "SolJustificacion" BOOLEAN NOT NULL DEFAULT false,
    "carreraId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionCarrera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDeEstudios" (
    "id" SERIAL NOT NULL,
    "denominacion" TEXT NOT NULL,
    "codPlan" TEXT NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDeEstudios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asignatura" (
    "id" SERIAL NOT NULL,
    "CodAsignatura" TEXT NOT NULL,
    "Denominacion" TEXT NOT NULL,
    "Curso" TEXT NOT NULL,
    "Cuatrimestre" TEXT NOT NULL,
    "carreraId" INTEGER NOT NULL,
    "cursoAcademicoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asignatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" SERIAL NOT NULL,
    "fechaalta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "mostrar" BOOLEAN NOT NULL DEFAULT false,
    "alumno_id" TEXT NOT NULL,
    "asignaturaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Docencia" (
    "id" SERIAL NOT NULL,
    "fechaalta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "asignaturaId" INTEGER NOT NULL,
    "profesorId" TEXT NOT NULL,
    "mostrar" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Docencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumnoPlan" (
    "id" SERIAL NOT NULL,
    "fechaalta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "alumno_id" TEXT NOT NULL,
    "cursoAcademicoId" INTEGER NOT NULL,
    "plandeEstudiosId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlumnoPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" SERIAL NOT NULL,
    "denominacion" TEXT NOT NULL,
    "asignaturaId" INTEGER NOT NULL,
    "profesorId" TEXT NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumnoGrupo" (
    "id" SERIAL NOT NULL,
    "alumno_Id" TEXT NOT NULL,
    "grupoId" INTEGER NOT NULL,

    CONSTRAINT "AlumnoGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionClase" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "docenteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SesionClase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoAsistencia" (
    "id" SERIAL NOT NULL,
    "denominacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoAsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsistenciaAlumno" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "sesionClaseId" INTEGER NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "estadoAsistenciaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsistenciaAlumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoJustificacion" (
    "id" SERIAL NOT NULL,
    "denominacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoJustificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudJustificacion" (
    "id" SERIAL NOT NULL,
    "alegacion" TEXT NOT NULL,
    "respuesta" TEXT,
    "fechaAlegacion" TIMESTAMP(3) NOT NULL,
    "fechaRespuesta" TIMESTAMP(3),
    "alumnoId" TEXT NOT NULL,
    "estadoJustificacionId" INTEGER NOT NULL,
    "asistenciaAlumnoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudJustificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentacionJustificacion" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "fechaSubida" TIMESTAMP(3) NOT NULL,
    "solicitudJustificacionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentacionJustificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorariosProfesor" (
    "id" SERIAL NOT NULL,
    "lunes" TEXT,
    "martes" TEXT,
    "miercoles" TEXT,
    "jueves" TEXT,
    "viernes" TEXT,
    "sabado" TEXT,
    "profesorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HorariosProfesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentacionDispensa" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "fechaSubida" TIMESTAMP(3) NOT NULL,
    "solicitudDispensaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentacionDispensa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoDispensa" (
    "id" SERIAL NOT NULL,
    "denominacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoDispensa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudDispensa" (
    "id" SERIAL NOT NULL,
    "alegacion" TEXT NOT NULL,
    "respuesta" TEXT,
    "fechaAlegacion" TIMESTAMP(3) NOT NULL,
    "fechaRespuesta" TIMESTAMP(3),
    "alegacionReclamacion" TEXT,
    "respuestaReclamacion" TEXT,
    "fechaAlegacionReclamacion" TIMESTAMP(3),
    "fechaRespuestaReclamacion" TIMESTAMP(3),
    "alumnoId" TEXT NOT NULL,
    "matriculaId" INTEGER NOT NULL,
    "estadoDispensaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudDispensa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_dispensasEstados" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_dispensasEstados_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfertaAcademica_ANY_ANYACA_COD_MATERIA_key" ON "OfertaAcademica"("ANY_ANYACA", "COD_MATERIA");

-- CreateIndex
CREATE UNIQUE INDEX "ProfesoresDetalle_DNI_CODASIGNATURA_ANY_ANYACA_GRUPOS_UXXI_key" ON "ProfesoresDetalle"("DNI", "CODASIGNATURA", "ANY_ANYACA", "GRUPOS_UXXI");

-- CreateIndex
CREATE UNIQUE INDEX "ExpedienteAlumno_DNI_CARRERA_CODIGO_CONVOCA_GRUPO_key" ON "ExpedienteAlumno"("DNI", "CARRERA", "CODIGO", "CONVOCA", "GRUPO");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "_dispensasEstados_B_index" ON "_dispensasEstados"("B");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Docencia" ADD CONSTRAINT "Docencia_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Docencia" ADD CONSTRAINT "Docencia_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoPlan" ADD CONSTRAINT "AlumnoPlan_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoPlan" ADD CONSTRAINT "AlumnoPlan_cursoAcademicoId_fkey" FOREIGN KEY ("cursoAcademicoId") REFERENCES "CursoAcademico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoPlan" ADD CONSTRAINT "AlumnoPlan_plandeEstudiosId_fkey" FOREIGN KEY ("plandeEstudiosId") REFERENCES "PlanDeEstudios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoGrupo" ADD CONSTRAINT "AlumnoGrupo_alumno_Id_fkey" FOREIGN KEY ("alumno_Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoGrupo" ADD CONSTRAINT "AlumnoGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionClase" ADD CONSTRAINT "SesionClase_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionClase" ADD CONSTRAINT "SesionClase_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaAlumno" ADD CONSTRAINT "AsistenciaAlumno_sesionClaseId_fkey" FOREIGN KEY ("sesionClaseId") REFERENCES "SesionClase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaAlumno" ADD CONSTRAINT "AsistenciaAlumno_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaAlumno" ADD CONSTRAINT "AsistenciaAlumno_estadoAsistenciaId_fkey" FOREIGN KEY ("estadoAsistenciaId") REFERENCES "EstadoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudJustificacion" ADD CONSTRAINT "SolicitudJustificacion_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudJustificacion" ADD CONSTRAINT "SolicitudJustificacion_estadoJustificacionId_fkey" FOREIGN KEY ("estadoJustificacionId") REFERENCES "EstadoJustificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudJustificacion" ADD CONSTRAINT "SolicitudJustificacion_asistenciaAlumnoId_fkey" FOREIGN KEY ("asistenciaAlumnoId") REFERENCES "AsistenciaAlumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentacionJustificacion" ADD CONSTRAINT "DocumentacionJustificacion_solicitudJustificacionId_fkey" FOREIGN KEY ("solicitudJustificacionId") REFERENCES "SolicitudJustificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorariosProfesor" ADD CONSTRAINT "HorariosProfesor_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentacionDispensa" ADD CONSTRAINT "DocumentacionDispensa_solicitudDispensaId_fkey" FOREIGN KEY ("solicitudDispensaId") REFERENCES "SolicitudDispensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudDispensa" ADD CONSTRAINT "SolicitudDispensa_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudDispensa" ADD CONSTRAINT "SolicitudDispensa_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudDispensa" ADD CONSTRAINT "SolicitudDispensa_estadoDispensaId_fkey" FOREIGN KEY ("estadoDispensaId") REFERENCES "EstadoDispensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dispensasEstados" ADD CONSTRAINT "_dispensasEstados_A_fkey" FOREIGN KEY ("A") REFERENCES "EstadoDispensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dispensasEstados" ADD CONSTRAINT "_dispensasEstados_B_fkey" FOREIGN KEY ("B") REFERENCES "SolicitudDispensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
