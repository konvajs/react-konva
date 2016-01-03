var webpack = require('webpack');

module.exports = {
  context: __dirname,
  entry: './app.js',
  module: {
    loaders: [
      { test: /\.js$/, loader: 'jsx-loader' }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {NODE_ENV: JSON.stringify('development')}
    })
  ]
};
