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

describe('InviteRequestPage sign-in with a credential', () => {
  let added;
  beforeEach(() => {
    config.vueWallet = {interactionCreator: {
      allowedOrigins: [ORIGIN],
      signInWithCredential: {
        credentialTypes: ['PersonalPreferencesCredential'],
        url: '/authn/credential-login'
      }
    }};
    session.data = {};
    session.refresh = vi.fn(async () => {
      session.data = SIGNED_IN;
    });
    httpClient.post.mockReset();
    httpClient.post.mockResolvedValue(
      {data: {account: 'urn:uuid:new-account', created: true}});
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
    await flushPromises();
    expect(httpClient.post).toHaveBeenCalledWith('/authn/credential-login', {
      json: {verifiableCredential: PREFERENCES}
    });
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
      httpClient.post.mockRejectedValue(new Error('400'));
      scriptChain();
      const {wrapper} = mountPage();
      await flushPromises();
      expect(firstRun.provisionDefaultProfile).not.toHaveBeenCalled();
      expect(wrapper.vm.display).not.toBe('store');
      expect(wrapper.find('[data-testid="invite-request-error"]').text())
        .toContain('This link could not sign you in.');
      expect(wrapper.find('[data-testid="invite-request-sign-in"]').exists())
        .toBe(true);
      wrapper.unmount();
    });

  it('shows a sign-in error when nothing delivered can sign in',
    async () => {
      scriptChain({delta: [{type: ['VerifiableCredential']}]});
      const {wrapper} = mountPage();
      await flushPromises();
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
      await flushPromises();
      expect(firstRun.setPendingDestination).toHaveBeenCalledWith(
        '/invite?request=x');
      expect(push).toHaveBeenCalledWith({name: 'login'});
      expect(httpClient.post).not.toHaveBeenCalled();
      wrapper.unmount();
    });

  it('does not sign in again when already signed in', async () => {
    session.data = {account: {id: 'urn:uuid:account'}};
    scriptChain();
    const {wrapper} = mountPage();
    await flushPromises();
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
    expect(httpClient.post).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="invite-request-sign-in"]').exists())
      .toBe(true);
    wrapper.unmount();
  });
});
