/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {beforeEach, describe, expect, it} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import HomePage from '../../routes/HomePage.vue';
import {Quasar} from 'quasar';
import {setCredentialStore} from '@bedrock/web-wallet';

// The gap this covers: `CredentialDashboard` reports a failed pull-to-refresh
// by catching a rejection from the parent's `waitUntil` promise, and its own
// spec supplies that rejection directly. That proves the handler works given
// one and says nothing about whether anything produces one. `getCredentials`
// catches every failure and resolves -- it must, since it also runs on mount
// and from a watcher, neither of which can handle a rejection -- so the
// handler's error path was unreachable in the running app and the spinner
// retracted on failure exactly as on success.
//
// So this drives the real `HomePage`, not a copy of its logic.
// `getCredentials` loops over the shown profiles, so with none configured it
// never reaches the store and cannot fail -- the mock supplies one by default
const mountHome = () => mount(HomePage, {
  props: {account: 'urn:uuid:account'},
  global: {plugins: [Quasar], stubs: {CredentialDashboard: true}}
});

describe('HomePage refresh, as the pull spinner sees it', () => {
  beforeEach(() => {
    setCredentialStore(null);
  });

  it('resolves when the credential store answers', async () => {
    const wrapper = mountHome();
    await flushPromises();
    await expect(wrapper.vm.refreshCredentials()).resolves.toBeUndefined();
    wrapper.unmount();
  });

  it('rejects when the store fails, so the spinner can report it', async () => {
    setCredentialStore(async () => {
      throw new Error('network is down');
    });
    const wrapper = mountHome();
    await flushPromises();
    await expect(wrapper.vm.refreshCredentials()).rejects.toThrow(
      /Could not retrieve your credentials/);
    // additional to the banner text, not instead of it: the desktop list and
    // the mobile banner both still read `errorText`
    expect(wrapper.vm.errorText).toContain('Could not retrieve your');
    wrapper.unmount();
  });
});
