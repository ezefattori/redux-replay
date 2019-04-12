//import webpack from 'webpack';
//import path from 'path';

const webpack = require("webpack");
const path = require("path");

const { NODE_ENV } = process.env;

const filename = `redux-replay${NODE_ENV === 'production' ? '.min' : ''}.js`;

//export default {
module.exports = {
  module: {
    loaders: [
      { test: /\.js$/, loaders: ['babel-loader'], exclude: /node_modules/ },
    ],
  },

  entry: [
    './src/index',
  ],

  output: {
    path: path.join(__dirname, 'dist'),
    filename,
    library: 'ReduxReplay',
    libraryTarget: 'umd',
  },
};
