import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// Función auxiliar para generar datos simulados
function generarDatosAlumnoSimulados(id: string, nombreCompleto: string, email: string) {
  // Separa el nombre completo
  const partes = nombreCompleto.split(' ');
  const nombre = partes[0] || '';
  const apellido1 = partes[1] || '';
  const apellido2 = partes[2] || '';

  // Genera fechas aleatorias para asistencia (últimos 30 días)
  const asistencias = [];
  const asignaturas = ['Matemáticas', 'Física', 'Química', 'Historia', 'Literatura'];
  const estados = ['Presente', 'Ausente', 'Justificado'];
  
  for (let i = 0; i < 30; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    
    asistencias.push({
      fecha: fecha.toISOString().split('T')[0],
      asignatura: asignaturas[Math.floor(Math.random() * asignaturas.length)],
      estado: estados[Math.floor(Math.random() * estados.length)]
    });
  }
  
  // Genera calificaciones aleatorias
  const calificaciones = asignaturas.map(asignatura => ({
    asignatura,
    nota: Math.floor(Math.random() * 5) + 5 // Nota entre 5 y 10
  }));
  
  return {
    id,
    nombre,
    apellidos: `${apellido1} ${apellido2}`.trim(),
    dni: `${Math.floor(Math.random() * 90000000) + 10000000}A`,
    carrera: 'Ingeniería Informática',
    curso: Math.floor(Math.random() * 4) + 1,
    email,
    telefono: `6${Math.floor(Math.random() * 10000000) + 10000000}`,
    mentor: 'Carlos Rodríguez',
    goe: Math.random() > 0.8, // 20% de probabilidad de que necesite GOE
    notas: '',
    fechaNacimiento: '1995-05-15',
    direccion: 'Calle Principal 123, Madrid',
    asistencia: asistencias,
    calificaciones
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    // Buscar el usuario con rol ALUMNO
    const alumno = await prisma.user.findFirst({
      where: {
        id: id,
        userRoles: {
          some: {
            role: {
              name: "ALUMNO"
            }
          }
        },
        lockout: false
      },
      select: {
        id: true,
        name: true,
        surname1: true,
        surname2: true,
        email: true
      }
    });

    if (!alumno) {
      return NextResponse.json(
        { error: 'Alumno no encontrado o no tienes acceso a este alumno' },
        { status: 404 }
      );
    }

    // Generar datos simulados para este alumno
    const nombreCompleto = `${alumno.name || ''} ${alumno.surname1 || ''} ${alumno.surname2 || ''}`.trim();
    const datosAlumno = generarDatosAlumnoSimulados(id, nombreCompleto, alumno.email);    // Registrar la actividad
    await logActivity({
      req,
      action: 'update',
      entityType: 'PEC_ALUMNO_DETALLE',
      entityId: id,
      details: `El PEC ha consultado los detalles del alumno ${alumno.name || ''} ${alumno.surname1 || ''}`,
    });

    return NextResponse.json(datosAlumno);
  } catch (error) {
    console.error('Error al obtener detalles del alumno:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos del alumno' },
      { status: 500 }
    );
  }
}
