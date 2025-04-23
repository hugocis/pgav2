import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const cursoAcademico = await prisma.cursoAcademico.findUnique({
            where: { id },
        });

        if (!cursoAcademico) {
            return NextResponse.json(
                { error: 'Curso académico no encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(cursoAcademico, { status: 200 });
    } catch (error) {
        console.error('Error al obtener el curso académico:', error);
        return NextResponse.json(
            { error: 'Error al obtener el curso académico' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const body = await request.json();
        const { denominacion, activo, cursoAnterior, cursoSiguiente } = body;

        if (!denominacion) {
            return NextResponse.json(
                { error: 'La denominación es obligatoria' },
                { status: 400 }
            );
        }

        const formatoRegex = /^\d{4}-\d{2}$/;
        if (!formatoRegex.test(denominacion)) {
            return NextResponse.json(
                {
                    error:
                        'La denominación debe seguir el formato 1234-56 (por ejemplo: 2025-26)',
                },
                { status: 400 }
            );
        }

        const cursoExistente = await prisma.cursoAcademico.findUnique({
            where: { id },
        });

        if (!cursoExistente) {
            return NextResponse.json(
                { error: 'Curso académico no encontrado' },
                { status: 404 }
            );
        }

        if (activo) {
            await prisma.cursoAcademico.updateMany({
                where: { id: { not: id }, activo: true },
                data: { activo: false },
            });
        }

        const cursoActualizado = await prisma.cursoAcademico.update({
            where: { id },
            data: {
                denominacion,
                activo: activo !== undefined ? activo : cursoExistente.activo,
                cursoAnterior,
                cursoSiguiente,
            },
        });

        await logActivity({
            req: request,
            action: 'update',
            entityType: 'cursoAcademico',
            entityId: id,
            details: `Curso académico actualizado a ${denominacion}${activo ? ' (activado)' : ''}`
        });

        return NextResponse.json(cursoActualizado, { status: 200 });
    } catch (error) {
        console.error('Error al actualizar el curso académico:', error);
        return NextResponse.json(
            { error: 'Error al actualizar el curso académico' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const cursoExistente = await prisma.cursoAcademico.findUnique({
            where: { id },
        });

        if (!cursoExistente) {
            return NextResponse.json(
                { error: 'Curso académico no encontrado' },
                { status: 404 }
            );
        }

        const asignaturasRelacionadas = await prisma.asignatura.count({
            where: { cursoAcademicoId: id },
        });
        const alumnosPlanRelacionados = await prisma.alumnoPlan.count({
            where: { cursoAcademicoId: id },
        });

        if (asignaturasRelacionadas > 0 || alumnosPlanRelacionados > 0) {
            return NextResponse.json(
                {
                    error:
                        'No se puede eliminar el curso académico porque tiene elementos asociados',
                    asignaturas: asignaturasRelacionadas,
                    alumnosPlanes: alumnosPlanRelacionados,
                },
                { status: 400 }
            );
        }

        await prisma.cursoAcademico.delete({
            where: { id },
        });

        await logActivity({
            req: request,
            action: 'delete',
            entityType: 'cursoAcademico',
            entityId: id,
            details: `Curso académico eliminado: ${cursoExistente.denominacion}`
        });


        return NextResponse.json(
            { message: 'Curso académico eliminado correctamente' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error al eliminar el curso académico:', error);
        return NextResponse.json(
            { error: 'Error al eliminar el curso académico' },
            { status: 500 }
        );
    }
}
