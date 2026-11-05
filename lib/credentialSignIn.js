/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
/**
 * Sign in with a credential an invitation delivered.
 *
 * A coordinator such as a wallet selector authenticates a person's phone
 * number or email address and hands the wallet a short-lived credential
 * saying so, like a federated login. The wallet backend decides whether it
 * trusts that credential's issuer, in a VCALM exchange; this module only
 * finds a candidate among what was delivered and presents it there.
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
 * Signs in with `credential` through a VCALM exchange with the wallet
 * backend (creating the account if needed), then refreshes the session:
 *
 * 1. Asks the backend for a sign-in exchange (`exchangesUrl`).
 * 2. Runs it: receives its Verifiable Presentation Request and answers with
 *    an unsigned presentation holding the credential. The holder has no DID
 *    before signing in; the credential's proof is what the backend checks.
 * 3. Asks the backend to finish (`loginUrl`), which signs the session in.
 *
 * @param {object} options - Options.
 * @param {object} options.credential - The credential.
 *
 * @returns {Promise<{account: string, created: boolean}>} The account now
 *   signed in, and whether it was just created.
 */
export async function signInWithCredential({credential} = {}) {
  const {
    exchangesUrl = '/authn/exchanges',
    loginUrl = '/authn/exchanges/login'
  } = _config();
  const {data: {exchangeId} = {}} = await httpClient.post(
    exchangesUrl, {json: {}});
  if(typeof exchangeId !== 'string' || !exchangeId.startsWith('https://')) {
    throw new Error('The wallet did not start a sign-in exchange.');
  }

  const {data: {verifiablePresentationRequest: request} = {}} =
    await httpClient.post(exchangeId, {json: {}});
  if(!_requests({request, credential})) {
    throw new Error('The sign-in exchange did not ask for this credential.');
  }
  await httpClient.post(exchangeId, {json: {
    verifiablePresentation: {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiablePresentation'],
      verifiableCredential: [credential]
    }
  }});

  const {data} = await httpClient.post(loginUrl, {json: {}});
  await session.refresh();
  return {account: data?.account, created: data?.created === true};
}

// whether a presentation request asks (by example) for a type `credential` has
function _requests({request, credential}) {
  const types = _asArray(credential?.type);
  return _asArray(request?.query)
    .filter(query => query?.type === 'QueryByExample')
    .flatMap(query => _asArray(query.credentialQuery))
    .some(query => _asArray(query?.example?.type)
      .some(type => types.includes(type)));
}

function _asArray(x) {
  return Array.isArray(x) ? x : (x === undefined ? [] : [x]);
}
