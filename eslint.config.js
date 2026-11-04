import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// Replaces the old Babel scope check: no-undef + jsx-no-undef catch calls to
// functions that don't exist in scope. Plus the React hooks rules.
export default [
  { ignores: ["dist/**", "next/**", "node_modules/**", "public/**"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, google: "readonly" }, // google = Google Identity Services script tag
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "18.2" } },
    rules: {
      "no-undef": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
