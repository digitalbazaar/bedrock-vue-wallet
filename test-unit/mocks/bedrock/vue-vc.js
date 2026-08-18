/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {computed, defineComponent, h, unref} from 'vue';

// a render function, not a `template` string: the browser project resolves
// Vue's runtime-only build, where a stubbed template compiles to nothing
const stub = defineComponent({
  name: 'StubComponent',
  render() {
    return h('div');
  }
});
export const CredentialSwitch = stub;
export const DynamicImage = stub;

// mirrors @bedrock/vue-vc's `useCredentialCommon`, including that both values
// are refs -- a plain-string mock hid a real `.value` access in the component
export const useCredentialCommon = ({credential}) => ({
  credentialName: computed(() => {
    const {name = '', type = ['Verifiable Credential']} = unref(credential);
    if(name.length > 0) {
      return name;
    }
    const granularType = type[type.length - 1];
    return granularType.replace(/(?!^)([A-Z]|\d+)/g, ' $1');
  }),
  credentialImage: computed(() => {
    const {image = null, issuer} = unref(credential);
    return image ?? issuer?.image ?? issuer?.logo ?? '';
  })
});
