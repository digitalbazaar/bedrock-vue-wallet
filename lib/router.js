/*!
 * Copyright (c) 2022-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as brQuasar from '@bedrock/quasar';
import {config} from '@bedrock/web';
import {Quasar} from 'quasar';
import {rootData} from './rootData.js';
import {session} from '@bedrock/web-session';

// all supported features in the current version of this lib
const FEATURES = new Map([
  ['/credential-handler', ({routeConfig}) => ({
    routes: [{
      name: 'credential-handler-register',
      path: `${routeConfig.path}/register`,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-register" */
        '../routes/RegisterPage.vue'),
      meta: {title: 'Register', chapi: true}
    }, {
      name: 'credential-handler-exchange',
      path: `${routeConfig.path}/exchange`,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-credential-handler" */
        '../routes/ChapiExchangePage.vue'),
      meta: {title: 'Exchange', chapi: true}
    }]
  })],
  ['/home', ({routeConfig}) => ({
    routes: [{
      name: 'home',
      path: routeConfig.path,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-home" */
        '../routes/HomePage.vue'),
      meta: {title: config.vueWallet.branding.shortName, nav: ''}
    }]
  })],
  ['/interact', ({routeConfig}) => ({
    routes: [{
      name: 'interact',
      path: routeConfig.path,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-interact" */
        '../routes/InteractPage.vue'),
      meta: {title: 'Interact'}
    }]
  })],
  ['/login', ({routeConfig}) => ({
    routes: [{
      name: 'login',
      path: routeConfig.path,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-login" */
        '../routes/LoginPage.vue'),
      meta: {title: 'Log in'}
    }]
  })],
  ['/onboard', ({routeConfig}) => ({
    routes: [{
      name: 'onboard',
      path: routeConfig.path,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-onboard" */
        '../routes/OnboardPage.vue'),
      meta: {title: 'Onboarding', nav: 'onboard'}
    }]
  })],
  ['/profiles', ({routeConfig}) => ({
    routes: [{
      name: 'profiles',
      path: routeConfig.path,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-profiles" */
        '../routes/ProfilesPage.vue'),
      meta: {title: 'Profiles', nav: 'profiles'},
    }]
  })],
  ['/scanner', ({routeConfig}) => ({
    routes: [{
      name: 'scanner',
      path: routeConfig.path,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-scanner-exchange" */
        '../routes/ScannerExchangePage.vue'),
      meta: {title: 'Scanner', nav: 'scanner', hideNavbar: true}
    }]
  })],
  ['/register', ({routeConfig}) => ({
    routes: [{
      name: 'register',
      path: routeConfig.path,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-register" */
        '../routes/RegisterPage.vue'),
      meta: {title: 'Register'}
    }]
  })],
  ['/settings', ({routeConfig}) => ({
    routes: [{
      name: 'settings',
      path: routeConfig.path,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-settings" */
        '../routes/SettingsPage.vue'),
      meta: {title: 'Settings'}
    }, {
      name: 'settings-profile',
      path: `${routeConfig.path}/profiles/:profileId`,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-settings" */
        '../routes/SettingsPage.vue'),
      meta: {title: 'Profile Settings'}
    }, {
      name: 'settings-two-factor-setup',
      path: `${routeConfig.path}/two-factor-setup`,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-settings" */
        '../routes/TwoFactorSetupPage.vue'),
      meta: {title: 'Two-Factor Authentication Setup'}
    }]
  })]
]);

/**
 * Configures the given router to work with bedrock-vue-wallet. This method
 * will create and attach the route configs for the requested set of features,
 * and setup any special route handlers to enable bedrock-vue-wallet's
 * features to work properly.
 *
 * @param {object} options - The options to use.
 * @param {object} options.router - The `VueRouter` instance to configure.
 * @param {object} options.features - The features to include, expressed
 *   by name as JSON keys in an object where the values are either booleans
 *   or objects expressing additional options to modify the route
 *   configurations.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function configureRouter({
  // router to configure
  router,
  // features to include, referenced by name as JSON keys
  features = {}
} = {}) {
  if(!(features && typeof features === 'object')) {
    throw new TypeError('"features" must be an object.');
  }

  // create route configs
  const routes = [];
  for(const feature of Object.keys(features)) {
    const initFn = FEATURES.get(feature);
    if(!initFn) {
      throw new Error(`Unknown feature "${feature}".`);
    }
    let routeConfig = features[feature];
    if(typeof routeConfig === 'boolean') {
      if(routeConfig === false) {
        // feature disabled
        continue;
      }
      // feature enabled with default route config
      routeConfig = {};
    } else if(!(routeConfig && typeof routeConfig === 'object')) {
      throw new TypeError(
        `Feature ("${feature}") value must be a boolean or an object.`);
    }
    const result = initFn({routeConfig: {path: feature, ...routeConfig}});
    routes.push(...result.routes);
  }
  // add routes
  for(const route of routes) {
    router.addRoute(route);
  }

  // handle behavior triggered by route changes
  rootData.ready = false;
  router.afterEach(to => {
    // track initial route load
    if(!rootData.ready) {
      // `beforeEach` must be called at least once and the window pathname
      // must match the route path to signal that the app is ready to display
      rootData.ready = window.location.pathname === to.path;
    }
  });
  router.beforeEach((to/*, from*/) => {
    // ensure route-specific branding is applied
    if(to.meta.brand) {
      rootData.title = to.meta.title;
      brQuasar.theme({
        Quasar,
        // route-specific brand
        brand: to.meta.brand
      });
    } else {
      rootData.defaults();
      brQuasar.theme({
        Quasar,
        // default brand for app
        brand: config.vueWallet.branding.brand
      });
    }
  });
}

async function redirectHomeIfLoggedIn(/*to, from*/) {
  const {account = null} = session.data;
  if(account === null) {
    return;
  }

  return {name: 'home'};
}

async function requireLogin(/*to, from*/) {
  const {account = null} = session.data;
  if(account !== null) {
    return;
  }

  return {name: 'login'};
}

export const routeGuards = {
  redirectHomeIfLoggedIn,
  requireLogin
};
