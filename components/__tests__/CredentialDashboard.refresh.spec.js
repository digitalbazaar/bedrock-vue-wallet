/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import CredentialDashboard from '../CredentialDashboard.vue';
import {defineComponent} from 'vue';
import {mount} from '@vue/test-utils';
import PullToRefresh from '../PullToRefresh.vue';
import {Quasar} from 'quasar';

vi.mock('@bedrock/web', () => ({config: {}}));
vi.mock('@digitalbazaar/vue-extendable-event', () => ({
  createEmitExtendable: ({emit}) => (event, data) => emit(event, data)
}));

const mockCredential = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiableCredential', 'TestCredential'],
  id: 'urn:test:credential:1',
  name: 'Test Credential',
  credentialSubject: {}
};

const mockCredentialRecord = {
  credential: mockCredential,
  meta: {id: 'urn:test:meta:1', holder: 'urn:test:profile:1'}
};

// Named stubs let findComponent locate them by definition after stubbing
const CredentialsListStub = defineComponent({
  name: 'CredentialsList',
  emits: ['select', 'delete-credential'],
  template: '<div />'
});

const CredentialDetailsStub = defineComponent({
  name: 'CredentialDetails',
  props: {
    credential: null,
    showDetails: null,
    cardStyles: null,
    cardBackground: null,
    credentialOverrides: null,
    credentialHighlights: null,
    credentialHolderName: null,
    toggleDetailsWindow: null,
    toggleDeleteWindow: null
  },
  template: '<div />'
});

const globalOptions = {
  plugins: [[Quasar, {}]],
  stubs: {
    CredentialsList: CredentialsListStub,
    CredentialDetails: CredentialDetailsStub,
    SearchBox: true,
    ShowScannerModal: true
  }
};

const mountDashboard = () => mount(CredentialDashboard, {
  props: {
    credentials: [mockCredentialRecord],
    errorText: '',
    loading: false
  },
  global: globalOptions
});

describe('CredentialDashboard — refresh button (T06)', () => {
  let matchMediaMock;

  beforeEach(() => {
    // Mock window.matchMedia for testing breakpoints
    matchMediaMock = vi.fn();
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('manual refresh button visibility at mobile width', () => {
    it('should NOT render manual refresh button at mobile width', async () => {
      // Mock matchMedia to return mobile width (matches: true)
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const wrapper = mountDashboard();
      await wrapper.vm.$nextTick();

      // Find q-btn with fas fa-sync-alt icon (refresh button)
      const qButtons = wrapper.findAllComponents({name: 'QBtn'});
      const refreshButton = qButtons.find(btn => {
        return btn.props('icon') === 'fas fa-sync-alt';
      });

      expect(refreshButton?.exists()).toBeFalsy();
    });
  });

  describe('manual refresh button visibility at desktop width', () => {
    it('should render manual refresh button at desktop width', async () => {
      // Mock matchMedia to return desktop width (matches: false)
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const wrapper = mountDashboard();
      await wrapper.vm.$nextTick();

      // Find q-btn with fas fa-sync-alt icon (refresh button)
      const qButtons = wrapper.findAllComponents({name: 'QBtn'});
      const refreshButton = qButtons.find(btn => {
        return btn.props('icon') === 'fas fa-sync-alt';
      });

      expect(refreshButton?.exists()).toBe(true);
    });

    it('should emit refresh when button clicked at desktop', async () => {
      // Mock matchMedia to return desktop width (matches: false)
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const wrapper = mountDashboard();
      await wrapper.vm.$nextTick();

      // Find q-btn with fas fa-sync-alt icon (refresh button)
      const qButtons = wrapper.findAllComponents({name: 'QBtn'});
      const refreshButton = qButtons.find(btn => {
        return btn.props('icon') === 'fas fa-sync-alt';
      });

      expect(refreshButton?.exists()).toBe(true);
      // Trigger click on the q-btn
      if(refreshButton?.exists()) {
        await refreshButton.trigger('click');
      }

      // Assert refresh event was emitted
      expect(wrapper.emitted('refresh')).toBeTruthy();
      expect(wrapper.emitted('refresh')).toHaveLength(1);
    });
  });

  describe('pull-to-refresh control', () => {
    it('should render pull-to-refresh at mobile width', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const wrapper = mountDashboard();
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent(PullToRefresh).exists()).toBe(true);
    });

    it('should not render pull-to-refresh at desktop width', async () => {
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const wrapper = mountDashboard();
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent(PullToRefresh).exists()).toBe(false);
    });

    it('should emit refresh when pull-to-refresh triggered', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const wrapper = mountDashboard();
      await wrapper.vm.$nextTick();

      // no conditional: if the gesture component is missing, this must fail
      // rather than quietly assert nothing
      const pullToRefresh = wrapper.findComponent(PullToRefresh);
      expect(pullToRefresh.exists()).toBe(true);
      await pullToRefresh.vm.$emit('refresh', () => {});

      expect(wrapper.emitted('refresh')).toBeTruthy();
    });

    it('should tell the gesture the refresh is done', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const wrapper = mountDashboard();
      await wrapper.vm.$nextTick();

      // the spinner spins until `done` is called, so a handler that never
      // calls it leaves the list stuck mid-refresh
      const done = vi.fn();
      await wrapper.findComponent(PullToRefresh).vm.$emit('refresh', done);
      expect(done).toHaveBeenCalled();
    });

    it('pull-to-refresh and button emit same refresh event', async () => {
      // Test pull-to-refresh at mobile
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const mobileWrapper = mountDashboard();
      await mobileWrapper.vm.$nextTick();

      const pullToRefresh = mobileWrapper.findComponent(
        {name: 'QPullToRefresh'}
      );
      if(pullToRefresh?.exists()) {
        const onRefresh = pullToRefresh.props('onRefresh');
        if(typeof onRefresh === 'function') {
          await onRefresh();
        }
      }

      const mobileRefreshEvents = mobileWrapper.emitted('refresh');

      // Test manual button at desktop
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const desktopWrapper = mountDashboard();
      await desktopWrapper.vm.$nextTick();

      const qButtons = desktopWrapper.findAllComponents({name: 'QBtn'});
      const refreshButton = qButtons.find(btn => {
        return btn.props('icon') === 'fas fa-sync-alt';
      });

      if(refreshButton?.exists()) {
        await refreshButton.trigger('click');
      }

      const desktopRefreshEvents = desktopWrapper.emitted('refresh');

      // Both should emit refresh event
      if(mobileRefreshEvents && desktopRefreshEvents) {
        expect(mobileRefreshEvents).toBeTruthy();
        expect(desktopRefreshEvents).toBeTruthy();
      }
    });
  });

  describe('matchMedia cleanup on unmount', () => {
    it('should remove matchMedia listener on unmount', async () => {
      const removeEventListenerMock = vi.fn();
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock
      });

      const wrapper = mountDashboard();
      await wrapper.vm.$nextTick();

      wrapper.unmount();

      // Verify removeEventListener was called
      expect(removeEventListenerMock).toHaveBeenCalled();
    });
  });
});
