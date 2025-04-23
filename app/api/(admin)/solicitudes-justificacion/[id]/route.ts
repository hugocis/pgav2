import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener una solicitud de justificación específica por ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'El ID de la solicitud de justificación es obligatorio' },
                { status: 400 }
            );
        }

        const solicitud = await prisma.solicitudJustificacion.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        surname1: true,
                        surname2: true,
                        email: true
                    }
                },
                estadoJustificacion: true,
                asistenciaAlumno: {
                    include: {
                        sesionClase: {
                            include: {
                                grupo: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                name: true,
                                surname1: true,
                                surname2: true,
                                email: true
                            }
                        },
                        estadoAsistencia: true
                    }
                },
                DocumentacionJustificacion: true
            }
        });

        if (!solicitud) {
            return NextResponse.json(
                { error: 'Solicitud de justificación no encontrada' },
                { status: 404 }
            );
        }

        return NextResponse.json(solicitud, { status: 200 });
    } catch (error) {
        console.error('Error al obtener la solicitud de justificación:', error);
        return NextResponse.json(
            { error: 'Error al obtener la solicitud de justificación' },
            { status: 500 }
        );
    }
}

// PUT - Actualizar una solicitud de justificación específica por ID
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            alegacion,
            respuesta,
            fechaAlegacion,
            fechaRespuesta,
            alumnoId,
            estadoJustificacionId,
            asistenciaAlumnoId
        } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'El ID de la solicitud de justificación es obligatorio' },
                { status: 400 }
            );
        }

        // Verificar si la solicitud existe
        const solicitudExistente = await prisma.solicitudJustificacion.findUnique({
            where: { id }
        });

        if (!solicitudExistente) {
            return NextResponse.json(
                { error: 'Solicitud de justificación no encontrada' },
                { status: 404 }
            );
        }

        // Preparar los datos para la actualización
        const dataToUpdate: Prisma.SolicitudJustificacionUpdateInput = {};

        if (alegacion !== undefined) dataToUpdate.alegacion = alegacion;
        if (respuesta !== undefined) dataToUpdate.respuesta = respuesta;
        if (fechaAlegacion !== undefined) dataToUpdate.fechaAlegacion = new Date(fechaAlegacion);
        if (fechaRespuesta !== undefined) dataToUpdate.fechaRespuesta = fechaRespuesta ? new Date(fechaRespuesta) : null;

        if (alumnoId !== undefined) {
            // Verificar si el alumno existe
            const alumnoExistente = await prisma.user.findUnique({
                where: { id: alumnoId }
            });

            if (!alumnoExistente) {
                return NextResponse.json(
                    { error: 'El alumno especificado no existe' },
                    { status: 400 }
                );
            }

            dataToUpdate.user = {
                connect: { id: alumnoId }
            };
        }

        if (estadoJustificacionId !== undefined) {
            // Verificar si el estado de justificación existe
            const estadoExistente = await prisma.estadoJustificacion.findUnique({
                where: { id: estadoJustificacionId }
            });

            if (!estadoExistente) {
                return NextResponse.json(
                    { error: 'El estado de justificación especificado no existe' },
                    { status: 400 }
                );
            }

            dataToUpdate.estadoJustificacion = {
                connect: { id: estadoJustificacionId }
            };
        }

        if (asistenciaAlumnoId !== undefined) {
            // Verificar si la asistencia existe
            const asistenciaExistente = await prisma.asistenciaAlumno.findUnique({
                where: { id: asistenciaAlumnoId }
            });

            if (!asistenciaExistente) {
                return NextResponse.json(
                    { error: 'El registro de asistencia especificado no existe' },
                    { status: 400 }
                );
            }

            dataToUpdate.asistenciaAlumno = {
                connect: { id: asistenciaAlumnoId }
            };
        }

        // Actualizar la solicitud de justificación
        const solicitudActualizada = await prisma.solicitudJustificacion.update({
            where: { id },
            data: dataToUpdate
        });

        await logActivity({
            req: request,
            action: 'update',
            entityType: 'solicitudJustificacion',
            entityId: solicitudActualizada.id,
            details: `Actualización de la solicitud de justificación del alumno con ID ${solicitudActualizada.alumnoId}`,
            prevValue: solicitudExistente
        });


        return NextResponse.json(solicitudActualizada, { status: 200 });
    } catch (error) {
        console.error('Error al actualizar la solicitud de justificación:', error);
        return NextResponse.json(
            { error: 'Error al actualizar la solicitud de justificación' },
            { status: 500 }
        );
    }
}

// DELETE - Eliminar una solicitud de justificación específica por ID
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'El ID de la solicitud de justificación es obligatorio' },
                { status: 400 }
            );
        }

        // Verificar si la solicitud existe
        const solicitudExistente = await prisma.solicitudJustificacion.findUnique({
            where: { id: id },
            include: {
                user: {
                    select: {
                        email: true
                    }
                }
            }
        });

        if (!solicitudExistente) {
            return NextResponse.json(
                { error: 'Solicitud de justificación no encontrada' },
                { status: 404 }
            );
        }

        // Verificar si hay documentos de justificación asociados
        const documentosAsociados = await prisma.documentacionJustificacion.findFirst({
            where: { solicitudJustificacionId: id }
        });

        if (documentosAsociados) {
            // Eliminar todos los documentos de justificación asociados
            await prisma.documentacionJustificacion.deleteMany({
                where: { solicitudJustificacionId: id }
            });
        }

        // Eliminar la solicitud de justificación
        await prisma.solicitudJustificacion.delete({
            where: { id: id }
        });

        await logActivity({
            req: request,
            action: 'delete',
            entityType: 'solicitudJustificacion',
            entityId: solicitudExistente.id,
            details: `Eliminación de solicitud de justificación del alumno ${solicitudExistente.user.email}`,
            prevValue: solicitudExistente
        });


        return NextResponse.json({ message: 'Solicitud de justificación eliminada correctamente' }, { status: 200 });
    } catch (error) {
        console.error('Error al eliminar la solicitud de justificación:', error);
        return NextResponse.json(
            { error: 'Error al eliminar la solicitud de justificación' },
            { status: 500 }
        );
    }
}
