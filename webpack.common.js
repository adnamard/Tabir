const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/script/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/public/manifest.json', to: 'manifest.json' },
        { from: 'src/public/add-x512.png', to: 'add-x512.png' },
<<<<<<< HEAD
        { from: 'src/public/img', to: 'img' },
        { from: 'src/public/models', to: 'models' }
=======
        { from: 'src/public/img', to: 'img' }
>>>>>>> 12ffcdd7ccbaacec0f658003c80bd967dbe9ee0f
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
};
