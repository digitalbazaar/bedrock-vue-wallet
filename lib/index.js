/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
import * as brQuasar from '@bedrock/quasar';
import {Notify, Quasar} from 'quasar';
import {session, sessionDataRef} from './session.js';
import {config} from '@bedrock/web';
import {configureRouter} from './router.js';
import ExtendableEvent from '@digitalbazaar/vue-extendable-event';
import iconSet from 'quasar/icon-set/fontawesome-v5.mjs';
import {initialize as initializeWebWallet} from '@bedrock/web-wallet';
import {rootData} from './rootData.js';
export {rootData, session, sessionDataRef};
export {routeGuards} from './router.js';

// load bedrock-vue-wallet config
import './config.js';

/**
 * Initializes bedrock-vue-wallet.
 *
 * This includes configuring root Vue components, default branding, the given
 * core router, etc. This method will create and attach the route configs for
 * the requested set of features, and setup any special route handlers to
 * enable bedrock-vue-wallet's features to work properly.
 *
 * @param {object} options - The options to use.
 * @param {object} options.app - The root Vue application to configure.
 * @param {object} options.router - The root vue router instance to configure.
 * @param {object} [options.features] - The features to include, expressed
 *   by name as JSON keys in an object where the values are either booleans
 *   or objects expressing additional options to modify the route
 *   configurations.
 * @param {object} [options.quasarOptions] - The quasar initialization options.
 *   "plugins" and "config" objects are supported. The "Notify" plugin is added
 *   by default.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize({app, router, features, quasarOptions} = {}) {
  // initialize web wallet
  await initializeWebWallet();

  // ensure session data ref is updated when session changes
  sessionDataRef.value = session.data;
  session.on('change', () => {
    sessionDataRef.value = session.data;
  });

  // install all Vue plugins
  app.use(ExtendableEvent);

  // build quasar options
  const _quasarOptions = {
    plugins: {
      // Notify plugin is known to be needed
      Notify
    },
    config: {}
  };
  // FIXME: improve options merge
  Object.assign(_quasarOptions.plugins, quasarOptions?.plugins || {});
  Object.assign(_quasarOptions.config, quasarOptions?.config || {});

  // initialize br-quasar
  await brQuasar.initialize({app, quasarOptions: _quasarOptions});

  // update defaults now that config has been set
  rootData.defaults();

  // configure Quasar
  Quasar.iconSet.set(iconSet);
  const defaultBrand = config.vueWallet.branding.brand;
  brQuasar.theme({brand: defaultBrand});

  await configureRouter({router, features});

  // initialize document title to brand short name
  if(!document.title) {
    document.title = config.vueWallet.branding.shortName;
  }
}
