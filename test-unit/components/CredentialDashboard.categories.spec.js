/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {setDesktopViewport, setMobileViewport} from '../mocks/viewport.js';
import {config} from '@bedrock/web';
import CredentialDashboard from '../../components/CredentialDashboard.vue';
import {mount} from '@vue/test-utils';
import {Quasar} from 'quasar';

// The rules carry the vocabulary and the component only matches them, so the
// spec supplies its own rather than depending on a deployment's config.
// Deliberately not in alphabetical order: if the declared order happened to be
// sorted, a component that sorted its chips would pass these tests anyway.
const CATEGORIES = [
  // narrow before broad: a payment token is also a `RetailCredential`
  {category: 'Payment', matches: {'/credentialSubject/type': 'PaymentToken'}},
  {category: 'Retail', matches: {'/type': 'RetailCredential'}},
  {category: 'Retail', matches: {'/type': 'MovieTicketCredential'}},
  {category: 'Identity', matches: {'/type': 'PermanentResidentCard'}}
];

const record = ({type, name, subjectType}) => ({
  credential: {
    type: ['VerifiableCredential', type], name,
    credentialSubject: subjectType ? {type: subjectType} : {}
  },
  meta: {id: `urn:uuid:${name}`, holder: 'urn:uuid:profile'}
});

const RECORDS = {
  prc: record({type: 'PermanentResidentCard', name: 'Resident Card'}),
  token: record({
    type: 'RetailCredential', name: 'Payment Token', subjectType: 'PaymentToken'
  }),
  ticket: record({type: 'MovieTicketCredential', name: 'Movie Ticket'}),
  loyalty: record({type: 'RetailCredential', name: 'Loyalty Card'}),
  stray: record({type: 'SomethingNobodyConfigured', name: 'Stray'})
};

const chipTexts = wrapper => wrapper.findAll('.s-category-band .q-chip')
  .map(chip => chip.text());

// what the user can actually see in the list -- a count cannot tell the
// difference between filtering to the right category and the wrong one.
// Mobile renders rows rather than the wide list, which is the surface the
// band filters, so this reads the rows.
const listedNames = wrapper => wrapper
  .findAllComponents({name: 'CredentialListRow'})
  .map(row => row.props('credentialRecord').credential.name);

const mountDashboard = credentials => mount(CredentialDashboard, {
  props: {credentials, errorText: ''},
  global: {plugins: [Quasar], stubs: {CredentialsList: true, SearchBox: true,
    ShowScannerModal: true, CredentialDetailsMobile: true}}
});

describe('the credential category band', () => {
  beforeEach(() => {
    config.vueWallet = {credentialCategories: CATEGORIES};
  });

  afterEach(() => {
    delete config.vueWallet;
    setDesktopViewport();
  });

  it('does not show on desktop', async () => {
    const wrapper = mountDashboard([RECORDS.prc, RECORDS.ticket]);
    setDesktopViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.s-category-band').exists()).toBe(false);
    wrapper.unmount();
  });

  it('does not show when everything falls in one category', async () => {
    // a band offering a single choice is not a choice
    const wrapper = mountDashboard([RECORDS.ticket, RECORDS.loyalty]);
    setMobileViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.s-category-band').exists()).toBe(false);
    wrapper.unmount();
  });

  it('lists categories in configured order after All, catch-all last',
    async () => {
      const wrapper = mountDashboard([
        RECORDS.stray, RECORDS.prc, RECORDS.ticket, RECORDS.token
      ]);
      setMobileViewport();
      await wrapper.vm.$nextTick();
      expect(chipTexts(wrapper))
        .toEqual(['All', 'Payment', 'Retail', 'Identity', 'Other']);
      wrapper.unmount();
    });

  it('filters the list to the chosen category', async () => {
    const wrapper = mountDashboard([
      RECORDS.prc, RECORDS.ticket, RECORDS.loyalty
    ]);
    setMobileViewport();
    await wrapper.vm.$nextTick();
    expect(listedNames(wrapper)).toEqual(
      ['Resident Card', 'Movie Ticket', 'Loyalty Card']);

    wrapper.vm.activeCategory = 'Retail';
    await wrapper.vm.$nextTick();
    // the names, not the count: filtering to Identity would also leave one
    expect(listedNames(wrapper)).toEqual(['Movie Ticket', 'Loyalty Card']);

    wrapper.vm.activeCategory = 'Identity';
    await wrapper.vm.$nextTick();
    expect(listedNames(wrapper)).toEqual(['Resident Card']);
    wrapper.unmount();
  });

  it('clears the filter when the band stops being shown', async () => {
    // the band is the only control that can clear this. Filter on a phone,
    // widen past the breakpoint, and the wide list would otherwise show one
    // category with nothing on screen to explain or undo it
    const wrapper = mountDashboard([RECORDS.prc, RECORDS.ticket]);
    setMobileViewport();
    await wrapper.vm.$nextTick();
    wrapper.vm.activeCategory = 'Identity';
    await wrapper.vm.$nextTick();
    expect(listedNames(wrapper)).toEqual(['Resident Card']);

    setDesktopViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.activeCategory).toBeNull();
    wrapper.unmount();
  });

  it('clears a selection whose category is no longer present', async () => {
    const wrapper = mountDashboard([RECORDS.prc, RECORDS.ticket]);
    setMobileViewport();
    await wrapper.vm.$nextTick();
    wrapper.vm.activeCategory = 'Identity';
    await wrapper.vm.$nextTick();

    await wrapper.setProps({credentials: [RECORDS.ticket, RECORDS.loyalty]});
    await wrapper.vm.$nextTick();
    // otherwise the list filters to nothing with no chip showing why
    expect(wrapper.vm.activeCategory).toBeNull();
    expect(listedNames(wrapper)).toEqual(['Movie Ticket', 'Loyalty Card']);
    wrapper.unmount();
  });
});
