-- CreateTable
CREATE TABLE "FirmaDocente" (
    "id" TEXT NOT NULL,
    "fechaFirma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "sesionClaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmaDocente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FirmaDocente_sesionClaseId_key" ON "FirmaDocente"("sesionClaseId");

-- AddForeignKey
ALTER TABLE "FirmaDocente" ADD CONSTRAINT "FirmaDocente_sesionClaseId_fkey" FOREIGN KEY ("sesionClaseId") REFERENCES "SesionClase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
