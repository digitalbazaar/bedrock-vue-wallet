<template>
  <q-btn
    label="Allow Wallet"
    :loading="loading"
    color="primary"
    v-bind="options"
    @click="installHandler" />
</template>

<script>
/*!
 * Copyright (c) 2018-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {installHandler} from 'web-credential-handler';
import {Notify} from 'quasar';
import {ref} from 'vue';

export default {
  name: 'InstallHandlerButton',
  props: {
    // can be used to pass options to the q-btn
    // @see https://quasar.dev/vue-components/button
    options: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, {emit}) {
    const loading = ref(false);
    const _installHandler = async () => {
      try {
        loading.value = true;
        // install credential handler
        await installHandler({url: '/credential-handler'});
        emit('wallet-registration', {success: true});
      } catch(e) {
        // eslint-disable-line no-console
        console.error('CHAPI register error:', e);
        Notify.create({
          type: 'negative',
          message:
            'Your wallet will not be shown to you as an option for using ' +
            'credentials on other websites. Please click the button and ' +
            'select "Allow" to change this.',
          actions: [{icon: 'fa fa-times'}]
        });
        emit('wallet-registration', {success: false, error: e});
      } finally {
        loading.value = false;
      }
    };
    return {
      loading,
      installHandler: _installHandler
    };
  }
};
</script>

<style scoped>
</style>
