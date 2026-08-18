/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {afterEach, describe, expect, it} from 'vitest';
import {Notify, Quasar} from 'quasar';
import CredentialDetailsMobile from
  '../../components/CredentialDetailsMobile.vue';
import {mount} from '@vue/test-utils';

const RECORD = {
  credential: {
    type: ['VerifiableCredential', 'MovieTicketCredential'],
    name: 'Movie Ticket', id: 'urn:uuid:credential', credentialSubject: {}
  },
  meta: {id: 'urn:uuid:record', holder: 'urn:uuid:profile'}
};

const mountDetails = () => mount(CredentialDetailsMobile, {
  props: {record: RECORD, deleteCredential: async () => {}},
  global: {plugins: [[Quasar, {plugins: {Notify}}]]}
});

// the panel itself, so a drag starts somewhere the gesture is meant to work
const target = wrapper => wrapper.element;

// one gesture: down, a move to (dx, dy), then up
const drag = async (wrapper, {dx, dy = 0, from = target(wrapper)}) => {
  const currentTarget = wrapper.element;
  wrapper.vm.onPointerDown({clientX: 200, clientY: 400, target: from});
  wrapper.vm.onPointerMove({
    clientX: 200 + dx, clientY: 400 + dy, currentTarget, pointerId: 1
  });
  wrapper.vm.onPointerUp({currentTarget, pointerId: 1});
  await wrapper.vm.$nextTick();
};

const closed = wrapper => (wrapper.emitted('close') ?? []).length;

const selectText = text => {
  globalThis.getSelection = () => ({
    isCollapsed: false, toString: () => text
  });
};

describe('swiping back out of the details panel', () => {
  afterEach(() => {
    delete globalThis.getSelection;
  });

  it('closes on a rightward drag', async () => {
    const wrapper = mountDetails();
    await drag(wrapper, {dx: 80});
    expect(closed(wrapper)).toBe(1);
    wrapper.unmount();
  });

  it('does not close on a leftward drag', async () => {
    // `Math.abs(dx)` closed the panel on any horizontal drag, so dragging left
    // -- to select an id, or just to swipe the wrong way -- dropped the user
    // back to the list
    const wrapper = mountDetails();
    await drag(wrapper, {dx: -80});
    expect(closed(wrapper)).toBe(0);
    wrapper.unmount();
  });

  it('does not close on a mostly vertical drag', async () => {
    const wrapper = mountDetails();
    await drag(wrapper, {dx: 70, dy: 200});
    expect(closed(wrapper)).toBe(0);
    wrapper.unmount();
  });

  it.each([
    ['a rendering', 's-cdm-render'],
    ['the carousel', 'the-carousel-wrapper s-cdm-carousel']
  ])('leaves a drag that starts on %s alone', async (_label, className) => {
    // a horizontal drag inside the carousel pages it, and a drag on a
    // rendering belongs to the rendering; neither may also close the panel
    const wrapper = mountDetails();
    const inside = document.createElement('div');
    inside.className = className;
    wrapper.element.appendChild(inside);
    await drag(wrapper, {dx: 120, from: inside});
    expect(closed(wrapper)).toBe(0);
    wrapper.unmount();
  });

  it('does not close a drag that is selecting text', async () => {
    // the credential's values are deliberately selectable: an id nobody can
    // copy is an id nobody can use, and copying one is a horizontal drag
    const wrapper = mountDetails();
    const currentTarget = wrapper.element;
    wrapper.vm.onPointerDown({
      clientX: 200, clientY: 400, target: target(wrapper)
    });
    selectText('urn:uuid:credential');
    wrapper.vm.onPointerMove({
      clientX: 300, clientY: 400, currentTarget, pointerId: 1
    });
    wrapper.vm.onPointerUp({currentTarget, pointerId: 1});
    await wrapper.vm.$nextTick();
    expect(closed(wrapper)).toBe(0);
    wrapper.unmount();
  });

  it('still closes when a selection was already on screen', async () => {
    // a selection the drag did not create must not disable the gesture, or
    // copying an id once leaves the panel unswipeable
    const wrapper = mountDetails();
    selectText('urn:uuid:credential');
    await drag(wrapper, {dx: 80});
    expect(closed(wrapper)).toBe(1);
    wrapper.unmount();
  });
});
