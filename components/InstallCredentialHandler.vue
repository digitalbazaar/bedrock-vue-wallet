<template>
  <q-footer class="bg-frosted bg-transparent text-grey-7">
    <q-toolbar class="justify-center">
      <div>
        Wallet not showing up when other websites request credentials?
        Click
        <a
          class="br-link"
          @click.prevent="installCredentialHandler">here</a>.
      </div>
    </q-toolbar>
  </q-footer>
</template>

<script>
/*!
 * Copyright (c) 2023 Digital Bazaar, Inc. All rights reserved.
 */
import {installHandler} from 'web-credential-handler';
import {Notify} from 'quasar';

export default {
  name: 'InstallCredentialHandler',
  setup() {
    async function installCredentialHandler() {
      try {
        const result = await installHandler({url: '/credential-handler'});
        if(result === undefined) {
          Notify.create({
            message: 'Your wallet is ready!',
            color: 'green-6',
            timeout: 5000,
            textColor: 'white',
            actions: [{
              label: 'Dismiss',
              color: 'white'
            }]
          });
        }

      } catch(e) {
        if(e.message === 'Permission denied.') {
          Notify.create({
            message: 'Warning! Your wallet installation is incomplete.',
            color: 'red-5',
            timeout: 5000,
            textColor: 'white',
            actions: [{
              label: 'Dismiss',
              color: 'white'
            }]
          });
        }
      }
    }
    return {
      installCredentialHandler
    };
  }
};
</script>

<style scoped>
.bg-frosted {
  -webkit-backdrop-filter: blur(8px) !important;  /* Safari 9+ */
  backdrop-filter: blur(8px) !important; /* Chrome and Opera */
  box-shadow: inset 0 0 0 200px rgba(255,255,255,0.08) !important;
}

.br-link {
  cursor: pointer;
  font-weight: bold;
  text-decoration: underline;
}
</style>
