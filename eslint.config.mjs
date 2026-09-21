import { config } from "@remotion/eslint-config-flat";
import globals from "globals";

export default [
  ...config,
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
