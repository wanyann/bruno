const rollup = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const fs = require('fs');
const terser = require('@rollup/plugin-terser').default;

const bundleLibraries = async () => {
  const codeScript = `
    import { expect, assert } from 'chai';
    import { Buffer } from "buffer";
    import moment from "moment";
    import btoa from "btoa";
    import atob from "atob";
    import * as cryptoJs from 'crypto-js';
    import tv4 from "tv4";
    import Ajv from "ajv";
    import addFormats from "ajv-formats";
    import * as xml2js from "xml2js";
    import * as timers from "timers";
    globalThis.expect = expect;
    globalThis.assert = assert;
    globalThis.moment = moment;
    globalThis.btoa = btoa;
    globalThis.atob = atob;
    globalThis.Buffer = Buffer;
    globalThis.tv4 = tv4;
    globalThis.Ajv = Ajv;
    globalThis.addFormats = addFormats;
    globalThis.xml2js = xml2js;
    globalThis.requireObject = {
      ...(globalThis.requireObject || {}),
      'chai': { expect, assert },
      'moment': moment,
      'buffer': { Buffer },
      'btoa': btoa,
      'atob': atob,
      'crypto-js': cryptoJs,
      'tv4': tv4,
      'ajv': Ajv,
      'ajv-formats': addFormats,
      'xml2js': xml2js,
      'timers': timers
    };
`;

  const config = {
    input: {
      input: 'inline-code',
      plugins: [
        {
          name: 'inline-code-plugin',
          resolveId(id) {
            if (id === 'inline-code') {
              return id;
            }
            return null;
          },
          load(id) {
            if (id === 'inline-code') {
              return codeScript;
            }
            return null;
          }
        },
        {
          name: 'builtin-polyfill-plugin',
          resolveId(id) {
            if (id === 'timers') {
              return id;
            }
            return null;
          },
          load(id) {
            if (id === 'timers') {
              return `
                const setImmediateFn = typeof globalThis.setImmediate === 'function' ? globalThis.setImmediate : (cb, ...args) => setTimeout(cb, 0, ...args);
                const execute = (fn, ...args) => (typeof fn === 'object' && typeof fn.fn === 'function' ? fn.fn(...args) : fn(...args));
                const wrappedSetImmediate = (cb, ...args) => setImmediateFn(() => execute(cb), ...args);
                const wrappedSetTimeout = (cb, ...args) => setTimeout(() => execute(cb), ...args);
                const wrappedClearTimeout = (id) => clearTimeout(id);
                const wrappedClearInterval = (id) => clearInterval(id);
                const wrappedSetInterval = (cb, ...args) => setInterval(() => execute(cb), ...args);
                export { wrappedSetImmediate as setImmediate, wrappedSetTimeout as setTimeout, wrappedClearTimeout as clearTimeout, wrappedSetInterval as setInterval, wrappedClearInterval as clearInterval };
              `;
            }
            return null;
          }
        },
        nodeResolve({
          preferBuiltins: false,
          browser: false
        }),
        commonjs(),
        json(),
        terser()
      ]
    },
    output: {
      file: './src/sandbox/bundle-browser-rollup.js',
      format: 'iife',
      name: 'MyBundle'
    }
  };

  try {
    const bundle = await rollup.rollup(config.input);
    const { output } = await bundle.generate(config.output);
    fs.writeFileSync(
      './src/sandbox/bundle-browser-rollup.js',
      `
      const getBundledCode = () => {
        return function(){
          ${output?.map((o) => o.code).join('\n')}
        }()
      }
      module.exports = getBundledCode;
    `
    );
  } catch (error) {
    console.error('Error while bundling:', error);
  }
};

bundleLibraries();

module.exports = bundleLibraries;
