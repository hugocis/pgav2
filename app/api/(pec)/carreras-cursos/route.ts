import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

export async function GET(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    
    // Imprimir información de depuración
    console.log('Roles del usuario:', session.user.roles);
    console.log('ID del usuario:', session.user.id);
    
    const url = new URL(req.url);
    const requestedPecId = url.searchParams.get('pecId');
    console.log('PecId solicitado:', requestedPecId);    // Verificar que el usuario tenga el rol de PEC o ADMIN (insensible a mayúsculas/minúsculas)
    const userRoles = session.user.roles.map(role => role.toUpperCase());
    console.log('Roles del usuario (normalizados):', userRoles);
    
    if (!userRoles.includes('PEC') && !userRoles.includes('ADMIN')) {
      console.log('Usuario no autorizado, roles normalizados:', userRoles);
      return NextResponse.json({ 
        error: 'No autorizado', 
        roles: session.user.roles,
        requiredRoles: ['PEC', 'ADMIN']
      }, { status: 403 });
    }
      console.log('Usuario autorizado, roles:', session.user.roles);
    
    // Obtener el ID del PEC desde la sesión o desde la URL si es admin
    let pecId = session.user.id;
    
    // Si es un administrador, puede solicitar datos de otro PEC mediante un parámetro en la URL
    if (userRoles.includes('ADMIN') && requestedPecId) {
      console.log('Admin solicitando datos de otro PEC:', requestedPecId);
      pecId = requestedPecId;
    }
    
    console.log('ID de PEC usado para la consulta:', pecId);

    // Obtener las carreras y cursos asignados al PEC
    const carrerasCursos = await prisma.pecCarreraCurso.findMany({
      where: {
        pecId: pecId,
      },
      include: {
        carrera: true,
      },
      orderBy: [
        { carrera: { denominacion: 'asc' } },
        { curso: 'asc' },
      ],
    });
      // Registrar la actividad
    await logActivity({
      req,
      action: 'update', // Cambiado de 'view' a 'update' para cumplir con el tipo
      entityType: 'PEC_ASIGNACIONES',
      entityId: pecId,
      details: `Se han consultado las asignaciones de carreras y cursos del PEC con ID ${pecId}`,
    });

    return NextResponse.json(carrerasCursos);
  } catch (error) {
    console.error('Error al obtener carreras y cursos del PEC:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos' },
      { status: 500 }
    );
  }
}

// Método POST para crear una nueva asignación de carrera y curso para un PEC
export async function POST(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    
    // Imprimir información de depuración
    console.log('POST - Roles del usuario:', session.user.roles);
    console.log('POST - ID del usuario:', session.user.id);
      // Verificar que el usuario tenga el rol de ADMIN (solo admins pueden crear asignaciones)
    const userRoles = session.user.roles.map(role => role.toUpperCase());
    if (!userRoles.includes('ADMIN')) {
      console.log('POST - Usuario no autorizado, roles normalizados:', userRoles);
      return NextResponse.json({ 
        error: 'No autorizado', 
        roles: session.user.roles,
        requiredRoles: ['ADMIN']
      }, { status: 403 });
    }
    
    // Obtener los datos de la solicitud
    const data = await req.json();
    console.log('POST - Datos recibidos:', data);
    
    if (!data.pecId || !data.carreraId || !data.curso) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (pecId, carreraId, curso)' },
        { status: 400 }
      );
    }
    
    // Verificar si ya existe una asignación activa para este PEC, carrera y curso
    const existingAssignment = await prisma.pecCarreraCurso.findFirst({
      where: {
        pecId: data.pecId,
        carreraId: data.carreraId,
        curso: data.curso,
        activo: true,
      }
    });
    
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Ya existe una asignación activa para esta combinación de PEC, carrera y curso' },
        { status: 409 }
      );
    }
    
    // Crear la nueva asignación
    const newAssignment = await prisma.pecCarreraCurso.create({
      data: {
        pecId: data.pecId,
        carreraId: data.carreraId,
        curso: data.curso,
        activo: true,
      }
    });
    
    // Registrar la actividad
    await logActivity({
      req,
      action: 'create',
      entityType: 'PEC_ASIGNACIONES',
      entityId: newAssignment.id,
      details: `Se ha creado una nueva asignación de carrera (${data.carreraId}) y curso (${data.curso}) para el PEC con ID ${data.pecId}`,
    });
    
    return NextResponse.json(newAssignment);
  } catch (error) {
    console.error('Error al crear asignación de carrera y curso:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
