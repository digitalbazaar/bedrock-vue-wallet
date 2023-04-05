<template>
  <div
    v-if="show"
    class="row justify-center q-pl-md q-pr-md q-pt-md">
    <q-banner
      class="col-md-9 col-xs-12 bg-red-14 text-white text-center">
      You might need to Allow your Wallet to manage credentials for you.
      <template #action>
        <allow-wallet-button @wallet-registration="handleRegistration" />
        <q-btn
          color="indigo-10"
          class="text-white"
          label="Dismiss"
          @click="dismiss" />
      </template>
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
