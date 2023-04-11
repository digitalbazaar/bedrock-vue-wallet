<template>
  <div
    v-if="show"
    class="row justify-center q-pl-md q-pr-md q-pt-md text-white text-center">
    <q-banner
      class="col-md-6 col-xs-9 bg-green-10 q-pr-none">
      <div class="row items-center">
        <div class="col-xs-8 text-bold">
          You might need to allow your wallet to manage credentials for you.
        </div>
        <div class="col-xs-3">
          <allow-wallet-button
            class="relative-position float-right"
            @wallet-registration="handleRegistration" />
        </div>
        <div class="col-xs-1">
          <q-btn
            v-close-popup
            unelevated
            round
            dense
            class="q-ma-xs relative-position float-right"
            style="height: 34px"
            @click="dismiss">
            <q-icon
              name="fas fa-times"
              size="sm" />
          </q-btn>
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
