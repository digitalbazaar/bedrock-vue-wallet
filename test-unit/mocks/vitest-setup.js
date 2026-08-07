import {config} from '@vue/test-utils';
import {defineComponent} from 'vue';

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

const QDialog = defineComponent({
  name: 'QDialog',
  props: {modelValue: {type: Boolean, default: false}},
  emits: ['update:modelValue'],
  template: '<div><slot /></div>'
});

const QBtn = defineComponent({
  name: 'QBtn',
  props: {
    icon: String,
    color: String,
    size: String,
    round: Boolean,
    outline: Boolean
  },
  template: '<button />'
});

const QPullToRefresh = defineComponent({
  name: 'QPullToRefresh',
  props: {onRefresh: Function},
  template: '<div><slot /></div>'
});

config.global.components = {
  QDialog,
  QBtn,
  // renders its slot and carries the class the component selects on: a stub
  // that renders nothing cannot tell a chip with a label from one without
  QChip: defineComponent({
    name: 'QChip',
    props: {
      outline: Boolean, clickable: Boolean, color: String, textColor: String
    },
    template: '<span class="q-chip"><slot /></span>'
  }),
  QPage: {name: 'QPage', template: '<div><slot /></div>'},
  QPullToRefresh
};
