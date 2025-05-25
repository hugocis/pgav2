import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// POST: Asignar rol GOE a un alumno
export async function POST(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario sea PEC o ADMIN
    const userRoles = session.user.roles.map(role => role.toUpperCase());
    if (!userRoles.includes('PEC') && !userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener los datos de la solicitud
    const { alumnoId } = await req.json();

    if (!alumnoId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del alumno' },
        { status: 400 }
      );
    }

    // Verificar que el alumno existe
    const alumno = await prisma.user.findUnique({
      where: { id: alumnoId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!alumno) {
      return NextResponse.json(
        { error: 'No se encontró al alumno' },
        { status: 404 }
      );
    }

    // Verificar si el alumno ya tiene el rol GOE
    const tieneRolGOE = alumno.userRoles.some(
      (ur) => ur.role.name === 'GOE'
    );

    if (tieneRolGOE) {
      return NextResponse.json(
        { error: 'El alumno ya tiene el rol GOE asignado', status: 'ya_asignado' },
        { status: 200 }
      );
    }

    // Obtener el rol GOE
    const rolGOE = await prisma.role.findUnique({
      where: { name: 'GOE' },
    });

    if (!rolGOE) {
      return NextResponse.json(
        { error: 'No se encontró el rol GOE en el sistema' },
        { status: 500 }
      );
    }

    // Asignar el rol GOE al alumno
    const userRole = await prisma.userRole.create({
      data: {
        userId: alumnoId,
        roleId: rolGOE.id,
      },
      include: {
        user: true,
        role: true,
      },
    });

    // Registrar la actividad
    await logActivity({
      req,
      action: 'create',
      entityType: 'USER_ROLE',
      entityId: userRole.id,
      details: `Se asignó el rol GOE al alumno ${alumno.name} ${alumno.surname1 || ''} ${alumno.surname2 || ''}`,
    });

    return NextResponse.json({
      message: 'Rol GOE asignado correctamente',
      userRole,
    });
  } catch (error) {
    console.error('Error al asignar rol GOE:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// DELETE: Quitar rol GOE a un alumno
export async function DELETE(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario sea PEC o ADMIN
    const userRoles = session.user.roles.map(role => role.toUpperCase());
    if (!userRoles.includes('PEC') && !userRoles.includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener el alumnoId de los parámetros de la URL
    const url = new URL(req.url);
    const alumnoId = url.searchParams.get('alumnoId');

    if (!alumnoId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del alumno' },
        { status: 400 }
      );
    }

    // Verificar que el alumno existe
    const alumno = await prisma.user.findUnique({
      where: { id: alumnoId },
    });

    if (!alumno) {
      return NextResponse.json(
        { error: 'No se encontró al alumno' },
        { status: 404 }
      );
    }

    // Obtener el rol GOE
    const rolGOE = await prisma.role.findUnique({
      where: { name: 'GOE' },
    });

    if (!rolGOE) {
      return NextResponse.json(
        { error: 'No se encontró el rol GOE en el sistema' },
        { status: 500 }
      );
    }

    // Encontrar y eliminar la asignación de rol GOE
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: alumnoId,
        roleId: rolGOE.id,
      },
    });

    if (!userRole) {
      return NextResponse.json(
        { error: 'El alumno no tiene el rol GOE asignado', status: 'no_asignado' },
        { status: 200 }
      );
    }

    // Eliminar el rol
    await prisma.userRole.delete({
      where: {
        id: userRole.id,
      },
    });

    // Registrar la actividad
    await logActivity({
      req,
      action: 'delete',
      entityType: 'USER_ROLE',
      entityId: userRole.id,
      details: `Se eliminó el rol GOE del alumno ${alumno.name} ${alumno.surname1 || ''} ${alumno.surname2 || ''}`,
    });

    return NextResponse.json({
      message: 'Rol GOE eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar rol GOE:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
