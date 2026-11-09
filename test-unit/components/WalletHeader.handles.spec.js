/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {config} from '@bedrock/web';
import {mount} from '@vue/test-utils';
import {Quasar} from 'quasar';
import WalletHeader from '../../components/WalletHeader.vue';

const HANDLE = '[data-testid="maestro-user-menu"]';

const mountHeader = () => mount(WalletHeader, {
  props: {account: 'urn:uuid:account'},
  global: {
    plugins: [Quasar],
    mocks: {
      $route: {path: '/home', name: 'home', meta: {}},
      $router: {push() {}}
    }
  }
});

// Maestro taps the center of whatever its `css` selector matches, so the
// handle has to sit on the control that opens the menu, and on nothing else
describe('the account menu handle', () => {
  beforeEach(() => {
    config.vueWallet = {branding: {name: 'Wallet'}};
  });
  afterEach(() => {
    delete config.vueWallet;
  });

  it('marks exactly one element', () => {
    const wrapper = mountHeader();
    expect(wrapper.findAll(HANDLE)).toHaveLength(1);
    wrapper.unmount();
  });

  it('marks the control that carries the menu\'s accessible name', () => {
    const wrapper = mountHeader();
    expect(wrapper.find(HANDLE).attributes('aria-label'))
      .toBe('Account menu');
    wrapper.unmount();
  });

  it('gives the menu no id, which a second header would duplicate', () => {
    const wrapper = mountHeader();
    expect(wrapper.find(HANDLE).attributes('id')).toBeUndefined();
    wrapper.unmount();
  });
});
