/*!
 * Copyright (c) 2015-2026 Digital Bazaar, Inc. All rights reserved.
 */
import {cardDesigns} from './cardDesigns.js';
import {config} from '@bedrock/web';

const cfg = {
  // Customizable designs for vc cards
  cardDesigns,
  // Rules naming what kind of thing a credential is, as
  // `{category, matches}`, evaluated in order with the first match winning --
  // so a narrow rule goes before a broader one it overlaps. Empty by default
  // and deliberately so: the vocabulary is a deployment's to choose, and a
  // reusable wallet cannot know whether an issuer's credential is "Retail" or
  // "Tickets". With none configured every credential falls to the `Other`
  // catch-all and the category band hides itself, which is the intended
  // out-of-the-box behaviour rather than an oversight.
  credentialCategories: [],
  MEDIATOR_ORIGIN:
    typeof MEDIATOR_ORIGIN !== 'undefined' ?
      // eslint-disable-next-line no-undef
      MEDIATOR_ORIGIN : 'https://authn.io',
  branding: {
    namespace: 'bedrock-vue-wallet',
    name: 'Bedrock Vue.js Wallet',
    shortName: 'Bedrock Vue.js Wallet',
    logo: '/images/header-logo.svg',
    logoSize: {
      desktop: '25px',
      mobile: '18px'
    },
    brand: {
      primary: '#3498DB', // buttons
      secondary: '#3498DB', // header background
      info: '#FFFFFF', // header text
      accent: '#FFFFFF' + '80' // links - 80% opacity
    }
  },
  // CHAPI is on by default
  disableChapi: false
};

// expose as `vueWallet` on shared web app config
config.vueWallet = cfg;
