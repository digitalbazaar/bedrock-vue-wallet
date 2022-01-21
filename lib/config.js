/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
export const config = {
  MEDIATOR_ORIGIN:
    typeof MEDIATOR_ORIGIN !== 'undefined' ?
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
  }
};
