import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener todos los estados de dispensa
    const estados = await prisma.estadoDispensa.findMany({
      orderBy: {
        denominacion: 'asc'
      }
    });

    return NextResponse.json(estados);

  } catch (error) {
    console.error('Error al obtener estados de dispensa:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario es administrador
    const roles = session.user.roles || [];
    const isAdmin = roles.includes('admin');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear estados de dispensa' },
        { status: 403 }
      );
    }

    // Obtener y validar los datos
    const data = await req.json();
    
    if (!data.denominacion || typeof data.denominacion !== 'string') {
      return NextResponse.json(
        { error: 'La denominación es requerida y debe ser una cadena de texto' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un estado con esa denominación
    const estadoExistente = await prisma.estadoDispensa.findFirst({
      where: {
        denominacion: {
          equals: data.denominacion,
          mode: 'insensitive' // Ignorar mayúsculas/minúsculas
        }
      }
    });

    if (estadoExistente) {
      return NextResponse.json(
        { error: 'Ya existe un estado de dispensa con esa denominación' },
        { status: 409 }
      );
    }

    // Crear el estado de dispensa
    const nuevoEstado = await prisma.estadoDispensa.create({
      data: {
        denominacion: data.denominacion
      }
    });

    return NextResponse.json(nuevoEstado, { status: 201 });

  } catch (error) {
    console.error('Error al crear estado de dispensa:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
