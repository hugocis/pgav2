// Configuración de babel específica para Jest
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    ['next/babel', { 'preset-react': { runtime: 'automatic' } }]
  ]
};
