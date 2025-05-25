import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todas las configuraciones de carreras
export async function GET() {
  try {
    const configuraciones = await prisma.configuracionCarrera.findMany({
      include: {
        carrera: true,
      },
    });

    return NextResponse.json(configuraciones, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las configuraciones de carreras:', error);
    return NextResponse.json(
      { error: 'Error al obtener las configuraciones de carreras' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva configuración de carrera
export async function POST(request: Request) {
  try {    const data = await request.json();    // Validación de datos - verificar que carreraId esté presente
    if (data.carreraId === undefined || data.carreraId === null) {
      console.log('Datos recibidos en POST sin carreraId:', data);
      return NextResponse.json(
        { message: 'El ID de la carrera es obligatorio' },
        { status: 400 }
      );
    }
    
    // Convertir carreraId a string para Prisma (ya que el modelo lo define como String)
    data.carreraId = data.carreraId.toString();

    // Comprobamos si ya existe una configuración para esta carrera
    const existingConfig = await prisma.configuracionCarrera.findFirst({
      where: { carreraId: data.carreraId }
    });
    
    if (existingConfig) {
      return NextResponse.json(
        { message: 'Ya existe una configuración para esta carrera' },
        { status: 400 }
      );
    }
    
    // Crear la configuración
    const nuevaConfiguracion = await prisma.configuracionCarrera.create({
      data: {
        carreraId: data.carreraId,
        FechaInicioDispensa: data.FechaInicioDispensa,
        FechaFinDispensa: data.FechaFinDispensa,
        SolDispensa: data.SolDispensa,
        SolJustificacion: data.SolJustificacion
      },
      include: {
        carrera: true
      }
    });
    
    // Registrar la actividad
    await logActivity({
      req: request,
      action: 'create',
      entityType: 'CONFIGURACION_CARRERA',
      entityId: nuevaConfiguracion.id.toString(),
      details: `Nueva configuración creada para la carrera: ${nuevaConfiguracion.carrera.denominacion}`
    });

    return NextResponse.json(nuevaConfiguracion, { status: 201 });
  } catch (error) {
    console.error('Error al crear la configuración de carrera:', error);
    return NextResponse.json(
      { message: 'Error al crear la configuración de carrera' },
      { status: 500 }
    );
  }
}
