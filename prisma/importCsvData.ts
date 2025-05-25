import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

/**
 * Importa datos de CSV a la tabla ProfesoresDetalle
 */
export async function importProfesoresDetalle(csvPath: string): Promise<void> {
  console.log(`🌱 Comprobando si es necesario importar datos de profesores desde ${csvPath}...`);
  
  // Verificar si ya existen datos en la tabla
  const existingCount = await prisma.profesoresDetalle.count();
  if (existingCount > 0) {
    console.log(`✅ Ya existen ${existingCount} registros de profesores en la base de datos. Omitiendo importación.`);
    return;
  }
  
  console.log(`🌱 Importando datos de profesores desde ${csvPath}...`);
  
  const results: any[] = [];
  
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({
        separator: ',',
        skipLines: 0,
        headers: [
          'id', 'CODPROF', 'ID_ASIGNACION', 'PORCENTAJE_DOCENCIA', 'CODASIGNATURA', 
          'MATERIA', 'AREA', 'GRUPO_GA', 'GRUPOS_UXXI',
          'HORARIOS_1C_LUNES', 'HORARIOS_1C_MARTES', 'HORARIOS_1C_MIERCOLES', 
          'HORARIOS_1C_JUEVES', 'HORARIOS_1C_VIERNES', 'HORARIOS_1C_SABADO',
          'HORARIOS_2C_LUNES', 'HORARIOS_2C_MARTES', 'HORARIOS_2C_MIERCOLES',
          'HORARIOS_2C_JUEVES', 'HORARIOS_2C_VIERNES', 'HORARIOS_2C_SABADO',
          'AULASL1', 'AULASM1', 'AULASX1', 'AULASJ1', 'AULASV1', 'AULASS1',
          'AULASL2', 'AULASM2', 'AULASX2', 'AULASJ2', 'AULASV2', 'AULASS2',
          'CODCURSO', 'CODCURSOPLAN', 'APELLIDO1', 'APELLIDO2', 'NOMBRE', 'DNI',
          'LETRADNI', 'DOC_COMPLETO', 'EMAIL', 'TANDA', 'ANY_ANYACA', 'COD_CARRERA',
          'CARRERA', 'TITULACION', 'ID_DIRECTOR', 'DIRECTOR', 'RESPONSABLE', 
          'FACULTAD', 'ID_DECANO', 'DECANO', 'TITULOPROPIO', 'ID_TIPO_DOCENCIA',
          'ACTIVO', 'COD_MATERIA', 'GENERO'
        ]
      }))
      .on('data', (data: any) => results.push(data))
      .on('end', async () => {
        try {
          console.log(`📊 Se encontraron ${results.length} registros de profesores.`);
          
          let importedCount = 0;
          for (const record of results) {
            try {
              const id = parseInt(record.id) || importedCount + 1;
              
              // Mapear los campos del CSV a la estructura de la tabla ProfesoresDetalle
              await prisma.profesoresDetalle.upsert({
                where: { id },
                update: {
                  CODPROF: record.CODPROF || null,
                  ID_ASIGNACION: record.ID_ASIGNACION ? parseInt(record.ID_ASIGNACION) : null,
                  PORCENTAJE_DOCENCIA: record.PORCENTAJE_DOCENCIA || null,
                  CODASIGNATURA: record.CODASIGNATURA || null,
                  MATERIA: record.MATERIA || null,
                  AREA: record.AREA || null,
                  GRUPO_GA: record.GRUPO_GA || null,
                  GRUPOS_UXXI: record.GRUPOS_UXXI || null,
                  HORARIOS_1C_LUNES: record.HORARIOS_1C_LUNES || null,
                  HORARIOS_1C_MARTES: record.HORARIOS_1C_MARTES || null,
                  HORARIOS_1C_MIERCOLES: record.HORARIOS_1C_MIERCOLES || null,
                  HORARIOS_1C_JUEVES: record.HORARIOS_1C_JUEVES || null,
                  HORARIOS_1C_VIERNES: record.HORARIOS_1C_VIERNES || null,
                  HORARIOS_1C_SABADO: record.HORARIOS_1C_SABADO || null,
                  HORARIOS_2C_LUNES: record.HORARIOS_2C_LUNES || null,
                  HORARIOS_2C_MARTES: record.HORARIOS_2C_MARTES || null,
                  HORARIOS_2C_MIERCOLES: record.HORARIOS_2C_MIERCOLES || null,
                  HORARIOS_2C_JUEVES: record.HORARIOS_2C_JUEVES || null,
                  HORARIOS_2C_VIERNES: record.HORARIOS_2C_VIERNES || null,
                  HORARIOS_2C_SABADO: record.HORARIOS_2C_SABADO || null,
                  AULASL1: record.AULASL1 || null,
                  AULASM1: record.AULASM1 || null,
                  AULASX1: record.AULASX1 || null,
                  AULASJ1: record.AULASJ1 || null,
                  AULASV1: record.AULASV1 || null,
                  AULASS1: record.AULASS1 || null,
                  AULASL2: record.AULASL2 || null,
                  AULASM2: record.AULASM2 || null,
                  AULASX2: record.AULASX2 || null,
                  AULASJ2: record.AULASJ2 || null,
                  AULASV2: record.AULASV2 || null,
                  AULASS2: record.AULASS2 || null,
                  CODCURSO: record.CODCURSO || null,
                  CODCURSOPLAN: record.CODCURSOPLAN || null,
                  APELLIDO1: record.APELLIDO1 || null,
                  APELLIDO2: record.APELLIDO2 || null,
                  NOMBRE: record.NOMBRE || null,
                  DNI: record.DNI || null,
                  LETRADNI: record.LETRADNI || null,
                  DOC_COMPLETO: record.DOC_COMPLETO || null,
                  EMAIL: record.EMAIL || null,
                  TANDA: record.TANDA || null,
                  ANY_ANYACA: record.ANY_ANYACA || null,
                  COD_CARRERA: record.COD_CARRERA || null,
                  CARRERA: record.CARRERA || null,
                  TITULACION: record.TITULACION || null,
                  ID_DIRECTOR: record.ID_DIRECTOR || null,
                  DIRECTOR: record.DIRECTOR || null,
                  RESPONSABLE: record.RESPONSABLE || null,
                  FACULTAD: record.FACULTAD || null,
                  ID_DECANO: record.ID_DECANO || null,
                  DECANO: record.DECANO || null,
                  TITULOPROPIO: record.TITULOPROPIO || null,
                  ID_TIPO_DOCENCIA: record.ID_TIPO_DOCENCIA ? parseInt(record.ID_TIPO_DOCENCIA) : null,
                  ACTIVO: record.ACTIVO || null,
                  COD_MATERIA: record.COD_MATERIA || null,
                  GENERO: record.GENERO || null
                },
                create: {
                  id,
                  CODPROF: record.CODPROF || null,
                  ID_ASIGNACION: record.ID_ASIGNACION ? parseInt(record.ID_ASIGNACION) : null,
                  PORCENTAJE_DOCENCIA: record.PORCENTAJE_DOCENCIA || null,
                  CODASIGNATURA: record.CODASIGNATURA || null,
                  MATERIA: record.MATERIA || null,
                  AREA: record.AREA || null,
                  GRUPO_GA: record.GRUPO_GA || null,
                  GRUPOS_UXXI: record.GRUPOS_UXXI || null,
                  HORARIOS_1C_LUNES: record.HORARIOS_1C_LUNES || null,
                  HORARIOS_1C_MARTES: record.HORARIOS_1C_MARTES || null,
                  HORARIOS_1C_MIERCOLES: record.HORARIOS_1C_MIERCOLES || null,
                  HORARIOS_1C_JUEVES: record.HORARIOS_1C_JUEVES || null,
                  HORARIOS_1C_VIERNES: record.HORARIOS_1C_VIERNES || null,
                  HORARIOS_1C_SABADO: record.HORARIOS_1C_SABADO || null,
                  HORARIOS_2C_LUNES: record.HORARIOS_2C_LUNES || null,
                  HORARIOS_2C_MARTES: record.HORARIOS_2C_MARTES || null,
                  HORARIOS_2C_MIERCOLES: record.HORARIOS_2C_MIERCOLES || null,
                  HORARIOS_2C_JUEVES: record.HORARIOS_2C_JUEVES || null,
                  HORARIOS_2C_VIERNES: record.HORARIOS_2C_VIERNES || null,
                  HORARIOS_2C_SABADO: record.HORARIOS_2C_SABADO || null,
                  AULASL1: record.AULASL1 || null,
                  AULASM1: record.AULASM1 || null,
                  AULASX1: record.AULASX1 || null,
                  AULASJ1: record.AULASJ1 || null,
                  AULASV1: record.AULASV1 || null,
                  AULASS1: record.AULASS1 || null,
                  AULASL2: record.AULASL2 || null,
                  AULASM2: record.AULASM2 || null,
                  AULASX2: record.AULASX2 || null,
                  AULASJ2: record.AULASJ2 || null,
                  AULASV2: record.AULASV2 || null,
                  AULASS2: record.AULASS2 || null,
                  CODCURSO: record.CODCURSO || null,
                  CODCURSOPLAN: record.CODCURSOPLAN || null,
                  APELLIDO1: record.APELLIDO1 || null,
                  APELLIDO2: record.APELLIDO2 || null,
                  NOMBRE: record.NOMBRE || null,
                  DNI: record.DNI || null,
                  LETRADNI: record.LETRADNI || null,
                  DOC_COMPLETO: record.DOC_COMPLETO || null,
                  EMAIL: record.EMAIL || null,
                  TANDA: record.TANDA || null,
                  ANY_ANYACA: record.ANY_ANYACA || null,
                  COD_CARRERA: record.COD_CARRERA || null,
                  CARRERA: record.CARRERA || null,
                  TITULACION: record.TITULACION || null,
                  ID_DIRECTOR: record.ID_DIRECTOR || null,
                  DIRECTOR: record.DIRECTOR || null,
                  RESPONSABLE: record.RESPONSABLE || null,
                  FACULTAD: record.FACULTAD || null,
                  ID_DECANO: record.ID_DECANO || null,
                  DECANO: record.DECANO || null,
                  TITULOPROPIO: record.TITULOPROPIO || null,
                  ID_TIPO_DOCENCIA: record.ID_TIPO_DOCENCIA ? parseInt(record.ID_TIPO_DOCENCIA) : null,
                  ACTIVO: record.ACTIVO || null,
                  COD_MATERIA: record.COD_MATERIA || null,
                  GENERO: record.GENERO || null
                }
              });
              
              importedCount++;
              if (importedCount % 50 === 0) {
                console.log(`✅ Importados ${importedCount} profesores`);
              }            } catch (error: any) {
              console.error(`❌ Error importando profesor: ${error.message}`, record);
            }
          }
          
          console.log(`✅ Importación completada. Total de profesores importados: ${importedCount}`);
          resolve();
        } catch (error: any) {
          console.error(`❌ Error en la importación de profesores: ${error.message}`);
          reject(error);
        }      })
      .on('error', (error: Error) => {
        console.error(`❌ Error leyendo el archivo CSV: ${error.message}`);
        reject(error);
      });
  });
}

/**
 * Importa datos de CSV a la tabla ExpedienteAlumno
 */
export async function importExpedienteAlumno(csvPath: string): Promise<void> {
  console.log(`🌱 Comprobando si es necesario importar datos de expedientes de alumnos desde ${csvPath}...`);
  
  // Verificar si ya existen datos en la tabla
  const existingCount = await prisma.expedienteAlumno.count();
  if (existingCount > 0) {
    console.log(`✅ Ya existen ${existingCount} registros de expedientes en la base de datos. Omitiendo importación.`);
    return;
  }
  
  console.log(`🌱 Importando datos de expedientes de alumnos desde ${csvPath}...`);
  
  const results: any[] = [];
  
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({
        separator: ',',
        skipLines: 0,
        headers: [
          'id', 'PRS_CODNUM', 'DNI', 'LLENIF', 'APE1', 'APE2', 'NOMBRE',
          'FECHA_NACIMIENTO', 'SEXO', 'EMAIL', 'CARRERA', 'MODO_ACCESO',
          'CARDENOM', 'CONVOCA', 'CODIGO', 'ASIG_DENOM', 'CURSO',
          'CURSO_PLAN', 'GRUPO', 'DOBLE_GRADO', 'NUMMAT', 'BLOQUEO',
          'FECHA_ULT_MOD_MATRICULA'
        ]
      }))
      .on('data', (data: any) => results.push(data))
      .on('end', async () => {
        try {
          console.log(`📊 Se encontraron ${results.length} registros de expedientes.`);
          
          let importedCount = 0;
          for (const record of results) {
            try {
              const id = parseInt(record.id) || importedCount + 1;
              
              // Mapear los campos del CSV a la estructura de la tabla ExpedienteAlumno
              await prisma.expedienteAlumno.upsert({
                where: { id },
                update: {
                  PRS_CODNUM: record.PRS_CODNUM ? parseInt(record.PRS_CODNUM) : null,
                  DNI: record.DNI || null,
                  LLENIF: record.LLENIF || null,
                  APE1: record.APE1 || null,
                  APE2: record.APE2 || null,
                  NOMBRE: record.NOMBRE || null,
                  FECHA_NACIMIENTO: record.FECHA_NACIMIENTO || null,
                  SEXO: record.SEXO || null,
                  EMAIL: record.EMAIL || null,
                  CARRERA: record.CARRERA || null,
                  MODO_ACCESO: record.MODO_ACCESO || null,
                  CARDENOM: record.CARDENOM || null,
                  CONVOCA: record.CONVOCA || null,
                  CODIGO: record.CODIGO || null,
                  ASIG_DENOM: record.ASIG_DENOM || null,
                  CURSO: record.CURSO ? parseFloat(record.CURSO) : null,
                  CURSO_PLAN: record.CURSO_PLAN ? parseFloat(record.CURSO_PLAN) : null,
                  GRUPO: record.GRUPO || null,
                  DOBLE_GRADO: record.DOBLE_GRADO || null,
                  NUMMAT: record.NUMMAT ? parseFloat(record.NUMMAT) : null,
                  BLOQUEO: record.BLOQUEO || null,
                  FECHA_ULT_MOD_MATRICULA: record.FECHA_ULT_MOD_MATRICULA || null
                },
                create: {
                  id,
                  PRS_CODNUM: record.PRS_CODNUM ? parseInt(record.PRS_CODNUM) : null,
                  DNI: record.DNI || null,
                  LLENIF: record.LLENIF || null,
                  APE1: record.APE1 || null,
                  APE2: record.APE2 || null,
                  NOMBRE: record.NOMBRE || null,
                  FECHA_NACIMIENTO: record.FECHA_NACIMIENTO || null,
                  SEXO: record.SEXO || null,
                  EMAIL: record.EMAIL || null,
                  CARRERA: record.CARRERA || null,
                  MODO_ACCESO: record.MODO_ACCESO || null,
                  CARDENOM: record.CARDENOM || null,
                  CONVOCA: record.CONVOCA || null,
                  CODIGO: record.CODIGO || null,
                  ASIG_DENOM: record.ASIG_DENOM || null,
                  CURSO: record.CURSO ? parseFloat(record.CURSO) : null,
                  CURSO_PLAN: record.CURSO_PLAN ? parseFloat(record.CURSO_PLAN) : null,
                  GRUPO: record.GRUPO || null,
                  DOBLE_GRADO: record.DOBLE_GRADO || null,
                  NUMMAT: record.NUMMAT ? parseFloat(record.NUMMAT) : null,
                  BLOQUEO: record.BLOQUEO || null,
                  FECHA_ULT_MOD_MATRICULA: record.FECHA_ULT_MOD_MATRICULA || null
                }
              });
              
              importedCount++;
              if (importedCount % 50 === 0) {
                console.log(`✅ Importados ${importedCount} expedientes`);
              }
            } catch (error: any) {
              console.error(`❌ Error importando expediente: ${error.message}`, record);
            }
          }
          
          console.log(`✅ Importación completada. Total de expedientes importados: ${importedCount}`);
          resolve();
        } catch (error: any) {
          console.error(`❌ Error en la importación de expedientes: ${error.message}`);
          reject(error);
        }
      })
      .on('error', (error: Error) => {
        console.error(`❌ Error leyendo el archivo CSV: ${error.message}`);
        reject(error);
      });
  });
}

/**
 * Importa datos de CSV a la tabla OfertaAcademica
 */
export async function importOfertaAcademica(csvPath: string): Promise<void> {
  console.log(`🌱 Comprobando si es necesario importar datos de oferta académica desde ${csvPath}...`);
  
  // Verificar si ya existen datos en la tabla
  const existingCount = await prisma.ofertaAcademica.count();
  if (existingCount > 0) {
    console.log(`✅ Ya existen ${existingCount} registros de oferta académica en la base de datos. Omitiendo importación.`);
    return;
  }
  
  console.log(`🌱 Importando datos de oferta académica desde ${csvPath}...`);
  
  const results: any[] = [];
  
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({
        separator: ',',
        skipLines: 0,
        headers: [
          'id', 'ANY_ANYACA', 'DENOMINACION', 'ID_BOLONIA', 'BOLONIA',
          'CARRERAS', 'DEN_GUIAS_DOC', 'CURSOS', 'CURSO_PLAN',
          'COD_AGORA', 'MATERIA', 'MATERIA_PLAN', 'GRUPOS',
          'CREDITOS', 'CUATRIMESTRE', 'TIPODEMATERIA', 'HORAS_SEMANA_1C',
          'HORAS_SEMANA_2C', 'PORC_DOC', 'MODULO_PLAN', 'AREA', 'COD_MATERIA'
        ]
      }))
      .on('data', (data: any) => results.push(data))
      .on('end', async () => {
        try {
          console.log(`📊 Se encontraron ${results.length} registros de oferta académica.`);
          
          let importedCount = 0;
          for (const record of results) {
            try {
              const id = parseInt(record.id) || importedCount + 1;
              
              // Mapear los campos del CSV a la estructura de la tabla OfertaAcademica
              await prisma.ofertaAcademica.upsert({
                where: { id },
                update: {
                  ANY_ANYACA: record.ANY_ANYACA || null,
                  DENOMINACION: record.DENOMINACION || null,
                  ID_BOLONIA: record.ID_BOLONIA || null,
                  BOLONIA: record.BOLONIA || null,
                  CARRERAS: record.CARRERAS || null,
                  DEN_GUIAS_DOC: record.DEN_GUIAS_DOC || null,
                  CURSOS: record.CURSOS || null,
                  CURSO_PLAN: record.CURSO_PLAN || null,
                  COD_AGORA: record.COD_AGORA || null,
                  MATERIA: record.MATERIA || null,
                  MATERIA_PLAN: record.MATERIA_PLAN || null,
                  GRUPOS: record.GRUPOS || null,
                  CREDITOS: record.CREDITOS ? parseFloat(record.CREDITOS) : null,
                  CUATRIMESTRE: record.CUATRIMESTRE || null,
                  TIPODEMATERIA: record.TIPODEMATERIA || null,
                  HORAS_SEMANA_1C: record.HORAS_SEMANA_1C ? parseFloat(record.HORAS_SEMANA_1C) : null,
                  HORAS_SEMANA_2C: record.HORAS_SEMANA_2C ? parseFloat(record.HORAS_SEMANA_2C) : null,
                  PORC_DOC: record.PORC_DOC || null,
                  MODULO_PLAN: record.MODULO_PLAN || null,
                  AREA: record.AREA || null,
                  COD_MATERIA: record.COD_MATERIA || null
                },
                create: {
                  id,
                  ANY_ANYACA: record.ANY_ANYACA || null,
                  DENOMINACION: record.DENOMINACION || null,
                  ID_BOLONIA: record.ID_BOLONIA || null,
                  BOLONIA: record.BOLONIA || null,
                  CARRERAS: record.CARRERAS || null,
                  DEN_GUIAS_DOC: record.DEN_GUIAS_DOC || null,
                  CURSOS: record.CURSOS || null,
                  CURSO_PLAN: record.CURSO_PLAN || null,
                  COD_AGORA: record.COD_AGORA || null,
                  MATERIA: record.MATERIA || null,
                  MATERIA_PLAN: record.MATERIA_PLAN || null,
                  GRUPOS: record.GRUPOS || null,
                  CREDITOS: record.CREDITOS ? parseFloat(record.CREDITOS) : null,
                  CUATRIMESTRE: record.CUATRIMESTRE || null,
                  TIPODEMATERIA: record.TIPODEMATERIA || null,
                  HORAS_SEMANA_1C: record.HORAS_SEMANA_1C ? parseFloat(record.HORAS_SEMANA_1C) : null,
                  HORAS_SEMANA_2C: record.HORAS_SEMANA_2C ? parseFloat(record.HORAS_SEMANA_2C) : null,
                  PORC_DOC: record.PORC_DOC || null,
                  MODULO_PLAN: record.MODULO_PLAN || null,
                  AREA: record.AREA || null,
                  COD_MATERIA: record.COD_MATERIA || null
                }
              });
              
              importedCount++;
              if (importedCount % 50 === 0) {
                console.log(`✅ Importados ${importedCount} ofertas académicas`);
              }
            } catch (error: any) {
              console.error(`❌ Error importando oferta académica: ${error.message}`, record);
            }
          }
          
          console.log(`✅ Importación completada. Total de ofertas académicas importadas: ${importedCount}`);
          resolve();
        } catch (error: any) {
          console.error(`❌ Error en la importación de ofertas académicas: ${error.message}`);
          reject(error);
        }
      })
      .on('error', (error: Error) => {
        console.error(`❌ Error leyendo el archivo CSV: ${error.message}`);
        reject(error);
      });
  });
}
