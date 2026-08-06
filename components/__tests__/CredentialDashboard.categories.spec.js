/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {config} from '@bedrock/web';
import CredentialDashboard from '../CredentialDashboard.vue';
import {defineComponent} from 'vue';
import {mount} from '@vue/test-utils';
import {Quasar} from 'quasar';

// the rules carry the vocabulary and the component only matches them, so the
// spec supplies its own rather than depending on the app's config
// deliberately not in alphabetical order: if the declared order matched a
// sorted one, a component that sorted its chips would pass these tests
const CATEGORIES = [
  // narrow before broad: a payment token is also a `RetailCredential`
  {category: 'Payment', matches: {'/credentialSubject/type': 'PaymentToken'}},
  {category: 'Retail', matches: {'/type': 'RetailCredential'}},
  {category: 'Retail', matches: {'/type': 'MovieTicketCredential'}},
  {category: 'Identity', matches: {'/type': 'PermanentResidentCard'}}
];

function record({type = ['VerifiableCredential'], name, subjectType} = {}) {
  return {
    credential: {
      type, name,
      credentialSubject: subjectType ? {type: subjectType} : {}
    },
    meta: {id: `urn:uuid:${name ?? 'plain'}`, holder: 'urn:uuid:profile'}
  };
}

const RECORDS = {
  prc: record({
    type: ['VerifiableCredential', 'PermanentResidentCard'],
    name: 'Permanent Resident Card'
  }),
  token: record({
    type: ['VerifiableCredential', 'RetailCredential'],
    name: 'Digital Payment Token', subjectType: 'PaymentToken'
  }),
  ticket: record({
    type: ['VerifiableCredential', 'MovieTicketCredential'],
    name: 'Movie Ticket'
  }),
  plain: record({name: 'Plain Credential'})
};

const CredentialsListStub = defineComponent({
  name: 'CredentialsList',
  props: ['credentials'],
  emits: ['select', 'delete-credential'],
  template: '<div />'
});

function mountDashboard(credentials) {
  return mount(CredentialDashboard, {
    props: {credentials, errorText: '', loading: false},
    global: {
      plugins: [[Quasar, {}]],
      stubs: {
        CredentialsList: CredentialsListStub,
        CredentialDetails: true,
        SearchBox: true,
        ShowScannerModal: true,
        QrCode: true
      }
    }
  });
}

const chipTexts = wrapper => wrapper.findAll('.s-type-chips .q-chip')
  .map(chip => chip.text().trim());

const chip = (wrapper, label) => wrapper.findAll('.s-type-chips .q-chip')
  .find(c => c.text().trim() === label);

const listedNames = wrapper => wrapper
  .findComponent(CredentialsListStub).props('credentials')
  .map(({credential}) => credential.name);

describe('CredentialDashboard category chips', () => {
  beforeEach(() => {
    config.vueWallet = {credentialCategories: CATEGORIES};
    // the chip band is mobile-only
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn()
    });
  });

  it('shows a chip for each category held, plus All', () => {
    const wrapper = mountDashboard([RECORDS.prc, RECORDS.token]);
    expect(chipTexts(wrapper)).toEqual(['All', 'Payment', 'Identity']);
  });

  it('shows no chip for a category nothing is held in', () => {
    const wrapper = mountDashboard([RECORDS.prc, RECORDS.token]);
    expect(chipTexts(wrapper)).not.toContain('Retail');
  });

  it('orders chips by the rules, not by the order credentials load in', () => {
    const wrapper = mountDashboard(
      [RECORDS.ticket, RECORDS.token, RECORDS.prc]);
    // the rules declare Payment, then Retail, then Identity; sorted
    // alphabetically these would come back in the opposite order
    expect(chipTexts(wrapper))
      .toEqual(['All', 'Payment', 'Retail', 'Identity']);
  });

  it('groups credentials no rule claims under one catch-all', () => {
    const wrapper = mountDashboard([RECORDS.prc, RECORDS.plain]);
    expect(chipTexts(wrapper)).toEqual(['All', 'Identity', 'Other']);
  });

  it('collapses several credentials of one category into one chip', () => {
    // a second category is needed for the band to show at all
    const wrapper = mountDashboard(
      [RECORDS.ticket, RECORDS.ticket, RECORDS.prc]);
    expect(chipTexts(wrapper).filter(text => text === 'Retail'))
      .toHaveLength(1);
  });

  it('hides the band when everything falls in one category', () => {
    const wrapper = mountDashboard([RECORDS.prc]);
    expect(wrapper.find('.s-type-band').exists()).toBe(false);
  });

  describe('filtering', () => {
    it('lists only the chosen category', async () => {
      const wrapper = mountDashboard(
        [RECORDS.prc, RECORDS.token, RECORDS.ticket]);
      await chip(wrapper, 'Payment').trigger('click');
      expect(listedNames(wrapper)).toEqual(['Digital Payment Token']);
    });

    it('applies a narrower rule before a broader one it overlaps', async () => {
      // a payment token is also a `RetailCredential` and must not appear
      // under Retail
      const wrapper = mountDashboard([RECORDS.token, RECORDS.ticket]);
      await chip(wrapper, 'Retail').trigger('click');
      expect(listedNames(wrapper)).toEqual(['Movie Ticket']);
    });

    it('restores the full list when All is chosen again', async () => {
      const wrapper = mountDashboard([RECORDS.prc, RECORDS.token]);
      await chip(wrapper, 'Identity').trigger('click');
      expect(listedNames(wrapper)).toHaveLength(1);
      await chip(wrapper, 'All').trigger('click');
      expect(listedNames(wrapper)).toHaveLength(2);
    });
  });
});
