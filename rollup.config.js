import { defineConfig } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import filesize from "rollup-plugin-filesize";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig([
  // Configuration for snippets.js
  {
    input: "snippets.js",
    output: [
      // {
      //   file: "dist/snippets.js",
      //   format: "es",
      //   exports: "default",
      //   sourcemap: !isProduction,
      // },
      {
        file: "snippets.min.js",
        format: "es",
        exports: "default",
        sourcemap: false,
        plugins: isProduction
          ? [
              terser({
                compress: {
                  drop_console: true,
                  drop_debugger: true,
                  pure_funcs: ["console.debug"],
                },
                mangle: {
                  keep_classnames: true,
                  keep_fnames: false,
                },
              }),
            ]
          : [],
      },
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: true,
      }),
      commonjs(),
      filesize({
        showMinifiedSize: true,
        showGzippedSize: true,
      }),
    ],
    external: ["cloudflare:sockets"],
    onwarn(warning, warn) {
      // Suppress warnings about 'this' keyword
      if (warning.code === "THIS_IS_UNDEFINED") return;
      warn(warning);
    },
  },

  // Configuration for worker.js
  {
    input: "worker.js",
    output: [
      // {
      //   file: "dist/worker.js",
      //   format: "es",
      //   exports: "default",
      //   sourcemap: !isProduction,
      // },
      {
        file: "worker.min.js",
        format: "es",
        exports: "default",
        sourcemap: false,
        plugins: isProduction
          ? [
              terser({
                compress: {
                  drop_console: true,
                  drop_debugger: true,
                  pure_funcs: ["console.debug"],
                },
                mangle: {
                  keep_classnames: true,
                  keep_fnames: false,
                },
              }),
            ]
          : [],
      },
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: true,
      }),
      commonjs(),
      filesize({
        showMinifiedSize: true,
        showGzippedSize: true,
      }),
    ],
    external: ["cloudflare:sockets"],
    onwarn(warning, warn) {
      // Suppress warnings about 'this' keyword
      if (warning.code === "THIS_IS_UNDEFINED") return;
      warn(warning);
    },
  },
]);
