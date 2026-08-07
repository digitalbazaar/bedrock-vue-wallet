import {defineConfig} from 'vitest/config';
import vue from '@vitejs/plugin-vue';

const mock = pkg => new URL(`./mocks/${pkg}`, import.meta.url).pathname;
const quasarClient = new URL(
  './node_modules/quasar/dist/quasar.client.js', import.meta.url).pathname;

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {find: /^quasar$/, replacement: quasarClient},
      {find: '@bedrock/web', replacement: mock('bedrock/web.js')},
      {find: '@bedrock/web-wallet', replacement: mock('bedrock/web-wallet.js')},
      {find: '@bedrock/web-session',
        replacement: mock('bedrock/web-session.js')},
      {find: '@bedrock/web-account',
        replacement: mock('bedrock/web-account.js')},
      {find: '@bedrock/web-authn-token',
        replacement: mock('bedrock/web-authn-token.js')},
      {find: '@bedrock/quasar', replacement: mock('bedrock/quasar.js')},
      {find: '@bedrock/vue-vc', replacement: mock('bedrock/vue-vc.js')},
      {find: '@bedrock/quasar-components',
        replacement: mock('bedrock/quasar-components.js')},
      {find: '@digitalbazaar/vue-extendable-event',
        replacement: mock('digitalbazaar/vue-extendable-event.js')}
    ]
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./mocks/vitest-setup.js']
  }
});
