/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {setCredentialStore, setInteractionChain} from '@bedrock/web-wallet';
import {config} from '@bedrock/web';
import InviteRequestPage from '../../routes/InviteRequestPage.vue';
import {Quasar} from 'quasar';

const ORIGIN = 'https://coordinator.example';
const FIRST_URL = `${ORIGIN}/workflows/a/exchanges/1`;
const NEXT_URL = 'https://issuer.example/workflows/b/exchanges/2?iuv=1';
const CREDENTIAL = {
  type: ['VerifiableCredential'], credentialSubject: {id: 'did:key:holder'}
};

// Drives the real page against a scripted chain: the chain calls the page's
// callbacks the way `completeInteractionChain()` does -- store the first
// leg's credentials, then ask before the follow-on exchange.
function mountPage({request = FIRST_URL} = {}) {
  const push = vi.fn();
  const wrapper = mount(InviteRequestPage, {
    global: {
      plugins: [Quasar],
      stubs: {StoreCredentials: true, ShareCredentials: true},
      mocks: {$route: {query: {request}}, $router: {push}}
    }
  });
  return {wrapper, push};
}

describe('InviteRequestPage follow-on exchanges', () => {
  let added;
  beforeEach(() => {
    config.vueWallet = {interactionCreator: {allowedOrigins: [ORIGIN]}};
    added = [];
    setCredentialStore(async () => ({
      add: async ({credentials}) => added.push(...credentials)
    }));
  });
  afterEach(() => {
    setInteractionChain(null);
    setCredentialStore(null);
  });

  function scriptChain() {
    const seen = {};
    setInteractionChain(async options => {
      seen.options = options;
      await options.onLegComplete({delta: [CREDENTIAL], origin: ORIGIN});
      seen.proceed = await options.onBeforeContinue({
        interactionUrl: NEXT_URL, origin: 'https://issuer.example',
        exchangeCount: 1, credentials: [CREDENTIAL]
      });
      return {credentials: [CREDENTIAL], exchangeCount: 1,
        redirectUrl: null, canceled: !seen.proceed};
    });
    return seen;
  }

  it('supplies the exchange interfaces the chain requires', async () => {
    const seen = scriptChain();
    const {wrapper} = mountPage();
    await flushPromises();
    for(const name of [
      'createInteraction', 'startExchange', 'onBeforeContinue'
    ]) {
      expect(typeof seen.options[name]).toBe('function');
    }
    expect(seen.options.interactionUrl).toBe(FIRST_URL);
    wrapper.unmount();
  });

  it('asks after storing, and continues when the holder accepts',
    async () => {
      const seen = scriptChain();
      const {wrapper, push} = mountPage();
      await flushPromises();
      // first leg: offered for storage
      expect(wrapper.vm.display).toBe('store');
      await wrapper.vm.store({
        holder: 'did:key:holder', verifiableCredential: [CREDENTIAL]
      });
      await flushPromises();
      expect(added).toEqual([CREDENTIAL]);
      // then the follow-on prompt, naming where it leads
      const prompt = wrapper.find('[data-testid="invite-request-continue"]');
      expect(prompt.exists()).toBe(true);
      expect(prompt.text()).toContain('https://issuer.example');
      await wrapper.find('[data-testid="invite-request-continue-accept"]')
        .trigger('click');
      await flushPromises();
      expect(seen.proceed).toBe(true);
      expect(push).toHaveBeenCalledWith({name: 'home'});
      wrapper.unmount();
    });

  it('stops the chain and goes home when the holder declines', async () => {
    const seen = scriptChain();
    const {wrapper, push} = mountPage();
    await flushPromises();
    await wrapper.vm.store({
      holder: 'did:key:holder', verifiableCredential: [CREDENTIAL]
    });
    await flushPromises();
    await wrapper.find('[data-testid="invite-request-continue-decline"]')
      .trigger('click');
    await flushPromises();
    expect(seen.proceed).toBe(false);
    expect(push).toHaveBeenCalledWith({name: 'home'});
    wrapper.unmount();
  });

  it('goes home without following a non-interaction redirect', async () => {
    const start = vi.fn();
    setInteractionChain(async () => {
      start();
      return {credentials: [], exchangeCount: 1,
        redirectUrl: 'https://coordinator.example/done', canceled: false};
    });
    const {wrapper, push} = mountPage();
    await flushPromises();
    expect(start).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({name: 'home'});
    expect(push).not.toHaveBeenCalledWith(
      'https://coordinator.example/done');
    wrapper.unmount();
  });

  it('refuses a first URL whose origin is not allowed', async () => {
    const chain = vi.fn();
    setInteractionChain(chain);
    const {wrapper} = mountPage({
      request: 'https://elsewhere.example/workflows/a/exchanges/1'
    });
    await flushPromises();
    expect(chain).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="invite-request-error"]').text())
      .toContain('does not accept invitations from https://elsewhere.example');
    wrapper.unmount();
  });
});
