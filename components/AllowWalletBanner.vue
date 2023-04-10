<template>
  <div
    v-if="show"
    class="row justify-center q-pl-md q-pr-md q-pt-md">
    <q-banner
      class="col-md-9 col-xs-12 bg-indigo-10 text-white text-center q-pa-none q-ma-none">
      <div class="row">
        <div class="col-xs-6">
          You might need to allow your wallet to manage credentials for you.
        </div>
        <div class="col-xs-6">
          <q-btn
            v-close-popup
            round
            dense
            class="q-ma-xs"
            style="height: 34px"
            @click="dismiss">
            <q-icon
              name="fas fa-times"
              size="sm" />
          </q-btn>
          <allow-wallet-button @wallet-registration="handleRegistration" />
        </div>
      </div>
    </q-banner>
  </div>
</template>

<script>
import AllowWalletButton from './AllowWalletButton.vue';
import assertWebView from 'is-ua-webview';
import {ref} from 'vue';

export default {
  name: 'AllowWalletBanner',
  components: {AllowWalletButton},
  setup() {
    const show = ref(true);
    const mobileWebView = assertWebView(navigator?.userAgent);
    if(mobileWebView) {
      show.value = false;
    }
    const handleRegistration = ({success}) => {
      if(success === true) {
        show.value = false;
      }
    };
    const dismiss = () => show.value = false;
    return {handleRegistration, dismiss, show};
  }
};
</script>

<style>
</style>
