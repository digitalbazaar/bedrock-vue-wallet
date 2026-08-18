/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, describe, expect, it} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {QPullToRefresh, Quasar} from 'quasar';
import {setDesktopViewport, setMobileViewport} from '../mocks/viewport.js';
import {h} from 'vue';
import RefreshableView from '../../components/RefreshableView.vue';

// a render function rather than a `template` string: the browser project
// resolves Vue's runtime-only build, which compiles no template
const child = () => h('p', {class: 'child'}, 'content');

const mountView = (props = {}) => mount(RefreshableView, {
  props: {refresh: async () => {}, ...props},
  slots: {default: child},
  global: {plugins: [Quasar]}
});

const pull = wrapper => wrapper.findComponent(QPullToRefresh);

describe('a refreshable view', () => {
  afterEach(() => {
    setDesktopViewport();
  });

  describe('choosing its affordance', () => {
    it('offers the gesture at the narrow breakpoint', async () => {
      const wrapper = mountView();
      setMobileViewport();
      await wrapper.vm.$nextTick();
      expect(pull(wrapper).exists()).toBe(true);
      wrapper.unmount();
    });

    it('offers no gesture on a wide screen', async () => {
      const wrapper = mountView();
      setDesktopViewport();
      await wrapper.vm.$nextTick();
      expect(pull(wrapper).exists()).toBe(false);
      wrapper.unmount();
    });

    it.each([[true], [false]])(
      'lets a caller decide instead, here %s', async pullable => {
        // the breakpoint is a stand-in for touch capability, so a caller with
        // a real test for it has to be able to say so
        const wrapper = mountView({pullable});
        setDesktopViewport();
        await wrapper.vm.$nextTick();
        expect(pull(wrapper).exists()).toBe(pullable);
        wrapper.unmount();
      });

    it('renders its content either way', async () => {
      const wrapper = mountView();
      setMobileViewport();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.child').exists()).toBe(true);
      setDesktopViewport();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.child').exists()).toBe(true);
      wrapper.unmount();
    });

    it('applies caller classes only on the non-gesture branch', async () => {
      // the gesture branch carries the classes that make the pull area work,
      // and `row` on a `column` container is how the layout came apart
      const wrapper = mountView({plainClass: 'row justify-center'});
      setDesktopViewport();
      await wrapper.vm.$nextTick();
      expect(wrapper.classes()).toContain('row');

      setMobileViewport();
      await wrapper.vm.$nextTick();
      expect(wrapper.classes()).toContain('s-refreshable');
      expect(wrapper.classes()).not.toContain('row');
      wrapper.unmount();
    });
  });

  describe('running the refresh', () => {
    it('holds the spinner until the caller resolves', async () => {
      let release;
      const wrapper = mountView({
        refresh: () => new Promise(resolve => {
          release = resolve;
        })
      });
      setMobileViewport();
      await wrapper.vm.$nextTick();

      let done = false;
      pull(wrapper).vm.$emit('refresh', () => {
        done = true;
      });
      await flushPromises();
      expect(done, 'must not retract before the caller resolves').toBe(false);

      release();
      await flushPromises();
      expect(done).toBe(true);
      wrapper.unmount();
    });

    it('retracts the spinner when the refresh fails', async () => {
      // QPullToRefresh will not fire again until `done` is called, so a
      // refresh that threw would otherwise leave the gesture spinning and dead
      const wrapper = mountView({
        refresh: async () => {
          throw new Error('network is down');
        }
      });
      setMobileViewport();
      await wrapper.vm.$nextTick();

      let done = false;
      pull(wrapper).vm.$emit('refresh', () => {
        done = true;
      });
      await flushPromises();
      expect(done).toBe(true);
      wrapper.unmount();
    });

    it('reports the failure rather than swallowing it', async () => {
      // nothing awaits a gesture handler, so the rejection cannot be left to
      // propagate -- but a refresh that failed must not look like one that
      // worked either
      const boom = new Error('network is down');
      const wrapper = mountView({
        refresh: async () => {
          throw boom;
        }
      });
      setMobileViewport();
      await wrapper.vm.$nextTick();

      pull(wrapper).vm.$emit('refresh', () => {});
      await flushPromises();
      expect(wrapper.emitted('refresh-error')).toEqual([[boom]]);
      wrapper.unmount();
    });
  });
});
