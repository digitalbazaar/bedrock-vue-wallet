/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as brQuasar from 'bedrock-quasar';
import appConfig from '../config/application.js';
import {configureRouter} from './router.js';
import {default as iconSet} from 'quasar/icon-set/fontawesome-v5';
import Quasar from 'quasar';
import Vue from 'vue';

export {getRootData} from './rootData.js';
export {routeGuards} from './router.js';

/**
 * Configures bedrock-vue-wallet.
 *
 * This includes configuring root Vue components, default branding, the given
 * core router, etc. This method will create and attach the route configs for
 * the requested set of features, and setup any special route handlers to
 * enable bedrock-vue-wallet's features to work properly.
 *
 * @param {Object} options - The options to use.
 * @param {Object} options.router - The `VueRouter` instance to configure.
 * @param {Object} options.features - The features to include, expressed
 *   by name as JSON keys in an object where the values are either booleans
 *   or objects expressing additional options to modify the route
 *   configurations.
 *
 * @return {Promise} Settles once the operation completes.
 */
export async function initialize({router, features} = {}) {
  // replace default `br-root` with a custom one
  // eslint-disable-next-line vue/component-definition-name-casing
  Vue.component('br-root', () => import(
    /* webpackChunkName: "bedrock-vue-wallet-root" */
    'bedrock-vue-wallet/components/BrRoot.vue'));

  // configure Quasar
  Quasar.iconSet.set(iconSet);
  const defaultBrand = appConfig.branding.brand;
  brQuasar.theme({Quasar, brand: defaultBrand});

  await configureRouter({router, features});
}
