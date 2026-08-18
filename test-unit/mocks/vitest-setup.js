/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {defineComponent, h} from 'vue';
import {config} from '@vue/test-utils';

// jsdom implements no `matchMedia` and Quasar calls it on install. Only ever a
// stand-in for the missing one: the browser project runs for the sake of real
// media queries at a real viewport, and a stub that always answers `false`
// would quietly answer every one of them.
if(!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: query => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });
}

/* eslint-disable vue/one-component-per-file --
 * this file is a stub registry: five stand-ins of four lines each, registered
 * together because they are installed together */

// Every stub here renders through a render function rather than a `template`
// string. The browser project resolves Vue's runtime-only build, which
// compiles no template: a stubbed `template` renders nothing there, silently,
// so a component using any of these would mount as an empty tree and a test
// asserting an absence would pass having rendered nothing at all.
const QDialog = defineComponent({
  name: 'QDialog',
  props: {modelValue: {type: Boolean, default: false}},
  emits: ['update:modelValue'],
  render() {
    return h('div', this.$slots.default?.());
  }
});

const QBtn = defineComponent({
  name: 'QBtn',
  props: {
    icon: {type: String, default: undefined},
    color: {type: String, default: undefined},
    size: {type: String, default: undefined},
    round: Boolean,
    outline: Boolean
  },
  render() {
    return h('button');
  }
});

const QPullToRefresh = defineComponent({
  name: 'QPullToRefresh',
  props: {onRefresh: {type: Function, default: undefined}},
  render() {
    return h('div', this.$slots.default?.());
  }
});

config.global.components = {
  QDialog,
  QBtn,
  // renders its slot and carries the class the component selects on: a stub
  // that renders nothing cannot tell a chip with a label from one without
  QChip: defineComponent({
    name: 'QChip',
    props: {
      outline: Boolean,
      clickable: Boolean,
      color: {type: String, default: undefined},
      textColor: {type: String, default: undefined}
    },
    render() {
      return h('span', {class: 'q-chip'}, this.$slots.default?.());
    }
  }),
  QPage: defineComponent({
    name: 'QPage',
    render() {
      return h('div', this.$slots.default?.());
    }
  }),
  QPullToRefresh
};
