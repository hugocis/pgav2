import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario tenga el rol de PEC
    if (!session.user.roles.includes('PEC')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const { goe, notas } = await req.json();

    // Buscar el usuario para verificar que existe
    const alumno = await prisma.user.findFirst({
      where: {
        id: id,
        userRoles: {
          some: {
            role: {
              name: 'ALUMNO',
            },
          },
        },
        lockout: false,
      },
      select: {
        id: true,
        name: true,
        surname1: true,
      },
    });

    if (!alumno) {
      return NextResponse.json(
        { error: 'Alumno no encontrado o no tienes acceso a este alumno' },
        { status: 404 }
      );
    }    // Registrar la actividad
    await logActivity({
      req,
      action: 'update',
      entityType: 'PEC_ALUMNO_GOE',
      entityId: id,
      details: `El PEC ha ${goe ? 'marcado' : 'desmarcado'} al alumno ${
        alumno.name || ''
      } ${alumno.surname1 || ''} como GOE y actualizado sus notas`,
    });

    return NextResponse.json({
      id: alumno.id,
      goe,
      notas,
    });
  } catch (error) {
    console.error('Error al actualizar estado GOE del alumno:', error);
    return NextResponse.json(
      { error: 'Error al actualizar los datos del alumno' },
      { status: 500 }
    );
  }
}
