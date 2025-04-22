import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash, compare } from 'bcrypt';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario está autenticado
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    
    // Obtener los datos de la solicitud
    const { currentPassword, newPassword } = await req.json();
    
    // Validar datos recibidos
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Se requiere la contraseña actual y la nueva' }, 
        { status: 400 }
      );
    }
    
    // Validar longitud de la nueva contraseña
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: 'La contraseña debe tener al menos 8 caracteres' }, 
        { status: 400 }
      );
    }
    
    // Buscar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true }
    });
    
    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }
    
    // Verificar la contraseña actual
    const passwordMatch = await compare(currentPassword, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ message: 'Contraseña actual incorrecta' }, { status: 401 });
    }
    
    // Generar hash de la nueva contraseña
    const hashedPassword = await hash(newPassword, 10);
    
    // Actualizar la contraseña del usuario
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    return NextResponse.json({
      message: 'Contraseña actualizada correctamente'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    return NextResponse.json(
      { message: 'Error al procesar la solicitud' }, 
      { status: 500 }
    );
  }
}
