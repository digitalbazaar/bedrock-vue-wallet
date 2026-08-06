/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {describe, expect, it, vi} from 'vitest';
import CredentialDashboard from '../CredentialDashboard.vue';
import {defineComponent} from 'vue';
import {mount} from '@vue/test-utils';
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
  props: [
    'credential', 'showDetails', 'cardStyles', 'cardBackground',
    'credentialOverrides', 'credentialHighlights', 'credentialHolderName',
    'toggleDetailsWindow', 'toggleDeleteWindow'
  ],
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

describe('CredentialDashboard — credential-details dialog (T02)', () => {
  // --- 1. Single dialog instance, gated by showDetails, initially closed ---

  describe('initial state', () => {
    it('mounts no credential-details until one is selected', () => {
      const wrapper = mountDashboard();
      expect(wrapper.findAllComponents(CredentialDetailsStub)).toHaveLength(0);
    });

    it('mounts exactly one credential-details once selected', async () => {
      const wrapper = mountDashboard();
      const list = wrapper.findComponent(CredentialsListStub);
      await list.vm.$emit('select', mockCredentialRecord);
      expect(wrapper.findAllComponents(CredentialDetailsStub)).toHaveLength(1);
    });

    it('q-dialog wrapping credential-details exists and is closed on mount',
      () => {
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
      await list.vm.$emit('select', mockCredentialRecord);
      const dialog = wrapper.findComponent({name: 'QDialog'});
      expect(dialog.props('modelValue')).toBe(true);
    });

    it('unwraps the record and passes its credential to the details view',
      async () => {
        const wrapper = mountDashboard();
        const list = wrapper.findComponent(CredentialsListStub);
        // the list emits the record; the details view takes a credential
        await list.vm.$emit('select', mockCredentialRecord);
        const details = wrapper.findComponent(CredentialDetailsStub);
        expect(details.props('credential')).toStrictEqual(mockCredential);
      });
  });

  // --- 3. Closing the dialog resets state for a subsequent select ---

  describe('dialog close and reopen', () => {
    it('resets showDetails when q-dialog emits update:modelValue false',
      async () => {
        const wrapper = mountDashboard();
        const list = wrapper.findComponent(CredentialsListStub);
        await list.vm.$emit('select', mockCredentialRecord);
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
      const secondRecord = {
        credential: secondCredential,
        meta: {id: 'urn:test:meta:2', holder: 'urn:test:profile:1'}
      };
      const wrapper = mountDashboard();
      const list = wrapper.findComponent(CredentialsListStub);

      await list.vm.$emit('select', mockCredentialRecord);
      const dialog = wrapper.findComponent({name: 'QDialog'});
      await dialog.vm.$emit('update:modelValue', false);
      await list.vm.$emit('select', secondRecord);

      const details = wrapper.findComponent(CredentialDetailsStub);
      expect(dialog.props('modelValue')).toBe(true);
      expect(details.props('credential')).toStrictEqual(secondCredential);
    });
  });
});
