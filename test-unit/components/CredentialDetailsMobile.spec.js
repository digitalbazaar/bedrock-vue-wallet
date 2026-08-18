/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {Notify, Quasar} from 'quasar';
import CredentialDetailsMobile from
  '../../components/CredentialDetailsMobile.vue';
import {mount} from '@vue/test-utils';

const CREDENTIAL = {
  type: ['VerifiableCredential', 'MovieTicketCredential'],
  name: 'Movie Ticket', id: 'urn:uuid:credential', credentialSubject: {}
};
const META = {id: 'urn:uuid:record', holder: 'urn:uuid:profile'};

const mountDetails = record => mount(CredentialDetailsMobile, {
  props: {record, deleteCredential: async () => {}},
  // `Notify` is how this component reports a delete; the Quasar plugin does
  // not install it by default
  global: {plugins: [[Quasar, {plugins: {Notify}}]]}
});

// the dashboard hands this view whatever the consumer passed, and
// `CredentialsList` accepts all three shapes, so this view has to agree or a
// row opens a blank panel on two of them
describe.each([
  ['a {credential, meta} record', {credential: CREDENTIAL, meta: META}],
  ['a {content, meta} record', {content: CREDENTIAL, meta: META}],
  ['a bare verifiable credential', CREDENTIAL]
])('given %s', (_label, record) => {
  it('names the credential', async () => {
    const wrapper = mountDetails(record);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Movie Ticket');
    wrapper.unmount();
  });

  it('deletes the credential the record identifies', async () => {
    let asked = null;
    const wrapper = mount(CredentialDetailsMobile, {
      props: {record, deleteCredential: async args => {
        asked = args;
      }},
      global: {plugins: [[Quasar, {plugins: {Notify}}]]}
    });
    await wrapper.vm.$nextTick();
    await wrapper.vm.remove();
    // a delete that names neither the profile nor the credential removes
    // nothing, and the parent cannot tell it was asked to
    expect(asked?.credentialId).toBe('urn:uuid:credential');
    wrapper.unmount();
  });
});
