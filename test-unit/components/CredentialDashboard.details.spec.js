/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, describe, expect, it} from 'vitest';
import {setDesktopViewport, setMobileViewport} from '../mocks/viewport.js';
import CredentialDashboard from '../../components/CredentialDashboard.vue';
import {mount} from '@vue/test-utils';
import {Quasar} from 'quasar';

const record = name => ({
  credential: {
    type: ['VerifiableCredential', 'MovieTicketCredential'], name,
    credentialSubject: {}
  },
  meta: {id: `urn:uuid:${name}`, holder: 'urn:uuid:profile'}
});

const TICKET = record('Movie Ticket');
const LOYALTY = record('Loyalty Card');

const mountDashboard = (props = {}) => mount(CredentialDashboard, {
  props: {credentials: [TICKET, LOYALTY], errorText: '', ...props},
  global: {plugins: [Quasar], stubs: {CredentialsList: true, SearchBox: true,
    ShowScannerModal: true, CredentialDetailsMobile: true}}
});

const rows = wrapper => wrapper.findAllComponents({name: 'CredentialListRow'});
const details = wrapper =>
  wrapper.findComponent({name: 'CredentialDetailsMobile'});

describe('the mobile credential list and its details view', () => {
  afterEach(() => {
    setDesktopViewport();
  });

  it('shows rows on mobile and the wide list on desktop', async () => {
    const wrapper = mountDashboard();
    setDesktopViewport();
    await wrapper.vm.$nextTick();
    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.findComponent({name: 'CredentialsList'}).exists())
      .toBe(true);

    setMobileViewport();
    await wrapper.vm.$nextTick();
    // the two surfaces are exclusive: showing both would render every
    // credential twice
    expect(rows(wrapper).map(row =>
      row.props('credentialRecord').credential.name))
      .toEqual(['Movie Ticket', 'Loyalty Card']);
    expect(wrapper.findComponent({name: 'CredentialsList'}).exists())
      .toBe(false);
    wrapper.unmount();
  });

  it('opens the credential a row selects, not merely some credential',
    async () => {
      const wrapper = mountDashboard();
      setMobileViewport();
      await wrapper.vm.$nextTick();
      expect(details(wrapper).exists()).toBe(false);

      await rows(wrapper)[1].vm.$emit('select', LOYALTY);
      await wrapper.vm.$nextTick();
      expect(details(wrapper).props('record').credential.name)
        .toBe('Loyalty Card');
      wrapper.unmount();
    });

  it('shows a load failure on mobile, not only on desktop', async () => {
    // `error-text` and `no-results` were bound only inside the desktop
    // branch, so a phone showed an empty list and no reason for it
    const wrapper = mountDashboard({
      credentials: [], errorText: 'Could not retrieve your credentials.'
    });
    setMobileViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Could not retrieve your credentials.');
    wrapper.unmount();
  });

  it('says why the mobile list is empty', async () => {
    const wrapper = mountDashboard({credentials: [], loading: false});
    setMobileViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('No credentials yet.');
    wrapper.unmount();
  });

  it('does not tell a user with credentials that they have none', async () => {
    // the wide list distinguishes an empty wallet from a search that matched
    // nothing; mobile said "No credentials yet." to a user holding twelve
    // credentials who mistyped a search, and echoed nothing back
    const wrapper = mountDashboard({loading: false});
    setMobileViewport();
    await wrapper.vm.$nextTick();
    wrapper.vm.search = 'nothing matches this';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('No credentials yet.');
    expect(wrapper.text()).toContain('nothing matches this');
    wrapper.unmount();
  });

  it('does not call a loading list empty', async () => {
    // credentials arrive after the page does, so the mobile branch announced
    // "No credentials yet." to every user for as long as the fetch took --
    // the wide list has always shown a spinner instead
    const wrapper = mountDashboard({credentials: [], loading: true});
    setMobileViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('No credentials yet.');
    expect(wrapper.findComponent({name: 'QSpinner'}).exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows a load failure rather than a spinner once loading ends',
    async () => {
      const wrapper = mountDashboard({
        credentials: [], loading: false,
        errorText: 'Could not retrieve your credentials.'
      });
      setMobileViewport();
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Could not retrieve your credentials.');
      expect(wrapper.findComponent({name: 'QSpinner'}).exists()).toBe(false);
      wrapper.unmount();
    });

  it('categorises every record shape, not only `credential` ones', async () => {
    // the chip band read `record.credential` directly while the list it
    // filters read the record through `getCredential`, so a consumer passing
    // `content`-shaped records got rows with no band to group them
    const {config} = await import('@bedrock/web');
    config.vueWallet = {credentialCategories: [
      {category: 'Tickets', matches: {'/name': 'Movie Ticket'}},
      {category: 'Loyalty', matches: {'/name': 'Loyalty Card'}}
    ]};
    const wrapper = mountDashboard({credentials: [
      {content: TICKET.credential, meta: TICKET.meta},
      {content: LOYALTY.credential, meta: LOYALTY.meta}
    ]});
    setMobileViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.s-category-band .q-chip').map(c => c.text()))
      .toEqual(['All', 'Tickets', 'Loyalty']);
    config.vueWallet = {};
    wrapper.unmount();
  });

  it.each([
    ['records with `credential`', [TICKET, LOYALTY]],
    ['records with `content`', [
      {content: TICKET.credential, meta: TICKET.meta},
      {content: LOYALTY.credential, meta: LOYALTY.meta}
    ]],
    ['raw verifiable credentials, which carry no meta at all', [
      TICKET.credential, LOYALTY.credential
    ]]
  ])('renders %s', async (_label, credentials) => {
    // `CredentialsList` detects the shape at runtime and accepts all three.
    // The mobile branch read `record.meta.id` and `record.credential`
    // unconditionally, so a consumer passing raw VCs got a working desktop
    // list and a mobile list that threw.
    const wrapper = mountDashboard({credentials});
    setMobileViewport();
    await wrapper.vm.$nextTick();
    expect(rows(wrapper).map(row =>
      row.props('credentialRecord'))).toHaveLength(2);
    expect(wrapper.text()).toContain('Movie Ticket');
    wrapper.unmount();
  });

  it('closes when the details view asks to', async () => {
    const wrapper = mountDashboard();
    setMobileViewport();
    await wrapper.vm.$nextTick();
    await rows(wrapper)[0].vm.$emit('select', TICKET);
    await wrapper.vm.$nextTick();

    await details(wrapper).vm.$emit('close');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.showDetails).toBe(false);
    wrapper.unmount();
  });

  it('routes a delete through the dashboard\'s extendable event and closes',
    async () => {
      // one path a parent can hook with `waitUntil`, rather than the details
      // view emitting a second event of its own shape
      const wrapper = mountDashboard();
      setMobileViewport();
      await wrapper.vm.$nextTick();
      await rows(wrapper)[0].vm.$emit('select', TICKET);
      await wrapper.vm.$nextTick();

      await wrapper.vm.deleteSelectedCredential({
        profileId: 'urn:uuid:profile', credentialId: 'urn:uuid:Movie Ticket'
      });
      const emitted = wrapper.emitted('delete-credential');
      expect(emitted, 'the dashboard should emit delete-credential')
        .toBeTruthy();
      expect(emitted[0][0]).toMatchObject({
        profileId: 'urn:uuid:profile', credentialId: 'urn:uuid:Movie Ticket'
      });
      expect(wrapper.vm.showDetails).toBe(false);
      wrapper.unmount();
    });
});
