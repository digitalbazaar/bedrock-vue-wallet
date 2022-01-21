/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import appConfig from '../config/application.js';
import {getSession} from 'bedrock-web-session';

// all supported features in the current version of this lib
const FEATURES = new Map([
  ['/credential-handler', ({config}) => ({
    routes: [{
      name: 'bedrock-vue-wallet-credential-handler-register',
      path: `${config.path}/register`,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-register" */
        '../routes/RegisterPage.vue'),
      meta: {title: 'Register', chapi: true}
    }, {
      name: 'bedrock-vue-wallet-credential-handler-share',
      path: `${config.path}/share`,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-credential-handler" */
        '../routes/ChapiSharePage.vue'),
      meta: {title: 'Share', chapi: true}
    }, {
      name: 'bedrock-vue-wallet-credential-handler-store',
      path: `${config.path}/store`,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-credential-handler" */
        '../routes/ChapiStorePage.vue'),
      meta: {title: 'Store', chapi: true}
    }]
  })],
  ['/home', ({config}) => ({
    routes: [{
      name: 'bedrock-vue-wallet-home',
      path: config.path,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "HomePage" */
        '../routes/HomePage.vue'),
      meta: {title: appConfig.branding.shortName, nav: ''}
    }]
  })],
  ['/interact',  ({config}) => ({
    routes: [{
      name: 'bedrock-vue-wallet-interact',
      path: config.path,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-interact" */
        '../routes/InteractPage.vue'),
      meta: {title: 'Interact'}
    }]
  })],
  ['/login', ({config}) => ({
    routes: [{
      name: 'bedrock-vue-wallet-login',
      path: config.path,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-login" */
        '../routes/LoginPage.vue'),
      meta: {title: 'Log in'}
    }]
  })],
  ['/onboard', ({config}) => ({
    routes: [{
      name: 'bedrock-vue-wallet-onboard',
      path: config.path,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-onboard" */
        '../routes/OnboardPage.vue'),
      meta: {title: 'Onboarding', nav: 'onboard'}
    }]
  })],
  ['/profiles', ({config}) => ({
    routes: [{
      name: 'bedrock-vue-wallet-profiles',
      path: config.path,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-profiles" */
        '../routes/ProfilesPage.vue'),
      meta: {title: 'Profiles', nav: 'profiles'}
    }]
  })],
  ['/register', ({config}) => ({
    routes: [{
      name: 'bedrock-vue-wallet-register',
      path: config.path,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-register" */
        '../routes/RegisterPage.vue'),
      meta: {title: 'Register'}
    }]
  })],
  ['/settings', ({config}) => ({
    routes: [{
      name: 'bedrock-vue-wallet-settings',
      path: config.path,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-settings" */
        '../routes/SettingsPage.vue'),
      meta: {title: 'Settings'}
    }, {
      name: 'bedrock-vue-wallet-settings-profile',
      path: `${config.path}/profiles/:profileId`,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-settings" */
        '../routes/SettingsPage.vue'),
      meta: {title: 'Profile Settings'}
    }, {
      name: 'bedrock-vue-wallet-settings-two-factor-setup',
      path: `${config.path}/two-factor-setup`,
      beforeEnter: requireLogin,
      component: () => import(
        /* webpackChunkName: "bedrock-vue-wallet-settings" */
        '../routes/TwoFactorSetupPage.vue'),
      meta: {title: 'Two-Factor Authentication Setup'}
    }]
  })]
]);

/**
 * Creates the route configs for the requested set of features, to be passed
 * to a `VueRouter` constructor.
 *
 * @param {Object} options - The options to use.
 * @param {Object} options.features - The features to include, expressed
 *   by name as JSON keys in an object where the values are either booleans
 *   or objects expressing additional options to modify the route
 *   configurations.
 *
 * @return {Promise<Array>} The route configs to be passed to a `VueRouter`
 *   constructor.
 */
export async function createRoutes({
  // features to include, referenced by name as JSON keys
  features = {}
} = {}) {
  if(!(features && typeof features === 'object')) {
    throw new TypeError('"features" must be an object.');
  }

  const routes = [];
  for(const feature of Object.keys(features)) {
    const initFn = FEATURES.get(feature);
    if(!initFn) {
      throw new Error(`Unknown feature "${feature}".`);
    }
    let config = features[feature];
    if(typeof config === 'boolean') {
      if(config === false) {
        // feature disabled
        continue;
      }
      // feature enabled with default config
      config = {};
    } else if(!(config && typeof config === 'object')) {
      throw new TypeError(
        `Feature ("${feature}") value must be a boolean or an object.`);
    }
    const result = initFn({config: {path: feature, ...config}});
    routes.push(...result.routes);
  }
  return routes;
}

async function redirectHomeIfLoggedIn(to, from, next) {
  const session = await getSession();
  const {account = null} = session.data;
  if(account === null) {
    return next();
  }

  next({name: 'bedrock-vue-wallet-home'});
}

async function requireLogin(to, from, next) {
  const session = await getSession();
  const {account = null} = session.data;
  if(account !== null) {
    return next();
  }

  next({name: 'bedrock-vue-wallet-login'});
}

export const routeGuards = {
  redirectHomeIfLoggedIn,
  requireLogin
};
