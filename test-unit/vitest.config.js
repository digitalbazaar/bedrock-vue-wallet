/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';
import vue from '@vitejs/plugin-vue';

const mock = pkg => new URL(`./mocks/${pkg}`, import.meta.url).pathname;
const quasarClient = new URL(
  './node_modules/quasar/dist/quasar.client.js', import.meta.url).pathname;

// the components under test live outside this package, so a bare import in
// one of them resolves against the repo root, which deliberately installs
// none of these -- they are peer dependencies there, and anything present in
// the root node_modules also lands in the karma build's module graph. Point
// them at this package's copies instead.
const dep = name => new URL(`./node_modules/${name}`, import.meta.url).pathname;

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {find: /^quasar$/, replacement: quasarClient},
      {find: /^vue$/, replacement: dep('vue')},
      {find: /^vue-router$/, replacement: dep('vue-router')},
      {find: /^@vueuse\/core$/, replacement: dep('@vueuse/core')},
      {find: /^mustache$/, replacement: dep('mustache')},
      {find: /^@vue\/test-utils$/, replacement: dep('@vue/test-utils')},
      {find: '@bedrock/web', replacement: mock('bedrock/web.js')},
      {find: '@bedrock/web-wallet', replacement: mock('bedrock/web-wallet.js')},
      {find: 'web-credential-handler',
        replacement: mock('web-credential-handler.js')},
      // A stand-in, and the one that should not be: the real package is not
      // currently resolvable in this harness alongside the versions this
      // package pins. It mirrors `useCredentialCommon`, including that both
      // values are refs, and goes away once it can be installed here.
      {find: '@bedrock/vue-vc', replacement: mock('bedrock/vue-vc.js')},
      // the real package, not a stand-in. It was only ever aliased because a
      // bare import in a component outside this package resolves against the
      // repo root, which installs none of its peers -- a resolution problem,
      // not an isolation one. Named at its entry file because the package
      // declares `module` and neither `main` nor `exports`, so a directory
      // alias has nothing to resolve.
      {find: '@digitalbazaar/vue-extendable-event',
        replacement: dep('@digitalbazaar/vue-extendable-event/lib/index.js')},
      {find: '@digitalbazaar/vc-html-render-method',
        replacement: mock('digitalbazaar/vc-html-render-method.js')}
    ]
  },
  test: {
    projects: [
      {
        // logic, props, emitted events -- anything jsdom can represent
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['{components,lib,routes}/**/*.spec.js'],
          setupFiles: ['./mocks/vitest-setup.js']
        }
      },
      {
        // a real engine, for what jsdom cannot represent: nested iframes and
        // `MessageChannel` (the render method), touch gestures, layout and
        // media queries at a real viewport, and canvas pixel reads. A test
        // here should name which of those it needs -- if jsdom can run it,
        // it belongs in `unit`, which is far faster.
        extends: true,
        resolve: {
          alias: [{
            find: '@digitalbazaar/vc-html-render-method',
            replacement: dep('@digitalbazaar/vc-html-render-method')
          }]
        },
        test: {
          name: 'browser',
          globals: true,
          include: ['browser/**/*.spec.js'],
          setupFiles: ['./mocks/vitest-setup.js'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{browser: 'chromium'}]
          }
        }
      }
    ]
  }
});
