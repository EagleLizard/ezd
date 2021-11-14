import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';
import json from '@rollup/plugin-json';
import sourcemaps from 'rollup-plugin-sourcemaps';

const production = !process.env.ROLLUP_WATCH;

const externals = [
  ...Object.keys(pkg.dependencies || {})
];

const plugins = [
  sourcemaps(),
  json(),
  resolve({
    browser: true,
  }),
  commonjs({}),
  typescript({
    typescript: require('typescript'),
    tsconfigOverride: {
      exclude: [ './test' ],
      compilerOptions: {
        module: 'ES2015',
      }
    }
  }),
  babel({
    babelHelpers: 'bundled',
    exclude: [
      /\/core-js\//,
    ],
  }),
];

if(production === true) {
  plugins.push(
    terser({
      compress: {
        dead_code: false,
      },
    }),
  );
}

export default {
  input: 'index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    }
  ],
  external: filterExternals,
  plugins,
};

function filterExternals(extId) {
  return externals.some((extDep) => {
    return extId.indexOf(extDep) === 0;
  });
}
