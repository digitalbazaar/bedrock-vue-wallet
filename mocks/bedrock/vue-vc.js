import {defineComponent} from 'vue';

const stub = defineComponent({name: 'Stub', template: '<div />'});
export const CredentialSwitch = stub;
export const DynamicImage = stub;
export const useCredentialCommon = () => ({credentialImage: ''});
