<template>
  <div class="flex column justify-center items-center fit">
    <q-btn
      no-caps
      rounded
      unelevated
      size="16px"
      color="dark"
      class="q-px-md"
      label="Open Veres Wallet Scanner"
      @click="openScanner" />

    <!-- TODO: REMOVE -->
    <!-- // DEVELOPMENT ONLY // -->
    <div
      v-if="result"
      style="border: 1px solid #000; border-radius: 12px;"
      class="flex justify-center border q-pa-sm q-mt-md">
      <div
        class="q-mt-lg text-h6">
        DEVELOPMENT ONLY
      </div>
      <div
        style="max-width: 325px;"
        class="q-mt-md q-py-sm">
        <div>{</div>
        <div
          v-for="key in Object.keys(result)"
          :key="key"
          class="q-ml-md q-mt-sm dev-result">
          <b>{{key}}</b>: {{result[key]}}
        </div>
        <div>}</div>
      </div>
      <q-btn
        no-caps
        rounded
        size="16px"
        class="q-my-md"
        label="Copy `text` to Clipboard"
        @click="handleCopy" />
    </div>
    <!-- // DEVELOPMENT ONLY // -->
  </div>

  <div
    v-if="!result && enableScanning"
    class="full-width">
    <BarcodeScanner
      v-if="enableScanning"
      tip-text="Scan a barcode containing a credential."
      :formats-to-support="supportedFormats"
      @close="restart"
      @result="handleScan" />
  </div>
</template>

<script>
/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {ref, watch} from 'vue';
import BarcodeScanner from './BarcodeScanner.vue';
import {Html5QrcodeSupportedFormats} from 'html5-qrcode';
import {useQuasar} from 'quasar';

export default {
  name: 'WalletScanner',
  components: {BarcodeScanner},
  setup() {
    // constants
    const supportedFormats = [Html5QrcodeSupportedFormats.QR_CODE];

    // refs
    const error = ref(null);
    const result = ref(null);
    const errorTitle = ref(null);
    const enableScanning = ref(false);

    // Use functions
    const $q = useQuasar();

    // Notify user when error occurs
    watch(error, updatedError => {
      if(updatedError !== null) {
        $q.notify({
          html: true,
          timeout: 9000,
          position: 'top',
          icon: undefined,
          type: 'negative',
          message: `<span>${errorTitle.value}:</span>
          <br><span>${error.value}</span>`,
          classes: 'text-center q-pa-md text-body1',
          actions: [{icon: 'fa fa-times', color: 'white', round: true}]
        });
      }
      // Clear error values
      error.value = null;
      errorTitle.value = null;
    });

    // helper functions
    function openScanner() {
      result.value = null;
      enableScanning.value = true;
    }

    function restart() {
      result.value = null;
      enableScanning.value = false;
    }

    async function handleScan({type, text}) {
      if(type === 'QR_CODE') {
        await handleQrCode({text, type});
      }
    }

    async function handleQrCode({text, type}) {
      $q.loading.show();
      enableScanning.value = false;
      try {
        result.value = {type, text};
      } catch(e) {
        handleErrorMessages(e, type);
      } finally {
        $q.loading.hide();
      }
    }

    function handleErrorMessages(e, barcodeType) {
      console.error(e);
      const barcode = barcodeType === 'QR_CODE' ? 'QR code' : 'barcode';
      errorTitle.value = 'Scan Failure';
      error.value =
          `There was an error scanning the ${barcode}. ` +
          'Please try again.';
    }

    async function handleCopy() {
      const text = result.value.text;
      try {
        await navigator.clipboard.writeText(text);
        $q.notify({
          position: 'top',
          icon: 'fas fa-copy',
          message: 'Copied to clipboard'
        });
      } catch(e) {
        console.error(e);
        $q.notify({
          type: 'error',
          position: 'top',
          message: 'Unable to copy to clipboard',
          icon: 'fas fa-exclamation-triangle',
        });
      }
    }

    return {
      result,
      restart,
      handleScan,
      handleCopy,
      openScanner,
      enableScanning,
      supportedFormats,
    };
  }
};
</script>

<style scoped>
.dev-result {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
</style>
