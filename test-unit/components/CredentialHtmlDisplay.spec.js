/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import CredentialHtmlDisplay from
  '../../components/CredentialHtmlDisplay.vue';
import {lastHandle} from '../mocks/digitalbazaar/vc-html-render-method.js';
import {Quasar} from 'quasar';

const credential = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential'],
  name: 'ShopCo Digital Loyalty Card'
};

const renderMethod = {
  type: 'TemplateRenderMethod', renderSuite: 'html',
  template: 'data:text/html;base64,PGRpdj5oaTwvZGl2Pg=='
};

async function render(props = {}) {
  const wrapper = mount(CredentialHtmlDisplay, {
    props: {credential, renderMethod, ...props},
    global: {plugins: [[Quasar, {}]]}
  });
  await flushPromises();
  return wrapper;
}

const mountHeight = wrapper =>
  wrapper.find('.html-render-mount').element.style.height;

describe('CredentialHtmlDisplay', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('sizes the mount from the frame', async () => {
    const wrapper = await render();
    lastHandle.emit('resize', {height: 324});
    expect(mountHeight(wrapper)).toBe('324px');
  });

  it('ignores a height that only differs by rounding', async () => {
    // Setting the mount height re-lays-out the frame, which reports a new
    // size, which sets the height again. Observed live: 324, 325, 326, 325,
    // 326, 325 -- oscillating rather than settling. Anything at or below the
    // epsilon must not be written back, or the loop never stops.
    const wrapper = await render();
    lastHandle.emit('resize', {height: 324});
    lastHandle.emit('resize', {height: 325});
    lastHandle.emit('resize', {height: 326});
    lastHandle.emit('resize', {height: 325});
    expect(mountHeight(wrapper)).toBe('324px');
  });

  it('still applies a height change big enough to see', async () => {
    // the epsilon must not swallow a real resize -- a credential whose
    // template grows when an image loads has to be allowed to grow
    const wrapper = await render();
    lastHandle.emit('resize', {height: 324});
    lastHandle.emit('resize', {height: 480});
    expect(mountHeight(wrapper)).toBe('480px');
  });

  it('accepts the height under either payload shape', async () => {
    const wrapper = await render();
    lastHandle.emit('resize', {detail: {height: 300}});
    expect(mountHeight(wrapper)).toBe('300px');
  });

  it('ignores a resize carrying no height', async () => {
    const wrapper = await render();
    lastHandle.emit('resize', {height: 324});
    lastHandle.emit('resize', {});
    lastHandle.emit('resize', {height: undefined});
    expect(mountHeight(wrapper)).toBe('324px');
  });

  it('reserves space from the issuer style hint before the frame reports',
    async () => {
      // without this the card opens at zero and jumps when the frame sizes
      const wrapper = await render({styleHint: {height: '800px'}});
      expect(mountHeight(wrapper)).toBe('800px');
    });

  it('tears the frame down when it goes away', async () => {
    const wrapper = await render();
    const handle = lastHandle;
    wrapper.unmount();
    expect(handle.destroyed).toBe(true);
  });
});
