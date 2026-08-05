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

config.global.components = {
  QDialog,
  QBtn: {name: 'QBtn', template: '<button />'},
  QChip: {name: 'QChip', template: '<span />'},
  QPage: {name: 'QPage', template: '<div><slot /></div>'},
  QPullToRefresh: {name: 'QPullToRefresh', template: '<div><slot /></div>'}
};
