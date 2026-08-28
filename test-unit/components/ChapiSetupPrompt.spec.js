/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {Notify, QBtn, QCard, QDialog, Quasar} from 'quasar';
import {addWalletToChapi} from '../../lib/helpers.js';
import ChapiSetupPrompt from '../../components/ChapiSetupPrompt.vue';

// `helpers.js` reaches `web-credential-handler`, which talks to the mediator
vi.mock('../../lib/helpers.js', () => ({addWalletToChapi: vi.fn()}));

const ACCOUNT = 'urn:uuid:1f0e3dad-9987-4f7c-9b6e-1f0e3dad9987';

const wrappers = [];

async function render() {
  const wrapper = mount(ChapiSetupPrompt, {
    props: {account: ACCOUNT},
    global: {
      plugins: [[Quasar, {plugins: {Notify}}]],
      components: {QBtn, QCard, QDialog}
    }
  });
  wrappers.push(wrapper);
  // the dialog portals its content on the tick after mount
  await flushPromises();
  return wrapper;
}

const button = (wrapper, label) => wrapper.findAllComponents(QBtn)
  .find(b => b.props('label') === label);

const shows = wrapper => button(wrapper, 'Show Wallet') !== undefined;

let warnings = [];

describe('ChapiSetupPrompt', () => {
  beforeEach(() => {
    window.localStorage.clear();
    addWalletToChapi.mockReset();
    addWalletToChapi.mockResolvedValue(undefined);
    warnings = [];
    vi.spyOn(console, 'warn')
      .mockImplementation((...args) => warnings.push(args.join(' ')));
  });

  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount());
    expect(warnings, `unexpected console.warn: ${warnings.join(' | ')}`)
      .toEqual([]);
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('shows for an account that has not been asked', async () => {
    expect(shows(await render())).toBe(true);
  });

  // storage can throw, e.g. Safari with cookies blocked; showing the prompt
  // then would put it back on every page load
  it('does not show when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(shows(await render())).toBe(false);
  });

  it('does not ask again once answered', async () => {
    const wrapper = await render();
    await button(wrapper, 'Dismiss').trigger('click');
    await flushPromises();
    expect(shows(await render())).toBe(false);
  });

  // the browser's answer is unknowable, so a failed registration still counts
  // as answered; treating it as unanswered is the every-page-load bug
  it('does not ask again after a failed registration', async () => {
    addWalletToChapi.mockRejectedValue(new Error('Permission denied.'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = await render();
    await button(wrapper, 'Show Wallet').trigger('click');
    await flushPromises();
    expect(shows(await render())).toBe(false);
  });
});
