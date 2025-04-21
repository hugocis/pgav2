'use server';

import prisma  from '@/lib/prisma';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';

export async function resetPassword(email: string) {
  try {
    // Verificar si el correo existe en la base de datos
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, message: 'No existe una cuenta con este correo electrónico' };
    }

    // Generar token único
    const token = randomBytes(32).toString('hex');
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1); // El token expira en 1 hora

    // Guardar token en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiryDate,
      },
    });

    // Configurar transporte de email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    // URL para restablecer contraseña
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    // Contenido del correo
    const mailOptions = {
      from: `"Portal de Gestión de Asistencias UFV" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Solicitud de restablecimiento de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${process.env.NEXTAUTH_URL}/logo-UFV.png" alt="Logo UFV" style="max-height: 80px;" />
          </div>
          <h2 style="color: #0D3C68; margin-bottom: 20px;">Restablecimiento de contraseña</h2>
          <p>Estimado/a usuario/a,</p>
          <p>Has solicitado restablecer tu contraseña para el Portal de Gestión de Asistencias de la Universidad Francisco de Vitoria.</p>
          <p>Haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #0D3C68; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Restablecer contraseña</a>
          </div>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no has solicitado este cambio, puedes ignorar este correo y tu contraseña seguirá siendo la misma.</p>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">Este es un correo automático, por favor no respondas a este mensaje.</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} Universidad Francisco de Vitoria. Todos los derechos reservados.
          </div>
        </div>
      `,
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);

    return { success: true, message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña' };
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return { success: false, message: 'Ha ocurrido un error al procesar tu solicitud' };
  }
}
