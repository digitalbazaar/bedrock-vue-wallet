/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {
  QBanner, QBtn, QCard, QCardSection, QCarousel, QCarouselSlide, QIcon, QImg,
  QScrollArea, QSpinner, QTab, QTabPanel, QTabPanels, QTabs, Quasar
} from 'quasar';
import CredentialDetailsViews from
  '../../components/CredentialDetailsViews.vue';

const CREDENTIAL = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential'],
  credentialSubject: {},
  renderMethod: [
    {type: 'UnsupportedRenderingTemplate', id: 'https://example.com/x'}
  ]
};

describe('a credential whose render methods resolve to nothing', () => {
  it('leaves the one remaining tab selected', async () => {
    const wrapper = mount(CredentialDetailsViews, {
      props: {credential: CREDENTIAL, credentialHighlights: {}},
      attachTo: document.body,
      global: {
        plugins: [Quasar],
        // the plugin installs behaviour, not components; without these the
        // tabs never render and nothing about active state is observable
        components: {
          QTabs, QTab, QTabPanels, QTabPanel, QCarousel, QCarouselSlide,
          QScrollArea, QBanner, QBtn, QIcon, QSpinner, QCard, QCardSection,
          QImg
        }
      }
    });
    await flushPromises();
    await new Promise(r => setTimeout(r, 250));
    await wrapper.vm.$nextTick();
    const tabs = [...wrapper.element.querySelectorAll('.q-tab')]
      .map(el => el.textContent.trim());
    const active = [...wrapper.element.querySelectorAll('.q-tab--active')]
      .map(el => el.textContent.trim());
    // the model naming a tab is not the same as the user seeing it selected:
    // the tab is chosen while the render methods resolve, and the one it named
    // stops rendering when they resolve to nothing
    expect(tabs).toEqual(['Details']);
    expect(active).toEqual(['Details']);
    wrapper.unmount();
  });
});
