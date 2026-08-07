/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {defineComponent, nextTick} from 'vue';
import CredentialDashboard from '../../components/CredentialDashboard.vue';
import {flushPromises} from '@vue/test-utils';
import {mount} from '@vue/test-utils';
import {Quasar} from 'quasar';

vi.mock('@bedrock/web', () => ({config: {}}));
vi.mock('@digitalbazaar/vue-extendable-event', () => ({
  createEmitExtendable: ({emit}) => (event, data) => emit(event, data)
}));
// canvas is not implemented in jsdom, and what the artwork analysis returns is
// covered by its own spec; this one is about which rendering gets mounted
vi.mock('../../lib/imageColor.js', () => ({
  analyzeArtwork: async ({src}) => ({src, color: '#123456'})
}));

const SVG_URI = 'data:image/svg+xml;base64,PHN2Zy8+';

const svgRenderMethod = {type: 'SvgRenderingTemplate2023', id: SVG_URI};

const htmlRenderMethod = (overrides = {}) => ({
  type: 'TemplateRenderMethod',
  renderSuite: 'html',
  template: '<p>hello</p>',
  ...overrides
});

function record(renderMethod) {
  return {
    credential: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'TestCredential'],
      id: 'urn:test:credential:1',
      name: 'Test Credential',
      credentialSubject: {},
      ...(renderMethod ? {renderMethod} : {})
    },
    meta: {id: 'urn:test:meta:1', holder: 'urn:test:profile:1'}
  };
}

const CredentialsListStub = defineComponent({
  name: 'CredentialsList',
  emits: ['select', 'delete-credential'],
  template: '<div />'
});

// unlike the other dashboard specs this one must render the slot: the hero is
// passed down through `under-card`, so a stub that drops slots would report
// every rendering as absent
const CredentialDetailsStub = defineComponent({
  name: 'CredentialDetails',
  props: [
    'credential', 'hideCard', 'toggleDetailsWindow', 'toggleDeleteWindow'
  ],
  template: '<div><slot name="under-card" /></div>'
});

const CredentialHtmlDisplayStub = defineComponent({
  name: 'CredentialHtmlDisplay',
  props: ['credential', 'renderMethod', 'styleHint'],
  template: '<div class="html-display-stub" />'
});

const mountDashboard = () => mount(CredentialDashboard, {
  props: {credentials: [], errorText: '', loading: false},
  global: {
    plugins: [[Quasar, {}]],
    stubs: {
      CredentialsList: CredentialsListStub,
      CredentialDetails: CredentialDetailsStub,
      CredentialHtmlDisplay: CredentialHtmlDisplayStub,
      SearchBox: true,
      ShowScannerModal: true,
      QrCode: true
    }
  }
});

async function select(wrapper, selectedRecord) {
  await wrapper.findComponent(CredentialsListStub).vm
    .$emit('select', selectedRecord);
  await flushPromises();
  await nextTick();
}

describe('CredentialDashboard — the hero rendering', () => {
  // mounting the dashboard warns about directives the stubs do not provide
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('shows an svg rendering as an image', async () => {
    const wrapper = mountDashboard();
    await select(wrapper, record([svgRenderMethod]));
    const img = wrapper.find('.s-details-hero img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe(SVG_URI);
    expect(wrapper.findComponent(CredentialHtmlDisplayStub).exists())
      .toBe(false);
  });

  it('mounts the html renderer rather than an image for an html rendering',
    async () => {
      // an html rendering is a live sandboxed frame; it has no `src` a plain
      // <img> could point at
      const wrapper = mountDashboard();
      await select(wrapper, record([htmlRenderMethod()]));
      expect(wrapper.findComponent(CredentialHtmlDisplayStub).exists())
        .toBe(true);
      expect(wrapper.find('.s-details-hero img').exists()).toBe(false);
    });

  it('prefers the html rendering over an svg the credential declares first',
    async () => {
      // the choice follows this surface's declared preference, not the order
      // the issuer happened to write the render methods in
      const wrapper = mountDashboard();
      await select(wrapper, record([svgRenderMethod, htmlRenderMethod()]));
      expect(wrapper.findComponent(CredentialHtmlDisplayStub).exists())
        .toBe(true);
    });

  it('passes the chosen render method down, not just the credential',
    async () => {
      // a credential may declare more than one html rendering; the frame must
      // render the one that was chosen
      const chosen = htmlRenderMethod({
        name: 'Portrait',
        outputPreference: {mediaType: 'text/html', style: {height: '640px'}}
      });
      const wrapper = mountDashboard();
      await select(
        wrapper, record([htmlRenderMethod({name: 'Other'}), chosen]));
      const display = wrapper.findComponent(CredentialHtmlDisplayStub);
      // declaration order breaks the tie, so 'Other' is the one to expect
      expect(display.props('renderMethod').name).toBe('Other');

      const second = mountDashboard();
      await select(second, record([chosen]));
      expect(second.findComponent(CredentialHtmlDisplayStub).props('styleHint'))
        .toEqual({height: '640px'});
    });

  it('skips a rendering the issuer marked as non-visual', async () => {
    const wrapper = mountDashboard();
    await select(wrapper, record([
      htmlRenderMethod({outputPreference: {accessMode: ['auditory']}}),
      svgRenderMethod
    ]));
    expect(wrapper.findComponent(CredentialHtmlDisplayStub).exists())
      .toBe(false);
    expect(wrapper.find('.s-details-hero img').exists()).toBe(true);
  });

  it('keeps the plain card for a credential that renders nothing', async () => {
    const wrapper = mountDashboard();
    await select(wrapper, record());
    expect(wrapper.find('.s-details-hero').exists()).toBe(false);
    expect(wrapper.findComponent(CredentialDetailsStub).props('hideCard'))
      .toBe(false);
  });

  it('hides the plain card once the credential renders itself', async () => {
    // the rendering IS the card; showing both reads as a card within a card
    const wrapper = mountDashboard();
    await select(wrapper, record([htmlRenderMethod()]));
    expect(wrapper.findComponent(CredentialDetailsStub).props('hideCard'))
      .toBe(true);
  });

  it('drops the previous rendering when another credential is selected',
    async () => {
      const wrapper = mountDashboard();
      await select(wrapper, record([htmlRenderMethod()]));
      expect(wrapper.findComponent(CredentialHtmlDisplayStub).exists())
        .toBe(true);
      await select(wrapper, record());
      expect(wrapper.findComponent(CredentialHtmlDisplayStub).exists())
        .toBe(false);
      expect(wrapper.find('.s-details-hero').exists()).toBe(false);
    });
});
