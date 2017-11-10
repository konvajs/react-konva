var webpack = require('webpack');

module.exports = {
  entry: [__dirname + '/../test/tests.js'],
  devtool: 'eval',
  output: { path: __dirname, filename: '../test/tests.bundle.js' },
  externals: {
    cheerio: 'window'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: ['babel-loader?presets[]=es2015,presets[]=react']
      }
    ]
  }
};
