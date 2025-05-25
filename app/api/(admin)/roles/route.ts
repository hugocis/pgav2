import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todos los roles
export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        userRoles: true
      },
      orderBy: {
        id: 'asc',
      },
    });

    return NextResponse.json(roles, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los roles:', error);
    return NextResponse.json(
      { error: 'Error al obtener los roles' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo rol
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar los campos requeridos
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, description' },
        { status: 400 }
      );
    }

    // Verificar si el rol ya existe
    const existingRole = await prisma.role.findFirst({
      where: {
        name: body.name
      }
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Ya existe un rol con ese nombre' },
        { status: 409 }
      );
    }

    // Crear el nuevo rol
    const newRole = await prisma.role.create({
      data: {
        name: body.name,
        description: body.description,
        // Si se proporciona un ID específico, usarlo
        ...(body.id ? { id: body.id } : {})
      },
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'role',
      entityId: newRole.id.toString(),
      details: `Creación del rol "${newRole.name}" con descripción: "${newRole.description}"`
    });


    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('Error al crear el rol:', error);
    return NextResponse.json(
      { error: 'Error al crear el rol' },
      { status: 500 }
    );
  }
}
