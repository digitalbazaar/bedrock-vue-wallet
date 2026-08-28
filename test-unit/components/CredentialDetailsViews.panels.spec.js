/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import CredentialDetailsViews from
  '../../components/CredentialDetailsViews.vue';
import {Quasar} from 'quasar';

const CREDENTIAL = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential'],
  credentialSubject: {}
};
// `SvgRenderingTemplate2023` needs no fetching: its `id` is the image
const RENDER_METHOD = {
  type: 'SvgRenderingTemplate2023',
  id: 'https://example.com/card.svg'
};

const mountViews = ({credential, credentialHighlights = {}}) => mount(
  CredentialDetailsViews, {
    props: {credential, credentialHighlights},
    global: {plugins: [Quasar]}
  });

// the tab a credential opens on has to be one that actually renders; the
// panel is otherwise blank with no tab reading as active
describe('the tab a credential opens on', () => {
  it.each([
    ['highlights, no render methods', {a: 'b'}, CREDENTIAL, 'highlights'],
    ['render methods, no highlights', {},
      {...CREDENTIAL, renderMethod: [RENDER_METHOD]}, 'displays'],
    ['neither', {}, CREDENTIAL, 'details']
  ])('given %s, opens on %s', async (
    _label, credentialHighlights, credential, expected
  ) => {
    const wrapper = mountViews({credential, credentialHighlights});
    await flushPromises();
    expect(wrapper.vm.tab).toBe(expected);
    wrapper.unmount();
  });
});

// `renderMethod` is `@container: @set`, so a single value may arrive unwrapped;
// the panel has to agree with the library that resolves it
describe('the Displays tab', () => {
  it.each([
    ['an array of one', [RENDER_METHOD]],
    ['a single unwrapped object', RENDER_METHOD]
  ])('is shown when renderMethod is %s', async (_label, renderMethod) => {
    const wrapper = mountViews({credential: {...CREDENTIAL, renderMethod}});
    await flushPromises();
    expect(wrapper.vm.showDisplays).toBe(true);
    wrapper.unmount();
  });

  it('is hidden when every render method fails to resolve', async () => {
    const wrapper = mountViews({
      // a declared render method of a type nothing handles resolves to
      // nothing, which is the shape of every-template-failed
      credential: {...CREDENTIAL, renderMethod: [
        {type: 'UnsupportedRenderingTemplate', id: 'https://example.com/x'}
      ]}
    });
    await flushPromises();
    expect(wrapper.vm.displays.length).toBe(0);
    expect(wrapper.vm.showDisplays).toBe(false);
    // the tab is chosen while the render methods are still resolving, so a
    // credential that resolves to nothing must not be left sitting on the tab
    // that just stopped rendering
    expect(wrapper.vm.tab).toBe('details');
    wrapper.unmount();
  });

  it('does not fall back to a Highlights tab of empty values', async () => {
    // the card config writes a key for every configured highlight, whether or
    // not the credential carries the field, so a populated object is not the
    // same as something to show
    const wrapper = mountViews({
      credential: {...CREDENTIAL, renderMethod: [
        {type: 'UnsupportedRenderingTemplate', id: 'https://example.com/x'}
      ]},
      credentialHighlights: {Account: '', 'Program Identifier': ''}
    });
    await flushPromises();
    expect(wrapper.vm.showHighlights).toBe(false);
    expect(wrapper.vm.tab).toBe('details');
    wrapper.unmount();
  });

  it('leaves a credential with highlights on Highlights when nothing ' +
    'resolves', async () => {
    const wrapper = mountViews({
      credential: {...CREDENTIAL, renderMethod: [
        {type: 'UnsupportedRenderingTemplate', id: 'https://example.com/x'}
      ]},
      credentialHighlights: {Account: 'A-1'}
    });
    await flushPromises();
    expect(wrapper.vm.showDisplays).toBe(false);
    expect(wrapper.vm.tab).toBe('highlights');
    wrapper.unmount();
  });
});
