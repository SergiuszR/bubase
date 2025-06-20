const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.min.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Ensures dist is cleaned before each build
  },
  mode: 'production', // Ensures minification
}; 