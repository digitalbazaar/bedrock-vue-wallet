/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {Quasar} from 'quasar';
import {describe, expect, it, vi} from 'vitest';
import {defineComponent} from 'vue';
import {mount} from '@vue/test-utils';
import CredentialDashboard from '../CredentialDashboard.vue';

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
  template: '<div />',
  emits: ['select', 'delete-credential']
});

const CredentialDetailsStub = defineComponent({
  name: 'CredentialDetails',
  template: '<div />',
  props: [
    'credential', 'showDetails', 'cardStyles', 'cardBackground',
    'credentialOverrides', 'credentialHighlights', 'credentialHolderName',
    'toggleDetailsWindow', 'toggleDeleteWindow'
  ]
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

describe('CredentialDashboard — credential-details dialog (T02)', () => {
  // --- 1. Single dialog instance, gated by showDetails, initially closed ---

  describe('initial state', () => {
    it('renders exactly one credential-details instance', () => {
      const wrapper = mountDashboard();
      const details = wrapper.findAllComponents(CredentialDetailsStub);
      expect(details).toHaveLength(1);
    });

    it('q-dialog wrapping credential-details exists and is closed on mount', () => {
      const wrapper = mountDashboard();
      const dialog = wrapper.findComponent({name: 'QDialog'});
      expect(dialog.exists()).toBe(true);
      expect(dialog.props('modelValue')).toBe(false);
    });
  });

  // --- 2. Emitting select from CredentialsList opens the dialog ---

  describe('select event from CredentialsList', () => {
    it('sets showDetails to true', async () => {
      const wrapper = mountDashboard();
      const list = wrapper.findComponent(CredentialsListStub);
      await list.vm.$emit('select', mockCredential);
      const dialog = wrapper.findComponent({name: 'QDialog'});
      expect(dialog.props('modelValue')).toBe(true);
    });

    it('passes the emitted credential to the credential-details prop', async () => {
      const wrapper = mountDashboard();
      const list = wrapper.findComponent(CredentialsListStub);
      await list.vm.$emit('select', mockCredential);
      const details = wrapper.findComponent(CredentialDetailsStub);
      expect(details.props('credential')).toStrictEqual(mockCredential);
    });
  });

  // --- 3. Closing the dialog resets state for a subsequent select ---

  describe('dialog close and reopen', () => {
    it('resets showDetails to false when q-dialog emits update:modelValue false', async () => {
      const wrapper = mountDashboard();
      const list = wrapper.findComponent(CredentialsListStub);
      await list.vm.$emit('select', mockCredential);
      const dialog = wrapper.findComponent({name: 'QDialog'});
      await dialog.vm.$emit('update:modelValue', false);
      expect(dialog.props('modelValue')).toBe(false);
    });

    it('accepts a different credential after closing', async () => {
      const secondCredential = {
        ...mockCredential,
        id: 'urn:test:credential:2',
        name: 'Second Credential'
      };
      const wrapper = mountDashboard();
      const list = wrapper.findComponent(CredentialsListStub);

      await list.vm.$emit('select', mockCredential);
      const dialog = wrapper.findComponent({name: 'QDialog'});
      await dialog.vm.$emit('update:modelValue', false);
      await list.vm.$emit('select', secondCredential);

      const details = wrapper.findComponent(CredentialDetailsStub);
      expect(dialog.props('modelValue')).toBe(true);
      expect(details.props('credential')).toStrictEqual(secondCredential);
    });
  });
});
