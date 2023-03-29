<template>
  <q-btn
    label="Manage Credentials"
    @click="installHandler" />
</template>

<script>
/*!
 * Copyright (c) 2018-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {installHandler} from 'web-credential-handler';

export default {
  name: 'InstallHandlerButton',
  methods: {
    async installHandler() {
      try {
        // install credential handler
        await installHandler({url: '/credential-handler'});
      } catch(e) {
        // eslint-disable-line no-console
        console.error('CHAPI register error:', e);
        this.$q.notify({
          type: 'negative',
          message:
            'Your wallet will not be shown to you as an option for using ' +
            'credentials on other websites. Please reload the page and ' +
            'select "Accept" to change this.',
          actions: [{icon: 'fa fa-times'}]
        });
      }
    }
  }
};
</script>

<style scoped>
</style>
