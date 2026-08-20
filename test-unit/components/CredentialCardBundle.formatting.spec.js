/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, describe, expect, it} from 'vitest';
import {Notify, Quasar} from 'quasar';
import {config} from '@bedrock/web';
import CredentialCardBundle from '../../components/CredentialCardBundle.vue';
import {mount} from '@vue/test-utils';

const CREDENTIAL = {
  type: ['VerifiableCredential', 'MovieTicketCredential'],
  name: 'Movie Ticket', credentialSubject: {}
};

// A deployment config may use `format: 'capitalize'` widely. Before
// pointer resolution stopped re-rooting, a pointer that missed often resolved
// to some unrelated value further up the credential, which capitalized fine and
// rendered the wrong thing. Answering `''` instead turned that into a
// TypeError out of `onBeforeMount`, which blanks the card entirely.
describe('a capitalize override whose pointer misses', () => {
  afterEach(() => {
    config.vueWallet = {};
  });

  it('renders rather than throwing when a capitalize override misses', () => {
    config.vueWallet = {cardDesigns: [{
      matches: {'/type': 'MovieTicketCredential'},
      styles: {},
      overrides: {title: {pointer: '/issuer/name',
        format: 'capitalize'}}
    }]};
    expect(() => mount(CredentialCardBundle, {
      props: {
        credentialRecord: {credential: CREDENTIAL,
          meta: {id: 'urn:uuid:t', holder: 'urn:uuid:p'}},
        profileOptions: [{id: 'urn:uuid:p', name: 'Me'}]
      },
      global: {plugins: [[Quasar, {plugins: {Notify}}]]}
    }).unmount()).not.toThrow();
  });
});
