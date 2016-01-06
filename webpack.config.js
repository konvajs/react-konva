
module.exports = {
    entry: [
        './src/react-konva.js'
    ],
    output: {
        path: __dirname,
        filename: './dist/react-konva.global.js',
        libraryTarget: "var",
        library: "ReactKonva"
    },
    externals: {
        // "react": "React",
        "konva": "Konva"
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/,
                loader: ['babel'],
                query: {
                    presets: ['es2015', 'stage-0']
                }
            }
        ]
    },
    plugins: [
        // new webpack.DefinePlugin({
        //     'process.env': {
        //         NODE_ENV: JSON.stringify('production')
        //     }
        // })
    ]
};