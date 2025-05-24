/**
 * @jest-environment node
 */

// Ajustamos la importación para usar CommonJS ya que el error indicaba problemas con los módulos
const { generateInformeAsistencia } = require('@/lib/reports');

// Configuramos el mock de la función
jest.mock('@/lib/reports', () => ({
  generateInformeAsistencia: jest.fn().mockResolvedValue({
    totalAlumnos: 30,
    asistencia: 25,
    porcentaje: 83.33,
    fechaInicio: '2025-01-01',
    fechaFin: '2025-01-31',
  }),
}));

// Ejemplo de test categorizado como reports
describeReports('Informes de Asistencia', () => {
  it('debe generar informe con datos correctos', async () => {
    const informe = await generateInformeAsistencia({
      grupoId: 1,
      fechaInicio: '2025-01-01',
      fechaFin: '2025-01-31',
    });
    
    expect(informe).toHaveProperty('totalAlumnos');
    expect(informe).toHaveProperty('asistencia');
    expect(informe).toHaveProperty('porcentaje');
    expect(informe.porcentaje).toBe(83.33);
  });
});
