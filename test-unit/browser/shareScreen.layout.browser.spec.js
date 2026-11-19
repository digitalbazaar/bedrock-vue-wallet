/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  QCard, QCardSection, QCheckbox, QIcon, QInnerLoading, QItem, QItemLabel,
  QItemSection, QSelect, QSeparator, QSpinnerTail, QToggle, Quasar
} from 'quasar';
import ChapiExchangePage from '../../routes/ChapiExchangePage.vue';
import {mount} from '@vue/test-utils';
import {page} from 'vitest/browser';
import {presentations} from '@bedrock/web-wallet';
import ScannerExchangePage from '../../routes/ScannerExchangePage.vue';
import 'quasar/dist/quasar.css';

// Needs a real engine: horizontal overflow at a phone viewport only shows in
// real layout with Quasar's stylesheet loaded. A profile DID is wider than a
// phone, and it is the widest line on the screen.

// the CHAPI page's sign-in forms are not on the share screen, and they import
// form and account packages this harness does not install
vi.mock('../../components/LoginForm.vue',
  () => ({default: {render: () => null}}));
vi.mock('../../components/RegisterForm.vue',
  () => ({default: {render: () => null}}));

const PROFILE_DID = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
const CREDENTIAL_ID = 'urn:uuid:4f9a1c3e-7d2b-4e8a-9b6f-1a2b3c4d5e6f';

const credentialRecord = {
  content: {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: CREDENTIAL_ID,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {id: 'did:web:issuer.example', name: 'Example Issuer'},
    credentialSubject: {id: PROFILE_DID}
  },
  meta: {id: CREDENTIAL_ID}
};

const verifiablePresentationRequest = {
  query: [{
    type: 'QueryByExample',
    credentialQuery: {example: {type: 'OpenBadgeCredential'}}
  }, {
    type: 'DIDAuthentication',
    acceptedMethods: [{method: 'key'}]
  }]
};

presentations.match = async () => ({flat: [{record: credentialRecord}]});
presentations.getCompatibleAuthnOptions = async () => ({
  authnOptions: [{type: 'Profile', value: {id: PROFILE_DID}}]
});

// registered because this harness installs no Quasar component globally, and
// an unresolved `q-*` tag carries none of Quasar's layout classes
const components = {
  QCard, QCardSection, QCheckbox, QIcon, QInnerLoading, QItem, QItemLabel,
  QItemSection, QSelect, QSeparator, QSpinnerTail, QToggle
};

const shareState = {
  ready: true,
  display: 'share',
  requestOrigin: 'https://verifier.example',
  verifiablePresentationRequest
};

const mountShareScreen = async ({page: Page, state}) => {
  const wrapper = mount(Page, {
    attachTo: document.body,
    global: {
      plugins: [Quasar],
      components,
      stubs: {BarcodeScanner: true}
    }
  });
  Object.assign(wrapper.vm, shareState, state);
  await vi.waitUntil(
    () => wrapper.find('.q-toggle').exists(), {timeout: 5000});
  return wrapper;
};

describe('the share screen at a phone viewport', () => {
  let wrapper;
  afterEach(() => wrapper?.unmount());

  it.each([
    ['ScannerExchangePage', ScannerExchangePage, {enableScanning: false}],
    ['ChapiExchangePage', ChapiExchangePage, {userLoggedIn: true}]
  ])('%s does not overflow a 390px viewport', async (_name, Page, state) => {
    await page.viewport(390, 844);
    await vi.waitUntil(() => window.innerWidth === 390, {timeout: 2000});
    wrapper = await mountShareScreen({page: Page, state});
    const offenders = [...wrapper.element.querySelectorAll('*')]
      .map(el => ({el, rect: el.getBoundingClientRect()}))
      // no icon font loads here, so a ligature icon's name renders as wide
      // text; the icon box itself is still measured
      .filter(({el}) => !el.parentElement.closest('.q-icon'))
      .filter(({rect}) => rect.width > 0 &&
        (rect.left < 0 || rect.right > window.innerWidth))
      .map(({el, rect}) =>
        `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ` +
        `[${Math.round(rect.left)}, ${Math.round(rect.right)}]`);
    expect(document.documentElement.scrollWidth).toBe(window.innerWidth);
    expect(offenders).toEqual([]);
  });
});
