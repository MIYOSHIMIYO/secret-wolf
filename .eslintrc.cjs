module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  settings: { "import/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] } },
  rules: {
    "import/order": [
      "warn",
      {
        "alphabetize": { order: "asc", caseInsensitive: true },
        "newlines-between": "always",
        "groups": [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]]
      }
    ]
  },
  ignorePatterns: ["dist", "build", "node_modules"]
}; 