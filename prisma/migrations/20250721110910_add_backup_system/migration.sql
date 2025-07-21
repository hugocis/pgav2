-- CreateTable
CREATE TABLE "BackupSystem" (
    "id" TEXT NOT NULL,
    "tipoBackup" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'EN_PROGRESO',
    "archivoPath" TEXT,
    "tamaño" BIGINT,
    "observaciones" TEXT,
    "ultimoBackup" TIMESTAMP(3),
    "ejecutadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupSystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupSystem_tipoBackup_idx" ON "BackupSystem"("tipoBackup");

-- CreateIndex
CREATE INDEX "BackupSystem_fechaInicio_idx" ON "BackupSystem"("fechaInicio");

-- AddForeignKey
ALTER TABLE "BackupSystem" ADD CONSTRAINT "BackupSystem_ejecutadoPorId_fkey" FOREIGN KEY ("ejecutadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
