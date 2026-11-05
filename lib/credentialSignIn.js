/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
/**
 * Sign in with a credential an invitation delivered.
 *
 * A coordinator such as a wallet selector authenticates a person's phone
 * number or email address and hands the wallet a short-lived credential
 * saying so, like a federated login. The wallet backend decides whether it
 * trusts that credential's issuer; this module only finds a candidate among
 * what was delivered and presents it.
 */
import {config} from '@bedrock/web';
import {httpClient} from '@digitalbazaar/http-client';
import {session} from '@bedrock/web-session';

function _config() {
  return config.vueWallet?.interactionCreator?.signInWithCredential ?? {};
}

/**
 * Whether an invitation may sign a signed-out holder in.
 *
 * @returns {boolean} `true` when sign-in credential types are configured.
 */
export function isCredentialSignInEnabled() {
  return (_config().credentialTypes ?? []).length > 0;
}

/**
 * Finds the first credential of a configured sign-in type.
 *
 * @param {object} options - Options.
 * @param {Array<object>} options.credentials - What an exchange delivered.
 *
 * @returns {object|undefined} The credential, if any.
 */
export function findSignInCredential({credentials = []} = {}) {
  const types = _config().credentialTypes ?? [];
  return credentials.find(credential => {
    const credentialTypes = Array.isArray(credential?.type) ?
      credential.type : [credential?.type];
    return credentialTypes.some(type => types.includes(type));
  });
}

/**
 * Presents `credential` to the wallet backend to sign in (creating the
 * account if needed), then refreshes the session.
 *
 * @param {object} options - Options.
 * @param {object} options.credential - The credential.
 *
 * @returns {Promise<{account: string, created: boolean}>} The account now
 *   signed in, and whether it was just created.
 */
export async function signInWithCredential({credential} = {}) {
  const {url = '/authn/credential-login'} = _config();
  const {data} = await httpClient.post(url, {
    json: {verifiableCredential: credential}
  });
  await session.refresh();
  return {account: data?.account, created: data?.created === true};
}
