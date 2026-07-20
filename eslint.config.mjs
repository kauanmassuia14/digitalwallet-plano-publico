import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "packages/database/generated/**",
      "index.html",
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: {
        program: null,
        project: false,
        projectService: false,
      },
      globals: globals.node,
    },
  },
);
