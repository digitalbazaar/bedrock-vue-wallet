/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it, vi} from 'vitest';
import {Quasar, useQuasar} from 'quasar';
import {h} from 'vue';
import {mount} from '@vue/test-utils';
import {page} from 'vitest/browser';

// Needs a real engine: `$q.screen` measures the viewport, and jsdom reports a
// fixed width that never changes. The unit helpers in `mocks/viewport.js` move
// Quasar's `sm` size instead, which is the right trade there but proves
// nothing about what a real browser at a real width reports. This is the only
// place that claim can be tested.
//
// `Screen` only attaches its resize listener once the Quasar plugin installs,
// so this mounts a component rather than importing `Screen` directly -- which
// is also how every component in this package reads the breakpoint.
const SM = 600;

// a render function, not a `template` string: the Vue this harness aliases is
// the runtime-only build, which compiles no templates and renders nothing
const Probe = {
  setup() {
    const $q = useQuasar();
    return () => h('div', $q.screen.lt.sm ? 'mobile' : 'desktop');
  }
};

const mountProbe = () => mount(Probe, {global: {plugins: [Quasar]}});

const atWidth = async (wrapper, width) => {
  await page.viewport(width, 800);
  await vi.waitUntil(() => window.innerWidth === width, {timeout: 2000});
  // Quasar debounces its resize handler, so let it settle before reading
  await new Promise(resolve => setTimeout(resolve, 300));
  await wrapper.vm.$nextTick();
};

describe('the mobile breakpoint at a real viewport', () => {
  it.each([
    [390, 'iPhone 14', 'mobile'],
    [SM - 1, 'one below the boundary', 'mobile'],
    [SM, 'exactly the boundary', 'desktop'],
    [1024, 'a laptop', 'desktop']
  ])('at %spx (%s)', async (width, _label, expected) => {
    const wrapper = mountProbe();
    await atWidth(wrapper, width);
    await vi.waitUntil(() => wrapper.text() === expected, {timeout: 2000});
    expect(wrapper.text()).toBe(expected);
    wrapper.unmount();
  });

  it('is driven by an app-level size, not a number written in a component',
    async () => {
      // "one app-level setting moves every surface at once" is the whole
      // reason to read the framework value instead of writing 600 anywhere
      const wrapper = mountProbe();
      await atWidth(wrapper, 700);
      expect(wrapper.text()).toBe('desktop');
      wrapper.vm.$q.screen.setSizes({sm: 800});
      await vi.waitUntil(() => wrapper.text() === 'mobile', {timeout: 2000});
      expect(wrapper.text()).toBe('mobile');
      wrapper.vm.$q.screen.setSizes({sm: SM});
      wrapper.unmount();
    });
});
