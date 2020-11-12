// import typescript from "@rollup/plugin-typescript"
import typescript from "rollup-plugin-typescript2"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import { terser } from "rollup-plugin-terser"
import commonjs from "@rollup/plugin-commonjs"
import progress from "rollup-plugin-progress"
import { builtinModules } from "module"

export default {
  input: "src/extension.ts", // our source file
  output: {
    sourcemap: false,
    // freeze: false,
    // interop: "auto",
    // dir: "out",
    file: "out/extension.js",
    format: "cjs",
  },

  // external: [...Object.keys(pkg.dependencies || {}), ...builtins],
  external: [...builtinModules, "vscode"],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),
    typescript({
      // tsconfig: "./tsconfig.json",
      // module: "esnext",
      // typescript: require("typescript"),
    }),
    commonjs({ dynamicRequireTargets: ["*"] }),
    terser({ compress: true, mangle: true }),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    progress(),
  ],
}
