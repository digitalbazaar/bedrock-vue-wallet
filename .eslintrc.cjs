module.exports = {
  root: true,
  parserOptions: {
    // this is required for dynamic import()
    ecmaVersion: 2020
  },
  env: {
    browser: true,
    node: true
  },
  extends: [
    'digitalbazaar',
    'digitalbazaar/jsdoc',
    'digitalbazaar/vue'
  ],
  rules: {
    'vue/multi-word-component-names': 0
  },
  ignorePatterns: ['node_modules/']
};
