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
  plugins: [
    'quasar'
  ],
  extends: [
    'digitalbazaar',
    'digitalbazaar/jsdoc',
    'digitalbazaar/vue3',
    'plugin:quasar/standard'
  ],
  rules: {},
  ignorePatterns: ['node_modules/']
};
