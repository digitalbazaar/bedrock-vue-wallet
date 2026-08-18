/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it, vi} from 'vitest';
import CredentialHtmlDisplay from
  '../../components/CredentialHtmlDisplay.vue';
import {mount} from '@vue/test-utils';
import {Quasar} from 'quasar';

// Needs a real engine: the render method draws into a nested iframe at an
// opaque origin under `sandbox="allow-scripts"`, driven over `MessageChannel`.
// jsdom implements neither the nested frame nor the channel, so the unit spec
// stubs the library outright and can only assert that the component calls it.
// What is checked here is that a real frame appears, is sandboxed, and draws.
const CREDENTIAL = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential'],
  name: 'Test Card',
  credentialSubject: {name: 'Test Card'},
  renderMethod: [{
    type: 'TemplateRenderMethod',
    renderSuite: 'html',
    template: '<h1 id="drawn" style="height: 120px">rendered</h1>'
  }]
};

const WIDE_CREDENTIAL = {
  ...CREDENTIAL,
  renderMethod: [{
    type: 'TemplateRenderMethod',
    renderSuite: 'html',
    // far wider than any phone, which is the common case: issuers lay out
    // for a card, not for a 390px viewport
    template: '<div style="width:900px;height:200px;background:#08f">wide' +
      '</div>'
  }]
};

const render = () => mount(CredentialHtmlDisplay, {
  props: {credential: CREDENTIAL},
  global: {plugins: [Quasar]},
  attachTo: document.body
});

describe('CredentialHtmlDisplay in a browser', () => {
  it('sandboxes the template frame at an opaque origin', async () => {
    // Two frames, and only the inner one is sandboxed. The library mounts a
    // same-origin HOST frame carrying `frame-src 'none'`, and the issuer's
    // template runs in a `srcdoc` TEMPLATE frame nested inside it. Asserting
    // on the host frame reads `null` and tells you nothing -- which is how an
    // earlier version of this test passed while checking the wrong element.
    const wrapper = render();
    const host = await vi.waitUntil(
      () => wrapper.element.querySelector('iframe'), {timeout: 5000});
    const template = await vi.waitUntil(
      () => host.contentDocument?.querySelector('iframe'), {timeout: 5000});

    const sandbox = template.getAttribute('sandbox');
    // asserted non-empty FIRST: `not.toContain` against a `?? ''` default
    // passes when the attribute is absent, so it passes hardest exactly when
    // the frame is fully privileged
    expect(sandbox, 'the template frame must carry a sandbox attribute')
      .toEqual(expect.any(String));
    expect(sandbox.length).toBeGreaterThan(0);
    expect(sandbox).toContain('allow-scripts');
    // without `allow-same-origin` the origin is opaque, which is what stops
    // issuer script reaching the wallet
    expect(sandbox).not.toContain('allow-same-origin');
    wrapper.unmount();
  });

  it('fits a rendering wider than the space, without pushing the page sideways',
    async () => {
      // Two failures happened here in sequence and each hid the other. First
      // the frame was `width: 100%` and a wider rendering was simply clipped:
      // text truncated mid-word, a barcode ran off the edge. Then scaling it
      // fixed the look and broke the layout, because `transform` shrinks an
      // element visually while leaving its layout box at full size, so the
      // whole page gained a horizontal scrollbar. Asserting the transform
      // alone would have passed through the second failure.
      const host = document.createElement('div');
      host.style.width = '300px';
      document.body.appendChild(host);
      const wrapper = mount(CredentialHtmlDisplay, {
        props: {credential: WIDE_CREDENTIAL},
        global: {plugins: [Quasar]},
        attachTo: host
      });
      const mountEl = wrapper.element.querySelector('.html-render-mount');
      await vi.waitUntil(
        () => mountEl.querySelector('iframe')?.style.transform,
        {timeout: 5000});

      // scaled to fit
      expect(mountEl.querySelector('iframe').style.transform)
        .toMatch(/^scale\(0\.33/);
      // and contained. `scrollWidth` on the mount itself still reports the
      // content size even when clipped, so the assertion that matters is the
      // container: nothing may make it scrollable, which is what put a
      // horizontal scrollbar on the whole page.
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
      expect(getComputedStyle(mountEl).overflowX).toBe('hidden');
      wrapper.unmount();
      host.remove();
    });

  it('stops scaling once the rendering fits again', async () => {
    // The failure this covers: scaling was applied when narrow and never
    // undone. Widen the window and the frame keeps `position: absolute`, a
    // stale width and a stale scale, so it sits out of flow at the wrong size
    // and clips -- broken at a width where it fits easily. Every earlier test
    // rendered at one width and could not see it.
    const host = document.createElement('div');
    host.style.width = '300px';
    document.body.appendChild(host);
    const wrapper = mount(CredentialHtmlDisplay, {
      props: {credential: WIDE_CREDENTIAL},
      global: {plugins: [Quasar]},
      attachTo: host
    });
    const mountEl = wrapper.element.querySelector('.html-render-mount');
    const frame = await vi.waitUntil(
      () => mountEl.querySelector('iframe')?.style.transform ?
        mountEl.querySelector('iframe') : null, {timeout: 5000});
    expect(frame.style.transform).toMatch(/^scale\(0\.33/);

    // now there is room for it
    host.style.width = '1200px';
    await vi.waitUntil(() => frame.style.transform === '', {timeout: 5000});
    expect(frame.style.position).toBe('');
    expect(frame.style.width).toBe('');
    wrapper.unmount();
    host.remove();
  });

  it('gives the mount a height once the frame reports its size', async () => {
    const wrapper = render();
    const mountEl = wrapper.element.querySelector('.html-render-mount');
    // the resize relay is the reason this component exists; a frame that
    // renders at zero height is indistinguishable from one that never drew
    await expect.poll(() => parseInt(mountEl.style.height, 10) || 0,
      {timeout: 5000}).toBeGreaterThan(0);
    wrapper.unmount();
  });
});
