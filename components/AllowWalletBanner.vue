<template>
  <q-banner
    v-if="show"
    :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'">
    Your wallet is not showing in the wallet selector on other websites?
    <template v-slot:action>
      <q-btn
        flat
        color="white"
        label="Dismiss"
        @click="dismiss()" />
      <q-btn
        flat
        color="primary"
        label="Add Wallet"
        @click="addWallet()" />
    </template>
  </q-banner>
</template>

<script>
/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {ref, toRef} from 'vue';
import {config} from '@bedrock/web';
import {installHandler} from 'web-credential-handler';
import {Notify} from 'quasar';``

const notifiedAccounts = new Map();

export default {
  name: 'AllowWalletBanner',
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  setup(props) {
    const accountId = toRef(props, 'account');

    const addWallet = async () => {
      try {
        // install credential handler
        await installHandler({url: '/credential-handler'});
        show.value = false;
        // don't show the notification to the same account again
        notifiedAccounts.set(accountId.value, true);
      } catch(e) {
        // eslint-disable-line no-console
        console.error('CHAPI register error:', e);
        Notify.create({
          type: 'negative',
          message:
            'Your wallet was not added to the wallet selector used by ' +
            'other websites.',
          actions: [{icon: 'fa fa-times'}]
        });
      }
    };

    const dismiss = () => {
      show.value = false;
      // if the user dismisses the notification don't show it again
      notifiedAccounts.set(accountId.value, true);
    };

    const show = ref(!config?.vueWallet?.disableChapi);

    return {addWallet, dismiss, show};
  }
};
</script>

<style scoped>
</style>
