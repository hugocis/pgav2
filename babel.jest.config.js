// Esta configuración solo se usa para tests con Jest
module.exports = function(api) {
  // Indicar explícitamente que este archivo sólo se usa para tests
  // Esto evita que Next.js lo use para el build de producción
  const isTest = api.env('test');
  api.cache(true);
  
  // Solo devuelve la configuración cuando estemos en entorno de test
  if (isTest) {
    return {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['next/babel', { 'preset-react': { runtime: 'automatic' } }]
      ]
    };
  }
  
  // Para cualquier otro entorno, devolver una configuración vacía
  return {};
};
