/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {Notify, QPullToRefresh, Quasar} from 'quasar';
import {setDesktopViewport, setMobileViewport} from '../mocks/viewport.js';
import {config} from '@bedrock/web';
import CredentialDashboard from '../../components/CredentialDashboard.vue';

const RECORDS = [{
  credential: {
    type: ['VerifiableCredential', 'MovieTicketCredential'],
    name: 'Movie Ticket', credentialSubject: {}
  },
  meta: {id: 'urn:uuid:ticket', holder: 'urn:uuid:profile'}
}];

const LOYALTY = {
  credential: {
    type: ['VerifiableCredential', 'RetailCredential'],
    name: 'Loyalty Card', credentialSubject: {}
  },
  meta: {id: 'urn:uuid:loyalty', holder: 'urn:uuid:profile'}
};

const mountDashboard = (credentials = RECORDS) => mount(CredentialDashboard, {
  props: {credentials, errorText: ''},
  // Notify is what five components on main already use to surface a failure;
  // the Quasar plugin does not install it by default
  global: {
    plugins: [[Quasar, {plugins: {Notify}}]],
    stubs: {CredentialsList: true, SearchBox: true, ShowScannerModal: true,
      CredentialDetailsMobile: true, CredentialListRow: true}
  }
});

const pullToRefresh = wrapper => wrapper.findComponent(QPullToRefresh);

describe('refreshing the credential list', () => {
  afterEach(() => {
    setDesktopViewport();
    config.vueWallet = {};
  });

  it('emits one event shape whether pulled or tapped', async () => {
    // the pull path emitting an extendable event while the button emitted a
    // bare one meant a parent using `$event.waitUntil(...)` -- the idiom this
    // component already publishes for `delete-credential` -- threw on the
    // button and worked on the pull
    const wrapper = mountDashboard();
    setMobileViewport();
    await wrapper.vm.$nextTick();

    wrapper.vm.refresh();
    await pullToRefresh(wrapper).vm.$emit('refresh', () => {});
    await wrapper.vm.$nextTick();

    const events = wrapper.emitted('refresh');
    expect(events, 'both paths should emit refresh').toHaveLength(2);
    const [fromButton] = events[0];
    const [fromPull] = events[1];
    expect(typeof fromButton?.waitUntil).toBe('function');
    expect(typeof fromPull?.waitUntil).toBe('function');
  });

  it('keeps the spinner up until the parent finishes', async () => {
    const wrapper = mountDashboard();
    setMobileViewport();
    await wrapper.vm.$nextTick();

    let release;
    wrapper.vm.$.vnode.props.onRefresh = event =>
      event.waitUntil(new Promise(resolve => {
        release = resolve;
      }));

    // through the gesture, not an internal method: retracting the spinner is
    // `RefreshableView`'s job now, and what matters is that the dashboard is
    // wired to it
    let done = false;
    pullToRefresh(wrapper).vm.$emit('refresh', () => {
      done = true;
    });
    await flushPromises();
    expect(done, 'done() must not fire before the parent resolves').toBe(false);

    release();
    await flushPromises();
    expect(done).toBe(true);
    wrapper.unmount();
  });

  it('makes the whole mobile view one gesture zone', async () => {
    // wrapping only the rows left the search field and the chip band dead to
    // the pull -- on a phone those are most of the screen, and a gesture that
    // works in one half of a view and not the other reads as broken
    // two categories, so the band is on screen to be pulled on at all
    config.vueWallet = {credentialCategories: [
      {category: 'Tickets', matches: {'/name': 'Movie Ticket'}},
      {category: 'Loyalty', matches: {'/name': 'Loyalty Card'}}
    ]};
    const wrapper = mountDashboard([...RECORDS, LOYALTY]);
    setMobileViewport();
    await wrapper.vm.$nextTick();

    const zone = pullToRefresh(wrapper);
    expect(zone.exists()).toBe(true);
    expect(zone.findComponent({name: 'SearchBox'}).exists(),
      'the search field travels with the list').toBe(true);
    expect(zone.find('.s-category-band').exists(),
      'the category band travels with the list').toBe(true);
    expect(zone.findComponent({name: 'CredentialListRow'}).exists(),
      'the rows are still inside it').toBe(true);
    wrapper.unmount();
  });

  it('leaves the wide view with no gesture zone at all', async () => {
    const wrapper = mountDashboard();
    setDesktopViewport();
    await wrapper.vm.$nextTick();
    expect(pullToRefresh(wrapper).exists()).toBe(false);
    expect(wrapper.findComponent({name: 'SearchBox'}).exists(),
      'the search field is still on screen').toBe(true);
    wrapper.unmount();
  });

  it('reports a failure from the button, not only from the pull', async () => {
    // `refresh` became `emitExtendable`, so it returns a promise that rejects
    // when the parent's `waitUntil` rejects, and `@click="refresh"` discarded
    // it: tapping sync during an outage produced an unhandled rejection and no
    // notification, while the identical pull reported it
    const wrapper = mountDashboard();
    setMobileViewport();
    await wrapper.vm.$nextTick();
    const notify = vi.spyOn(wrapper.vm.$q, 'notify').mockImplementation(
      () => {});
    const rejections = [];
    const onRejection = e => {
      rejections.push(e);
      e.preventDefault?.();
    };
    // `globalThis.process` rather than the bare global: this file is linted
    // with no node env
    globalThis.process.on('unhandledRejection', onRejection);

    wrapper.vm.$.vnode.props.onRefresh = event =>
      event.waitUntil(Promise.reject(new Error('network is down')));

    // through the DOM, not `vm.refresh()`: the binding in the template is
    // half of what is under test here
    const sync = wrapper.findAllComponents({name: 'QBtn'})
      .find(btn => btn.props('icon') === 'fas fa-sync-alt');
    expect(sync, 'the sync button must be findable').toBeTruthy();
    await sync.trigger('click');
    await flushPromises();
    globalThis.process.off('unhandledRejection', onRejection);

    expect(rejections, 'the button must not leave a rejection unhandled')
      .toHaveLength(0);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({type: 'negative', message: 'network is down'}));
    wrapper.unmount();
  });

  it('retracts the spinner and reports when the refresh fails', async () => {
    // `finally { done() }` alone retracted the spinner exactly as on success
    // and let the rejection escape as an unhandled one, telling the user
    // nothing
    const wrapper = mountDashboard();
    setMobileViewport();
    await wrapper.vm.$nextTick();
    const notify = vi.spyOn(wrapper.vm.$q, 'notify').mockImplementation(
      () => {});

    wrapper.vm.$.vnode.props.onRefresh = event =>
      event.waitUntil(Promise.reject(new Error('network is down')));

    let done = false;
    pullToRefresh(wrapper).vm.$emit('refresh', () => {
      done = true;
    });
    await flushPromises();
    expect(done, 'the spinner must still retract').toBe(true);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({type: 'negative'}));
    wrapper.unmount();
  });
});
