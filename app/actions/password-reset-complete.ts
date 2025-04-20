'use server';

import prisma  from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function completePasswordReset(token: string, newPassword: string) {
  try {
    // Buscar usuario con ese token que no haya expirado
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date() // El token no ha expirado
        }
      },
    });

    if (!user) {
      return { success: false, message: 'El enlace es inválido o ha expirado. Por favor, solicita un nuevo enlace de restablecimiento.' };
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña y eliminar el token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Registrar el cambio de contraseña en el log de actividad
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        details: 'Contraseña restablecida correctamente',
        ipAddress: '',
      }
    });

    return { success: true, message: 'Tu contraseña ha sido actualizada correctamente' };
  } catch (error) {
    console.error('Error en completePasswordReset:', error);
    return { success: false, message: 'Ha ocurrido un error al restablecer tu contraseña' };
  }
}
