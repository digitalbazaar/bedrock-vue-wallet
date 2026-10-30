/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {getCredentialConfig} from './useCredentialCardConfig.js';

// registered `{matches, request, component}` pages, in registration order
const EXCHANGE_PAGES = [];

/**
 * Registers a page that replaces the store and share screens for an exchange
 * that offers a credential matching `matches`. The page is shown for the rest
 * of that exchange and uses the same `store`, `share` and `cancel` events.
 *
 * @param {object} options - The options to use.
 * @param {object} options.matches - JSON pointers to the values an offered
 *  credential must have, as in `cardDesigns` (e.g.,
 *  `{'/type': 'ExampleCredential'}`).
 * @param {Function} options.component - A component loader, such as
 *  `() => import('./MyPage.vue')`.
 * @param {string} [options.request] - The header's phrase after the
 *  requester's name (e.g., "would like you to confirm a ticket").
 */
export function addExchangePage({matches, request, component} = {}) {
  if(!(matches && typeof matches === 'object' &&
    Object.keys(matches).length > 0)) {
    throw new TypeError('"matches" must be a non-empty object.');
  }
  if(typeof component !== 'function') {
    throw new TypeError('"component" must be a function.');
  }
  if(request !== undefined && typeof request !== 'string') {
    throw new TypeError('"request" must be a string.');
  }
  EXCHANGE_PAGES.push({matches, request, component});
}

/**
 * Gets the registered page for an exchange, chosen by the credentials it
 * offers. The first page registered that an offered credential matches wins.
 *
 * @param {object} options - The options to use.
 * @param {Array} [options.credentials] - The credentials the exchange offers.
 *
 * @returns {object|undefined} The page, or `undefined` if none matches.
 */
export function getExchangePage({credentials} = {}) {
  for(const credential of credentials ?? []) {
    const page = getCredentialConfig({
      credential, cardDesigns: EXCHANGE_PAGES
    });
    if(page) {
      return page;
    }
  }
}
