import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET para obtener una asignación específica por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
      // Verificar que el usuario tenga el rol de PEC o ADMIN (insensible a mayúsculas/minúsculas)
    const userRoles = session.user.roles.map(role => role.toUpperCase());
    if (!userRoles.includes('PEC') && !userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    const asignacion = await prisma.pecCarreraCurso.findUnique({
      where: { id: params.id },
      include: { carrera: true },
    });
    
    if (!asignacion) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }
      // Si el usuario es un PEC (y no es admin), asegúrese de que solo pueda ver sus propias asignaciones
    if (userRoles.includes('PEC') && !userRoles.includes('ADMIN')) {
      if (asignacion.pecId !== session.user.id) {
        return NextResponse.json({ error: 'No autorizado para acceder a esta asignación' }, { status: 403 });
      }
    }
    
    // Registrar la actividad
    await logActivity({
      req,
      action: 'update', // Usando 'update' en lugar de 'view' para cumplir con el tipo
      entityType: 'PEC_ASIGNACIONES',
      entityId: params.id,
      details: `Se ha consultado la asignación con ID ${params.id}`,
    });
    
    return NextResponse.json(asignacion);
  } catch (error) {
    console.error('Error al obtener asignación:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}

// PUT para actualizar una asignación existente
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
      // Solo los administradores pueden actualizar asignaciones (insensible a mayúsculas/minúsculas)
    const userRoles = session.user.roles.map(role => role.toUpperCase());
    if (!userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
      const data = await req.json();
    
    // Verificar datos requeridos
    if (!data.carreraId || !data.curso) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (carreraId, curso)' },
        { status: 400 }
      );
    }
    
    // Verificar que la asignación exista
    const existingAssignment = await prisma.pecCarreraCurso.findUnique({
      where: { id: params.id }
    });
    
    if (!existingAssignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }
    
    // Verificar si ya existe otra asignación activa con la misma combinación
    const duplicateAssignment = await prisma.pecCarreraCurso.findFirst({
      where: {
        id: { not: params.id }, // Excluir la asignación actual
        pecId: existingAssignment.pecId,
        carreraId: data.carreraId,
        curso: data.curso,
        activo: true,
      }
    });
    
    if (duplicateAssignment) {
      return NextResponse.json(
        { error: 'Ya existe otra asignación activa para esta combinación de PEC, carrera y curso' },
        { status: 409 }
      );
    }
    
    // Actualizar la asignación
    const updatedAssignment = await prisma.pecCarreraCurso.update({
      where: { id: params.id },
      data: {
        carreraId: data.carreraId,
        curso: data.curso,
        activo: data.activo !== undefined ? data.activo : existingAssignment.activo,
      }
    });
    
    // Registrar la actividad
    await logActivity({
      req,
      action: 'update',
      entityType: 'PEC_ASIGNACIONES',
      entityId: params.id,
      details: `Se ha actualizado la asignación con ID ${params.id}`,
    });
    
    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error('Error al actualizar asignación:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}

// DELETE para eliminar/desactivar una asignación
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
      // Solo los administradores pueden eliminar asignaciones (insensible a mayúsculas/minúsculas)
    const userRoles = session.user.roles.map(role => role.toUpperCase());
    if (!userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    // Verificar que la asignación exista
    const existingAssignment = await prisma.pecCarreraCurso.findUnique({
      where: { id: params.id }
    });
    
    if (!existingAssignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }
    
    // Desactivar la asignación en lugar de eliminarla completamente
    // Esto preserva el historial y previene problemas de integridad de datos
    await prisma.pecCarreraCurso.update({
      where: { id: params.id },
      data: { activo: false }
    });
    
    // Registrar la actividad
    await logActivity({
      req,
      action: 'delete',
      entityType: 'PEC_ASIGNACIONES',
      entityId: params.id,
      details: `Se ha desactivado la asignación con ID ${params.id}`,
    });
    
    return NextResponse.json({ success: true, message: 'Asignación desactivada correctamente' });
  } catch (error) {
    console.error('Error al eliminar asignación:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
