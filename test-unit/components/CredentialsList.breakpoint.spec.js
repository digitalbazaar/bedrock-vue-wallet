/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {defineComponent} from 'vue';
import {mount} from '@vue/test-utils';
import {Quasar} from 'quasar';
// eslint-disable-next-line sort-imports -- the `vi.mock` factories below are
// hoisted above these imports and reference them, so the component under test
// has to be imported after everything the mocks close over
import CredentialsList from '../../components/CredentialsList.vue';

// Mock external packages that are peer-dependencies not installed in devDeps.
// vi.mock is hoisted by Vitest's transform, so these run before any imports.
vi.mock('@bedrock/vue-vc', () => ({
  CredentialSwitch: defineComponent({
    name: 'CredentialSwitch',
    template: '<div />'
  })
}));

// Mock local component files whose transitive imports are unresolvable in the
// unit-test environment (no @bedrock/* packages installed).
vi.mock('../../components/CredentialCardBundle.vue', () => ({
  default: defineComponent({
    name: 'CredentialCardBundle',
    props: ['credentialRecord', 'schemaMap', 'profile', 'profileOptions'],
    emits: ['delete'],
    template: '<div />'
  })
}));

vi.mock('../../components/CredentialCompactBundle.vue', () => ({
  default: defineComponent({
    name: 'CredentialCompactBundle',
    props: ['credentials', 'schemaMap', 'store'],
    template: '<div />'
  })
}));

// Pre-mock CredentialListRow: created by V04, used by CredentialsList after
// W05. The stub allows findComponent to locate it once W05 wires it in.
vi.mock('../../components/CredentialListRow.vue', () => ({
  default: defineComponent({
    name: 'CredentialListRow',
    props: ['credentialRecord'],
    emits: ['select'],
    template: '<div />'
  })
}));

// Standard matchMedia stub for happy-dom, which does not implement
// window.matchMedia. Mirrors the pattern used in CredentialDashboard.vue's
// onMounted breakpoint check (max-width: 767px).
function mockMatchMedia(matches) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

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

const secondCredentialRecord = {
  credential: {
    ...mockCredential,
    id: 'urn:test:credential:2',
    name: 'Second Credential'
  },
  meta: {id: 'urn:test:meta:2', holder: 'urn:test:profile:1'}
};

function mountList(credentials = [mockCredentialRecord]) {
  return mount(CredentialsList, {
    props: {
      credentials,
      search: '',
      loading: false,
      errorText: ''
    },
    global: {
      plugins: [[Quasar, {}]]
    }
  });
}

describe('CredentialsList.vue — matchMedia breakpoint (T05)', () => {
  describe('mobile width — matchMedia(max-width: 767px) matches', () => {
    beforeEach(() => {
      mockMatchMedia(true);
    });

    it('renders CredentialListRow per item, not CredentialCardBundle', () => {
      const wrapper = mountList();
      const rows = wrapper.findAllComponents({name: 'CredentialListRow'});
      const bundles = wrapper.findAllComponents({name: 'CredentialCardBundle'});
      expect(rows).toHaveLength(1);
      expect(bundles).toHaveLength(0);
    });

    it('renders one CredentialListRow per credential in the list', () => {
      const wrapper = mountList([mockCredentialRecord, secondCredentialRecord]);
      const rows = wrapper.findAllComponents({name: 'CredentialListRow'});
      expect(rows).toHaveLength(2);
    });

    it('re-emits select from CredentialListRow with the same payload',
      async () => {
        const wrapper = mountList();
        const row = wrapper.findComponent({name: 'CredentialListRow'});
        expect(row.exists()).toBe(true);
        if(row.exists()) {
          await row.vm.$emit('select', mockCredential);
          const emitted = wrapper.emitted('select');
          expect(emitted).toBeTruthy();
          expect(emitted[0][0]).toStrictEqual(mockCredential);
        }
      });
  });

  describe('desktop width — matchMedia(767px) does not match', () => {
    beforeEach(() => {
      mockMatchMedia(false);
    });

    it('renders CredentialCardBundle per item, not CredentialListRow', () => {
      const wrapper = mountList();
      const bundles = wrapper.findAllComponents({name: 'CredentialCardBundle'});
      const rows = wrapper.findAllComponents({name: 'CredentialListRow'});
      expect(bundles).toHaveLength(1);
      expect(rows).toHaveLength(0);
    });

    it('renders one CredentialCardBundle per credential in the list', () => {
      const wrapper = mountList([mockCredentialRecord, secondCredentialRecord]);
      const bundles = wrapper.findAllComponents({name: 'CredentialCardBundle'});
      expect(bundles).toHaveLength(2);
    });
  });
});
