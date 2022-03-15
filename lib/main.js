/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as brQuasar from 'bedrock-quasar';
import {config} from 'bedrock-web';
import {configureRouter} from './router.js';
import {default as iconSet} from 'quasar/icon-set/fontawesome-v5';
import {initialize as initializeWebWallet} from 'bedrock-web-wallet';
import {rootData} from './rootData.js';
import Quasar from 'quasar';
import Vue from 'vue';

export {rootData};
export {routeGuards} from './router.js';

// load bedrock-vue-wallet config
import './config.js';

/**
 * Adds a configuration to bedrock-web's shared web app `config`. This call
 * will layer the given config on top of `config`, overwriting any matching
 * keys. This should be called before calling `initialize` or using the
 * `config`.
 *
 * @param {object} options - The options to use.
 * @param {object} options.newConfig - The new config to overlay on top of
 *   bedrock-web's `config`.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function addConfig({newConfig} = {}) {
  if(!(newConfig && typeof newConfig === 'object')) {
    throw new TypeError('"newConfig" must be an object.');
  }

  // overlay `newConfig` on `config`
  for(const key in newConfig) {
    config[key] = newConfig[key];
  }
}

/**
 * Initializes bedrock-vue-wallet.
 *
 * This includes configuring root Vue components, default branding, the given
 * core router, etc. This method will create and attach the route configs for
 * the requested set of features, and setup any special route handlers to
 * enable bedrock-vue-wallet's features to work properly.
 *
 * @param {object} options - The options to use.
 * @param {object} options.router - The `VueRouter` instance to configure.
 * @param {object} [options.features] - The features to include, expressed
 *   by name as JSON keys in an object where the values are either booleans
 *   or objects expressing additional options to modify the route
 *   configurations.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize({router, features} = {}) {
  // initialize web wallet
  await initializeWebWallet();

  // update defaults now that config has been set
  rootData.defaults();

  // replace default `br-root` with a custom one
  // eslint-disable-next-line vue/component-definition-name-casing
  Vue.component('br-root', () => import(
    /* webpackChunkName: "bedrock-vue-wallet-root" */
    'bedrock-vue-wallet/components/BrRoot.vue'));

  // configure Quasar
  Quasar.iconSet.set(iconSet);
  const defaultBrand = config.vueWallet.branding.brand;
  brQuasar.theme({Quasar, brand: defaultBrand});

  await configureRouter({router, features});

  // initialize document title to brand short name
  if(!document.title) {
    document.title = config.vueWallet.branding.shortName;
  }
}
