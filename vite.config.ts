import path from "path"
import { defineConfig } from "vite"
// import dts from 'vite-plugin-dts'
// import glob from "glob"
// import path from "path"
import pkg from "./package.json"
// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { builtinModules } from "module"
const externalPackages = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  // ...Object.keys(pkg     .peerDependencies || {}),
]

// Creating regexes of the packages to make sure subpaths of the
// packages are also treated as external
const regexesOfPackages = externalPackages.map(
  (packageName) => new RegExp(`^${packageName}(/.*)?`, "u")
)

const getEntry = (ext: string) => {
  // const root = path.resolve(__dirname, 'src', 'lib')
  return (entry: { name: string }) => {
    const filename = `${entry.name}.${ext}`
    return filename
  }
}

export default defineConfig(({ mode }) => {
  const isDev = mode === "development"
  return {
    optimizeDeps: {
      include: ["lodash-es"],
      esbuildOptions: {
        // Enable esbuild polyfill plugins
        // plugins: [
        //     NodeGlobalsPolyfillPlugin({
        //         process: true,
        //         buffer: true
        //     }),
        // ]
      },
    },

    build: {
      emptyOutDir: true,
      cssCodeSplit: true,

      minify: isDev ? false : "terser",
      terserOptions: {
        compress: !isDev,
        mangle: !isDev,
      },
      outDir: "out",
      lib: {
        entry: path.resolve(__dirname, "src/extension.ts"),
        name: "vscode-mono-repo",
      },

      rollupOptions: {
        external: [...regexesOfPackages, "vscode", ...builtinModules],

        output: [
          {
            exports: "named",
            preserveModulesRoot: "src",
            format: "cjs",
            inlineDynamicImports: true,
            entryFileNames: getEntry("cjs"),
          },
        ],
      },
      target: "node16",
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      sourcemap: isDev,
    },

    plugins: [
      // dts({
      //   entryRoot: "src",
      // }),
    ],
  }
})
