// app/api/alumnos-grupo/[grupoId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET – Obtener todos los AlumnoGrupo de un grupo concreto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  try {
    // Desenpaquetamos el Promise<{ grupoId }>
    const { grupoId } = await params
    const grupoIdNum = parseInt(grupoId, 10)

    if (isNaN(grupoIdNum)) {
      return NextResponse.json(
        { error: 'El parámetro grupoId debe ser un número entero.' },
        { status: 400 }
      )
    }

    const alumnosGrupo = await prisma.alumnoGrupo.findMany({
      where: { grupoId: grupoId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          },
        },
        grupo: {
          select: {
            id: true,
            denominacion: true,
          },
        },
      },
    })

    return NextResponse.json(alumnosGrupo, { status: 200 })
  } catch (error) {
    console.error('Error al obtener AlumnoGrupo:', error)
    return NextResponse.json(
      { error: 'Error interno al obtener AlumnoGrupo' },
      { status: 500 }
    )
  }
}
