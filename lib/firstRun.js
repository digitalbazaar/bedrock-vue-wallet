/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {helpers, profileManager} from '@bedrock/web-wallet';
import {config} from '@bedrock/web';
import {randomColor} from 'randomcolor';

const {createProfile} = helpers;

/* Keyed by account and cleared once it settles. A profile is a metered
keystore and an encrypted vault, and the check-then-create below is a race:
two mounts in one page -- back/forward, a redirect re-entering a route, login
and first-run setup reaching for it at once -- would each see no profile and
create one. Sharing a single in-flight attempt settles that within the page.
It does NOT cover two browser tabs; only the server can settle that. Held for
the life of the attempt rather than the life of the page, because a signed-out
account's answer says nothing about the next one's. */
const pending = new Map();

/* The routes that send holders somewhere else. Returning to one of them
loops: first-run setup would redirect to itself and sit on its spinner. */
const BOUNCE_ROUTES = new Set(['welcome', 'login', 'register']);

/**
 * Ensures the signed-in account has a profile, creating the default one if it
 * has none. Concurrent callers for the same account share one attempt.
 *
 * @param {object} options - Options.
 * @param {string} options.accountId - The signed-in account.
 *
 * @returns {Promise} Settles when the account is known to have a profile.
 */
export async function provisionDefaultProfile({accountId} = {}) {
  if(!accountId) {
    throw new TypeError('"accountId" is required.');
  }
  let attempt = pending.get(accountId);
  if(!attempt) {
    attempt = _provision().finally(() => pending.delete(accountId));
    pending.set(accountId, attempt);
  }
  return attempt;
}

/* Held in session storage rather than a `redirect` query parameter. The
destination can be an interaction URL, which is an unguessable capability, and
a query parameter puts it in the address bar, browser history, bookmarks and
any access log along the way -- once for the login bounce and again for the
first-run one. */
const DESTINATION_KEY = 'bedrock-vue-wallet.pendingDestination';

/**
 * Records where the holder was going, for a guard that is about to send them
 * somewhere else first.
 *
 * @param {string} fullPath - Where they were going.
 */
export function setPendingDestination(fullPath) {
  try {
    sessionStorage.setItem(DESTINATION_KEY, fullPath);
  } catch(e) {
    /* Private mode, blocked storage. The holder lands on home instead of
    where they were going, which is a worse trip, not a broken one. */
    console.error('Could not record where you were going.', e.message);
  }
}

/**
 * Takes the recorded destination, if there is a usable one, and forgets it.
 *
 * @param {object} options - Options.
 * @param {object} options.router - The app's router.
 *
 * @returns {string|null} The destination, or `null`.
 */
export function takePendingDestination({router} = {}) {
  let stored = null;
  try {
    stored = sessionStorage.getItem(DESTINATION_KEY);
    sessionStorage.removeItem(DESTINATION_KEY);
  } catch{
    return null;
  }
  return resolveRedirect({router, redirect: stored});
}

/**
 * Resolves a `redirect` query value to somewhere this wallet can send the
 * holder, or `null` when it cannot.
 *
 * @param {object} options - Options.
 * @param {object} options.router - The app's router.
 * @param {string|Array} options.redirect - The raw query value.
 *
 * @returns {string|null} The destination, or `null`.
 */
export function resolveRedirect({router, redirect} = {}) {
  /* A repeated query parameter arrives as an array, and an absolute URL would
  send the holder off this origin, so neither is a destination. */
  const value = Array.isArray(redirect) ? redirect[0] : redirect;
  if(typeof value !== 'string' || !value.startsWith('/') ||
    value.startsWith('//')) {
    return null;
  }
  let resolved;
  try {
    resolved = router.resolve(value);
  } catch{
    return null;
  }
  if(!resolved.matched.length || BOUNCE_ROUTES.has(resolved.name)) {
    return null;
  }
  return value;
}

async function _provision() {
  const profiles = await profileManager.getProfiles({useCache: false});
  if(profiles.length > 0) {
    return;
  }
  const {defaultProfileName, defaultProfileOptions} = config.vueWallet;
  await createProfile({
    profileContent: {
      name: defaultProfileName,
      shared: false,
      color: randomColor(),
      type: ['User', 'Person']
    },
    profileOptions: defaultProfileOptions
  });
}
