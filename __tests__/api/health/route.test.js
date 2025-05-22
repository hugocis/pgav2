/**
 * @jest-environment node
 */
const { GET } = require('@/app/api/health/route');

describe('GET /api/health', () => {
  it('debe devolver el estado de salud de la aplicación', async () => {
    // Guardar la fecha antes de la llamada para comparar
    const beforeCallDate = new Date();
    
    // Llamar al endpoint
    const response = await GET();
    
    // Verificar la respuesta
    expect(response.status).toBe(200);
    
    const body = await response.json();
    
    // Verificar que el estado sea 'ok'
    expect(body.status).toBe('ok');
    
    // Verificar que el timestamp esté presente y sea una fecha ISO válida
    expect(body.timestamp).toBeDefined();
    
    // Convertir la respuesta del timestamp a fecha
    const responseDate = new Date(body.timestamp);
    
    // Verificar que la fecha es válida
    expect(responseDate instanceof Date).toBe(true);
    expect(responseDate.toString()).not.toBe('Invalid Date');
    
    // Verificar la fecha está en el rango esperado
    const afterCallDate = new Date();
    expect(responseDate >= beforeCallDate).toBe(true);
    expect(responseDate <= afterCallDate).toBe(true);
  });
});
