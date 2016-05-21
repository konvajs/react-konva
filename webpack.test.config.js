var webpack = require('webpack');

module.exports = {
    entry: [
        './test/tests.js'
    ],
    output: {
        path: __dirname,
        filename: './test/tests.bundle.js'
    },
    externals: {
        'cheerio': 'window',
        'react/addons': true,
        'react/lib/ExecutionEnvironment': true,
        'react/lib/ReactContext': true
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/,
                loader: ['babel'],
                query: {
                    presets: ['es2015', 'react']
                }
            }
        ]
    }
};
