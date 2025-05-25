import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash, compare } from 'bcrypt';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {    // Verify that the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Obtener los datos de la solicitud
    const { currentPassword, newPassword } = await req.json();
      // Validate received data
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Current and new passwords are required' }, 
        { status: 400 }
      );
    }
      // Validate new password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' }, 
        { status: 400 }
      );
    }
      // Find user in the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true }
    });
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
      // Verify current password
    const passwordMatch = await compare(currentPassword, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ message: 'Current password is incorrect' }, { status: 401 });
    }
      // Generate hash of the new password
    const hashedPassword = await hash(newPassword, 10);
    
    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
      return NextResponse.json({
      message: 'Password updated successfully'
    }, { status: 200 });
      } catch (error) {
    console.error('Error changing password:', error);    return NextResponse.json(
      { message: 'Error processing the request' }, 
      { status: 500 }
    );
  }
}
