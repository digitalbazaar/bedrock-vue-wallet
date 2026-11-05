/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {setCredentialStore, setInteractionChain} from '@bedrock/web-wallet';
import {config} from '@bedrock/web';
import {httpClient} from '@digitalbazaar/http-client';
import InviteRequestPage from '../../routes/InviteRequestPage.vue';
import {Quasar} from 'quasar';
import {session} from '@bedrock/web-session';

vi.mock('@digitalbazaar/http-client', () => ({
  httpClient: {post: vi.fn()}
}));
vi.mock('../../lib/firstRun.js', () => ({
  provisionDefaultProfile: vi.fn(async () => {}),
  setPendingDestination: vi.fn()
}));
const firstRun = await import('../../lib/firstRun.js');

const ORIGIN = 'https://selector.example';
const FIRST_URL = `${ORIGIN}/interactions/z1/x?iuv=1`;
const NEXT_URL = 'https://gateway.example/interactions/z2?iuv=1';
const PREFERENCES = {
  type: ['VerifiableCredential', 'PersonalPreferencesCredential'],
  credentialSubject: {type: 'ContactPoint', telephone: '+15555550123'}
};
const SIGNED_IN = {account: {id: 'urn:uuid:new-account'}};
const EXCHANGE_ID = 'https://veres.example/workflows/w/exchanges/e';
const SIGN_IN_REQUEST = {
  query: [{
    type: 'QueryByExample',
    credentialQuery: [{example: {type: ['PersonalPreferencesCredential']}}]
  }]
};

// the wallet backend's side of a sign-in exchange
function backend({request = SIGN_IN_REQUEST, login} = {}) {
  httpClient.post.mockImplementation(async (url, {json}) => {
    if(url === '/authn/exchanges') {
      return {data: {exchangeId: EXCHANGE_ID, expires: 'soon'}};
    }
    if(url === EXCHANGE_ID) {
      return json.verifiablePresentation ? {data: {}} :
        {data: {verifiablePresentationRequest: request}};
    }
    if(url === '/authn/exchanges/login') {
      if(login) {
        return login();
      }
      return {data: {account: 'urn:uuid:new-account', created: true}};
    }
    throw new Error(`unexpected POST ${url}`);
  });
}

function mountPage() {
  const push = vi.fn();
  const wrapper = mount(InviteRequestPage, {
    global: {
      plugins: [Quasar],
      stubs: {StoreCredentials: true, ShareCredentials: true},
      mocks: {
        $route: {query: {request: FIRST_URL}, fullPath: '/invite?request=x'},
        $router: {push}
      }
    }
  });
  return {wrapper, push};
}

// the first leg delivers the preferences credential, then a follow-on is
// offered, as the wallet selector's chain does
function scriptChain({delta = [PREFERENCES]} = {}) {
  const seen = {};
  setInteractionChain(async options => {
    await options.onLegComplete({delta, origin: ORIGIN});
    seen.proceed = await options.onBeforeContinue({
      interactionUrl: NEXT_URL, origin: 'https://gateway.example',
      exchangeCount: 1, credentials: delta
    });
    return {credentials: delta, exchangeCount: 1, redirectUrl: null,
      canceled: !seen.proceed};
  });
  return seen;
}

// a signed-out holder is asked first; most specs here take "Continue"
async function chooseContinue(wrapper) {
  await flushPromises();
  await wrapper.find('[data-testid="invite-request-choose-continue"]')
    .trigger('click');
  await flushPromises();
}

describe('InviteRequestPage sign-in with a credential', () => {
  let added;
  beforeEach(() => {
    config.vueWallet = {interactionCreator: {
      allowedOrigins: [ORIGIN],
      signInWithCredential: {
        credentialTypes: ['PersonalPreferencesCredential'],
        exchangesUrl: '/authn/exchanges',
        loginUrl: '/authn/exchanges/login'
      }
    }};
    session.data = {};
    session.refresh = vi.fn(async () => {
      session.data = SIGNED_IN;
    });
    httpClient.post.mockReset();
    backend();
    firstRun.provisionDefaultProfile.mockClear();
    firstRun.setPendingDestination.mockClear();
    added = [];
    setCredentialStore(async () => ({
      add: async ({credentials}) => added.push(...credentials)
    }));
  });
  afterEach(() => {
    setInteractionChain(null);
    setCredentialStore(null);
    session.data = {account: {id: 'urn:uuid:account'}};
    session.refresh = async () => {};
  });

  it('signs in, sets up a profile, then offers the credential and the ' +
    'follow-on', async () => {
    const seen = scriptChain();
    const {wrapper, push} = mountPage();
    await chooseContinue(wrapper);
    // start, ask, answer with the credential, finish
    expect(httpClient.post.mock.calls).toEqual([
      ['/authn/exchanges', {json: {}}],
      [EXCHANGE_ID, {json: {}}],
      [EXCHANGE_ID, {json: {verifiablePresentation: {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiablePresentation'],
        verifiableCredential: [PREFERENCES]
      }}}],
      ['/authn/exchanges/login', {json: {}}]
    ]);
    expect(session.refresh).toHaveBeenCalled();
    expect(firstRun.provisionDefaultProfile).toHaveBeenCalledWith(
      {accountId: 'urn:uuid:new-account'});
    expect(wrapper.vm.account).toBe('urn:uuid:new-account');
    expect(wrapper.vm.display).toBe('store');
    await wrapper.vm.store({holder: '', verifiableCredential: [PREFERENCES]});
    await flushPromises();
    expect(added).toEqual([PREFERENCES]);
    await wrapper.find('[data-testid="invite-request-continue-accept"]')
      .trigger('click');
    await flushPromises();
    expect(seen.proceed).toBe(true);
    expect(push).toHaveBeenCalledWith({name: 'home'});
    wrapper.unmount();
  });

  it('shows a sign-in error when the backend refuses the credential',
    async () => {
      backend({login: async () => {
        throw new Error('400');
      }});
      scriptChain();
      const {wrapper} = mountPage();
      await chooseContinue(wrapper);
      expect(firstRun.provisionDefaultProfile).not.toHaveBeenCalled();
      expect(wrapper.vm.display).not.toBe('store');
      expect(wrapper.find('[data-testid="invite-request-error"]').text())
        .toContain('This link could not sign you in.');
      expect(wrapper.find('[data-testid="invite-request-sign-in"]').exists())
        .toBe(true);
      wrapper.unmount();
    });

  it('does not present the credential to an exchange that did not ask ' +
    'for it', async () => {
    backend({request: {query: [{type: 'DIDAuthentication'}]}});
    scriptChain();
    const {wrapper} = mountPage();
    await chooseContinue(wrapper);
    expect(httpClient.post.mock.calls.map(([url]) => url)).toEqual(
      ['/authn/exchanges', EXCHANGE_ID]);
    expect(session.refresh).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="invite-request-sign-in"]').exists())
      .toBe(true);
    wrapper.unmount();
  });

  it('shows a sign-in error when nothing delivered can sign in',
    async () => {
      scriptChain({delta: [{type: ['VerifiableCredential']}]});
      const {wrapper} = mountPage();
      await chooseContinue(wrapper);
      expect(httpClient.post).not.toHaveBeenCalled();
      expect(wrapper.find('[data-testid="invite-request-sign-in"]').exists())
        .toBe(true);
      wrapper.unmount();
    });

  it('sends a signed-out holder to log in when the invitation asks first',
    async () => {
      setInteractionChain(async options => {
        await options.onPresentationRequest({
          verifiablePresentationRequest: {query: []}, origin: ORIGIN
        });
      });
      const {wrapper, push} = mountPage();
      await chooseContinue(wrapper);
      expect(firstRun.setPendingDestination).toHaveBeenCalledWith(
        '/invite?request=x');
      expect(push).toHaveBeenCalledWith({name: 'login'});
      expect(httpClient.post).not.toHaveBeenCalled();
      wrapper.unmount();
    });

  it('asks a signed-out holder first, before running the invitation',
    async () => {
      const chain = vi.fn();
      setInteractionChain(chain);
      const {wrapper} = mountPage();
      await flushPromises();
      expect(wrapper.vm.display).toBe('choose');
      expect(wrapper.find('[data-testid="invite-request-choose"]').exists())
        .toBe(true);
      expect(chain).not.toHaveBeenCalled();
      wrapper.unmount();
    });

  it('sends a holder who chooses to sign in to log in, link unused',
    async () => {
      const chain = vi.fn();
      setInteractionChain(chain);
      const {wrapper, push} = mountPage();
      await flushPromises();
      await wrapper.find('[data-testid="invite-request-choose-sign-in"]')
        .trigger('click');
      await flushPromises();
      expect(firstRun.setPendingDestination).toHaveBeenCalledWith(
        '/invite?request=x');
      expect(push).toHaveBeenCalledWith({name: 'login'});
      expect(chain).not.toHaveBeenCalled();
      expect(httpClient.post).not.toHaveBeenCalled();
      wrapper.unmount();
    });

  it('does not ask or sign in again when already signed in', async () => {
    session.data = {account: {id: 'urn:uuid:account'}};
    scriptChain();
    const {wrapper} = mountPage();
    await flushPromises();
    expect(wrapper.find('[data-testid="invite-request-choose"]').exists())
      .toBe(false);
    expect(httpClient.post).not.toHaveBeenCalled();
    expect(wrapper.vm.display).toBe('store');
    wrapper.unmount();
  });

  it('does not sign in when the deployment has not enabled it', async () => {
    config.vueWallet.interactionCreator.signInWithCredential = {
      credentialTypes: []
    };
    scriptChain();
    const {wrapper} = mountPage();
    await flushPromises();
    expect(wrapper.find('[data-testid="invite-request-choose"]').exists())
      .toBe(false);
    expect(httpClient.post).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="invite-request-sign-in"]').exists())
      .toBe(true);
    wrapper.unmount();
  });
});
