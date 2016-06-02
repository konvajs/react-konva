var webpack = require('webpack');

module.exports = {
    entry: [
        './src/bundle.js'
    ],
    output: {
        path: __dirname,
        filename: './dist/react-konva.bundle.js',
        libraryTarget: "var",
        library: "ReactKonva"
    },
    externals: {
        'konva': 'Konva'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/,
                loader: ['babel'],
                query: {
                    presets: ['es2015']
                }
            }
        ]
    }
};
