import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import PDFDocument from 'pdfkit';

// POST - Generar un PDF
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
    const { titulo, subtitulo, fecha, datos, estadisticas } = data;
    
    // Crear un nuevo documento PDF
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    // Configurar la respuesta
    const chunks: Uint8Array[] = [];
    
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    
    const streamPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(result);
      });
    });
    
    // Añadir logo y título
    doc.fontSize(18).font('Helvetica-Bold').text('Universidad Francisco de Vitoria', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text(titulo, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(subtitulo, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generado el: ${new Date().toLocaleString('es-ES')}`, { align: 'center' });
    doc.moveDown(1);
    
    // Añadir estadísticas
    doc.fontSize(12).font('Helvetica-Bold').text('Estadísticas', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total de sesiones: ${estadisticas.total}`, { continued: true });
    doc.text(`   Firmadas: ${estadisticas.firmadas}`, { continued: true });
    doc.text(`   Pendientes: ${estadisticas.pendientes}`);
    doc.moveDown(1);
    
    // Crear tabla
    const tableTop = 200;
    const tableHeaders = ['Profesor', 'Asignatura', 'Grupo', 'Hora', 'Estado', 'Hora Firma'];
    const tableColumnWidths = [150, 150, 60, 60, 60, 60];
    
    let yPos = tableTop;
    let xPos = 50;
    
    // Dibujar encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    tableHeaders.forEach((header, i) => {
      doc.text(header, xPos, yPos, { width: tableColumnWidths[i], align: 'left' });
      xPos += tableColumnWidths[i];
    });
    
    // Dibujar línea debajo de encabezados
    yPos += 15;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 10;
    
    // Dibujar datos
    doc.fontSize(9).font('Helvetica');
    for (const fila of datos) {
      // Verificar si necesitamos una nueva página
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
        
        // Repetir encabezados en la nueva página
        xPos = 50;
        doc.fontSize(10).font('Helvetica-Bold');
        tableHeaders.forEach((header, i) => {
          doc.text(header, xPos, yPos, { width: tableColumnWidths[i], align: 'left' });
          xPos += tableColumnWidths[i];
        });
        
        // Dibujar línea debajo de encabezados
        yPos += 15;
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 10;
        doc.fontSize(9).font('Helvetica');
      }
      
      // Colorear fila según estado
      let fillColor: string;
      if (fila.estado === 'Firmada') {
        fillColor = '#E8F5E9';
      } else if (fila.estado === 'Programada') {
        fillColor = '#E8F0F8';
      } else {
        fillColor = '#FFEBEE';
      }
      
      // Dibujar rectángulo de fondo
      doc.rect(50, yPos - 5, 500, 20).fill(fillColor).stroke('white');
      
      // Escribir datos de la fila
      xPos = 50;
      doc.fillColor('black');
      
      // Profesor
      doc.text(fila.profesor, xPos, yPos, { width: tableColumnWidths[0], align: 'left' });
      xPos += tableColumnWidths[0];
      
      // Asignatura
      doc.text(fila.asignatura, xPos, yPos, { width: tableColumnWidths[1], align: 'left' });
      xPos += tableColumnWidths[1];
      
      // Grupo
      doc.text(fila.grupo, xPos, yPos, { width: tableColumnWidths[2], align: 'left' });
      xPos += tableColumnWidths[2];
      
      // Hora
      doc.text(fila.hora, xPos, yPos, { width: tableColumnWidths[3], align: 'left' });
      xPos += tableColumnWidths[3];
      
      // Estado
      doc.text(fila.estado, xPos, yPos, { width: tableColumnWidths[4], align: 'left' });
      xPos += tableColumnWidths[4];
      
      // Hora Firma
      doc.text(fila.horaFirma || '-', xPos, yPos, { width: tableColumnWidths[5], align: 'left' });
      
      yPos += 20;
    }
    
    // Pie de página
    doc.fontSize(10).text('© Universidad Francisco de Vitoria - Sistema de Gestión de Asistencia', { align: 'center' });
    
    // Finalizar el documento
    doc.end();
    
    const pdfBuffer = await streamPromise;
    
    // Convertir el buffer a un Uint8Array que NextResponse puede manejar
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="firmas-docente-${fecha}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF' },
      { status: 500 }
    );
  }
}
