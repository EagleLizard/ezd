const resolve = require('rollup-plugin-node-resolve');
const commonJS = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');
const {uglify} = require('rollup-plugin-uglify');

export default {
  input: 'main.js',
  output: {
    file: 'index.js',
    format: 'cjs'
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true,
    }),
    commonJS(),
    babel(),
    // uglify(),
  ]
};
