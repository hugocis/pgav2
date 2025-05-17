import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de filtrado
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;
    // Construir filtro
    const where: Prisma.ActivityLogWhereInput = {};
    
    if (action) {
      where.action = action;
    }
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    // Filtro por fecha
    if (startDate || endDate) {
      where.timestamp = {};
      
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      
      if (endDate) {
        // Ajustar la fecha final al final del día
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.timestamp.lte = endDateTime;
      }
    }
    
    // Contar total de registros para paginación
    const totalActivities = await prisma.activityLog.count({
      where,
    });
    
    // Obtener registros con paginación y filtros
    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip,
      take: pageSize
    });
    
    // Procesar resultados para mejorar la presentación
    const processedActivities = activities.map(activity => {
      // Agregar nombre completo del usuario si está disponible
      if (activity.user) {
        activity.user.name = `${activity.user.name} ${activity.user.surname1 || ''}`.trim();
      }
      
      return activity;
    });
    
    return NextResponse.json({
      activities: processedActivities,
      totalActivities,
      totalPages: Math.ceil(totalActivities / pageSize),
      currentPage: page
    });
    
  } catch (error) {
    console.error('Error al obtener los registros de actividad:', error);
    return NextResponse.json(
      { error: 'Error al obtener los registros de actividad' }, 
      { status: 500 }
    );
  }
}
