import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import * as XLSX from 'xlsx';

// POST - Generar un Excel
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.roles.includes('Manager')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { datos, estadisticas } = data;
    
    // Crear un nuevo libro de Excel
    const workbook = XLSX.utils.book_new();
    
    // Crear hoja de datos
    const worksheet = XLSX.utils.json_to_sheet(datos);
    
    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, "Firmas Docente");
    
    // Añadir estadísticas como una hoja adicional
    const statsData = [
      { Estadística: "Total de sesiones", Valor: estadisticas.total },
      { Estadística: "Sesiones firmadas", Valor: estadisticas.firmadas },
      { Estadística: "Sesiones pendientes", Valor: estadisticas.pendientes }
    ];
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, "Estadísticas");
    
    // Generar el archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    // Devolver el archivo Excel
    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="firmas-docente.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error al generar Excel:', error);
    return NextResponse.json(
      { error: 'Error al generar el Excel' },
      { status: 500 }
    );
  }
}
