import globals from 'globals';

import digitalbazaar from 'eslint-config-digitalbazaar';
import digitalbazaarJsdoc from 'eslint-config-digitalbazaar/jsdoc';
import digitalbazaarModule from 'eslint-config-digitalbazaar/module';
import digitalbazaarVue3 from 'eslint-config-digitalbazaar/vue3';

export default [
  {
    ignores: ['**/node_modules/']
  },
  // not yet supported
  // 'plugin:quasar/standard'
  ...digitalbazaar,
  ...digitalbazaarJsdoc,
  ...digitalbazaarModule,
  ...digitalbazaarVue3,
  {
    files: [
      '**/*.js'
    ],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: [
      'test/web/**/*.js'
    ],
    languageOptions: {
      globals: {
        ...globals.mocha
      }
    }
  }
];
