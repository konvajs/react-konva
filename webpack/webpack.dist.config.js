var webpack = require('webpack');

module.exports = {
  entry: ['./src/react-konva-fiber.js'],
  output: {
    path: __dirname,
    filename: '../react-konva.js',
    libraryTarget: 'umd',
    library: 'ReactKonva'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: ['babel-loader?presets[]=es2015']
      }
    ]
  },
  externals: [
    {
      react: {
        commonjs: 'react',
        commonjs2: 'react',
        root: 'React'
      },
      'react-reconciler': {
        commonjs: 'react-reconciler',
        commonjs2: 'react-reconciler'
      },
      konva: {
        commonjs: 'konva',
        commonjs2: 'konva',
        root: 'Konva'
      }
    }
  ]
};
