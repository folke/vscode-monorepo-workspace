module.exports = {
  parser: "@typescript-eslint/parser", // Specifies the ESLint parser
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
    "plugin:unicorn/recommended",
    "plugin:promise/recommended",
    "plugin:chai-expect/recommended",
  ],
  env: {
    node: true,
    browser: false,
    mocha: true,
  },
  plugins: [
    "@typescript-eslint",
    "prettier",
    // "import",
    "promise",
    "chai-expect",
  ],
  settings: { "import/core-modules": ["vscode"] },
  parserOptions: {
    ecmaVersion: 2019, // Allows for the parsing of modern ECMAScript features
    sourceType: "module", // Allows for the use of imports
    project: "./tsconfig.json",
    impliedStrict: true,
    createDefaultProgram: true,
  },
  rules: {
    "array-callback-return": "error",
    "prefer-template": "warn",
    "prefer-promise-reject-errors": "error",
    "require-unicode-regexp": "error",
    yoda: "error",
    "prefer-spread": "error",
    "prettier/prettier": "warn",
    "unicorn/prevent-abbreviations": "off",
    "unicorn/explicit-length-check": "off",
    "unicorn/consistent-function-scoping": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "lines-between-class-members": [
      "error",
      "always",
      { exceptAfterSingleLine: true },
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
}
