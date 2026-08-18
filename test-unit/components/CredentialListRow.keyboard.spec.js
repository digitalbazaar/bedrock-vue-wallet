/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import CredentialListRow from '../../components/CredentialListRow.vue';
import {mount} from '@vue/test-utils';
import {Quasar} from 'quasar';

const RECORD = {
  credential: {
    type: ['VerifiableCredential', 'MovieTicketCredential'],
    name: 'Movie Ticket',
    credentialSubject: {}
  },
  meta: {id: 'urn:uuid:ticket', holder: 'urn:uuid:profile'}
};

const mountRow = () => mount(CredentialListRow, {
  props: {credentialRecord: RECORD},
  global: {plugins: [Quasar]}
});

// The row is a `div` carrying `role="button"`, so the keyboard activation a
// real button gets for free is written by hand here. Both keys, and the
// `preventDefault` that stops space scrolling the list, run through one
// `@keydown.enter.space.prevent` handler -- Vue ORs the key modifiers -- so a
// test naming only one key would pass against a handler that lost the other.
describe('activating a credential row from the keyboard', () => {
  it.each([
    ['Enter', 'Enter'],
    ['Space', ' ']
  ])('emits select on %s', async (_name, key) => {
    const wrapper = mountRow();
    await wrapper.trigger('keydown', {key});
    expect(wrapper.emitted('select')).toEqual([[RECORD]]);
    wrapper.unmount();
  });

  it.each([
    ['Enter', 'Enter'],
    ['Space', ' ']
  ])('prevents the default action of %s', async (_name, key) => {
    const wrapper = mountRow();
    // space scrolls the page and enter submits an enclosing form; either
    // moves the list out from under the credential the holder just opened
    const event = new KeyboardEvent('keydown', {key, cancelable: true});
    wrapper.element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    wrapper.unmount();
  });

  it('ignores a key that is neither', async () => {
    const wrapper = mountRow();
    await wrapper.trigger('keydown', {key: 'a'});
    expect(wrapper.emitted('select')).toBeUndefined();
    wrapper.unmount();
  });
});
