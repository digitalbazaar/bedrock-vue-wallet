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
