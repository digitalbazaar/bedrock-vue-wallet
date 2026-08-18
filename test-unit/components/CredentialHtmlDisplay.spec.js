/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {
  lastHandle, resetLastHandle
} from '../mocks/digitalbazaar/vc-html-render-method.js';
import {QBanner, QSpinner, Quasar} from 'quasar';
import CredentialHtmlDisplay from
  '../../components/CredentialHtmlDisplay.vue';

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
    // the Quasar plugin does not register components; an app auto-imports
    // them. Without this the template's `q-spinner`/`q-banner` never resolve
    // and the component under test only half renders -- which the blanket
    // `console.warn` suppression used to hide.
    global: {plugins: [[Quasar, {}]], components: {QBanner, QSpinner}}
  });
  await flushPromises();
  return wrapper;
}

const mountHeight = wrapper =>
  wrapper.find('.html-render-mount').element.style.height;

let warnSpy;
let warnings = [];

describe('CredentialHtmlDisplay', () => {
  beforeEach(() => {
    resetLastHandle();
    warnings = [];
    warnSpy = vi.spyOn(console, 'warn')
      .mockImplementation((...args) => warnings.push(args.join(' ')));
  });

  afterEach(() => {
    // Vue warns through `console.warn` -- a failed prop type, a missing
    // injection, an unknown component. Blanket-suppressing it hid all of
    // those, so `styleHint` typed as a String while an object was passed
    // would have warned and still passed. Fail on anything unexpected
    // instead.
    expect(warnings, `unexpected console.warn: ${warnings.join(' | ')}`)
      .toEqual([]);
    warnSpy.mockRestore();
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

  it('scales a rendering wider than the space down to fit', async () => {
    // an issuer lays out at the width it designed for; on a phone that is
    // usually wider than the room available, and the overflow was simply
    // clipped -- text truncating mid-word, a barcode running off the edge
    const wrapper = await render();
    const mount = wrapper.find('.html-render-mount').element;
    Object.defineProperty(
      mount, 'clientWidth', {value: 300, configurable: true});
    const frame = document.createElement('iframe');
    mount.appendChild(frame);

    lastHandle.emit('resize', {width: 600, height: 400});
    await flushPromises();
    // half the width, so half the scale, and half the vertical space taken
    expect(frame.style.transform).toBe('scale(0.5)');
    expect(mount.style.height).toBe('200px');
  });

  it('never scales a narrow rendering up', async () => {
    // an issuer that designed narrow did so deliberately
    const wrapper = await render();
    const mount = wrapper.find('.html-render-mount').element;
    Object.defineProperty(
      mount, 'clientWidth', {value: 600, configurable: true});
    const frame = document.createElement('iframe');
    mount.appendChild(frame);

    lastHandle.emit('resize', {width: 300, height: 400});
    await flushPromises();
    expect(frame.style.transform).toBe('');
    expect(mount.style.height).toBe('400px');
  });

  it('tears the frame down when it goes away', async () => {
    const wrapper = await render();
    const handle = lastHandle;
    wrapper.unmount();
    expect(handle.destroyed).toBe(true);
  });
});
