/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {Notify, Quasar} from 'quasar';
import {config} from '@bedrock/web';
import CredentialCompactBundle from
  '../../components/CredentialCompactBundle.vue';
import CredentialDetailsMobile from
  '../../components/CredentialDetailsMobile.vue';
import CredentialListRow from '../../components/CredentialListRow.vue';
import {h} from 'vue';

// A design whose title comes from a pointer *and* carries a format. This is
// the case the two surfaces used to disagree about: the row rendered the raw
// pointer value and the details panel rendered it capitalized.
const CARD_DESIGNS = [{
  matches: {'/type': 'MovieTicketCredential'},
  title: 'Movie Ticket',
  overrides: {
    title: {pointer: '/credentialSubject/holder', format: 'capitalize'}
  }
}];

const RECORD = {
  credential: {
    type: ['VerifiableCredential', 'MovieTicketCredential'],
    id: 'urn:uuid:credential',
    credentialSubject: {holder: 'JANE DOE'}
  },
  meta: {id: 'urn:uuid:record', holder: 'urn:uuid:profile'}
};

const rowTitle = () => {
  const wrapper = mount(CredentialListRow, {
    props: {credentialRecord: RECORD},
    global: {plugins: [Quasar]}
  });
  const text = wrapper.find('.text-subtitle2').text();
  wrapper.unmount();
  return text;
};

const detailsTitle = () => {
  const wrapper = mount(CredentialDetailsMobile, {
    props: {record: RECORD, deleteCredential: async () => {}},
    global: {plugins: [[Quasar, {plugins: {Notify}}]]}
  });
  const text = wrapper.find('.text-h6').text();
  wrapper.unmount();
  return text;
};

// A row and the panel it opens are the same credential. They resolved the
// card design independently, and independently is how they drifted: only one
// of them applied the configured format. They read one summary now, and this
// asserts the agreement rather than either answer on its own -- so a surface
// added later that grows its own copy fails here.
describe('a row and the details view it opens', () => {
  beforeEach(() => {
    config.vueWallet = {cardDesigns: CARD_DESIGNS};
  });
  afterEach(() => {
    delete config.vueWallet;
  });

  it('title the same credential identically', () => {
    expect(rowTitle()).toBe(detailsTitle());
  });

  it('both apply the format the design configures', () => {
    expect(rowTitle()).toBe('Jane Doe');
    expect(detailsTitle()).toBe('Jane Doe');
  });
});

// the compact bundle renders the same records and recognized only
// `{content, meta}`, so it wrapped this one a second time and rendered nothing
describe('the compact bundle', () => {
  it('renders a record with `credential`', async () => {
    const wrapper = mount(CredentialCompactBundle, {
      props: {credentials: [RECORD], schemaMap: {}, store: true},
      slots: {
        'credential-switch': ({record, credential}) => h(
          'div', {class: 'probe'}, `${record.meta.id} ${credential.id}`)
      },
      global: {plugins: [Quasar]}
    });
    await flushPromises();
    expect(wrapper.find('.probe').text())
      .toBe('urn:uuid:record urn:uuid:credential');
    wrapper.unmount();
  });
});
