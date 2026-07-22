// functions/.eslintrc.js
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    // Allow modern syntax if your Node version supports it
  },
  parserOptions: {
    ecmaVersion: 2020, // or 2021
  },
};