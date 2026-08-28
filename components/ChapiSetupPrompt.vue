<template>
  <q-dialog
    :model-value="show"
    persistent
    seamless
    position="bottom">
    <q-card class="chapi-setup-prompt full-width q-pa-md">
      When other websites request or offer credentials, your browser shows a
      wallet selector. Show this wallet in that selector?
      <div class="row justify-end q-gutter-sm q-mt-md">
        <q-btn
          flat
          label="Dismiss"
          :disable="loading"
          @click="dismiss()" />
        <q-btn
          label="Show Wallet"
          color="primary"
          :disable="loading"
          :loading="loading"
          @click="showWallet()" />
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref} from 'vue';
import {
  dismissChapiSetupPrompt, isChapiSetupPromptDismissed
} from '../lib/chapiPreference.js';
import {addWalletToChapi} from '../lib/helpers.js';
import {config} from '@bedrock/web';
import {Notify} from 'quasar';

export default {
  name: 'ChapiSetupPrompt',
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  setup(props) {
    const retired = ref(isChapiSetupPromptDismissed());
    const loading = ref(false);

    const show = computed(() => !retired.value &&
      !config?.vueWallet?.disableChapi && !!props.account);

    // the browser's answer is not readable, so record only that it was asked
    const retire = () => {
      dismissChapiSetupPrompt();
      retired.value = true;
    };

    const showWallet = async () => {
      loading.value = true;
      try {
        await addWalletToChapi();
      } catch(e) {
        // `addWalletToChapi` handles its own errors; retire regardless
        console.error('CHAPI registration failed:', e);
      } finally {
        loading.value = false;
        retire();
      }
    };

    const dismiss = () => {
      retire();
      // `showWallet` notifies on its own
      Notify.create({
        message: 'You can show your wallet later from the settings page.',
        color: 'grey-8',
        timeout: 5000,
        textColor: 'white',
        actions: [{
          label: 'Dismiss',
          color: 'white'
        }]
      });
    };

    return {
      dismiss,
      loading,
      show,
      showWallet
    };
  }
};
</script>

<style scoped>
.chapi-setup-prompt {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  /* clear the iOS home indicator */
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
</style>
