/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {Quasar, useQuasar} from 'quasar';
import {setDesktopViewport, setMobileViewport} from '../mocks/viewport.js';
import {h} from 'vue';
import {mount} from '@vue/test-utils';

// The jsdom counterpart to `browser/breakpoint.browser.spec.js`. jsdom reports
// one fixed window width and never resizes, so these move Quasar's `sm` size
// relative to whatever it measured rather than pretending to resize. That is
// enough to drive a component down either branch, which is what a unit test
// needs; whether a real browser at a real width agrees is the browser spec's
// job, and neither substitutes for the other.
const Probe = {
  setup() {
    const $q = useQuasar();
    return () => h('div', $q.screen.lt.sm ? 'mobile' : 'desktop');
  }
};

const mountProbe = () => mount(Probe, {global: {plugins: [Quasar]}});

// `Screen` measures the window when the Quasar plugin installs, and the
// helpers move the boundary relative to that measurement -- so a component has
// to be mounted before either helper means anything.
describe('the mobile breakpoint helpers', () => {
  it.each([
    ['mobile', setMobileViewport],
    ['desktop', setDesktopViewport]
  ])('puts a component on the %s branch', async (expected, setViewport) => {
    const wrapper = mountProbe();
    setViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBe(expected);
    wrapper.unmount();
  });

  it('flips a mounted component when the boundary moves', async () => {
    // reactivity matters: a component that reads the breakpoint once at setup
    // would pass both tests above and still never respond to a rotation
    const wrapper = mountProbe();
    setDesktopViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBe('desktop');
    setMobileViewport();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBe('mobile');
    wrapper.unmount();
  });
});
