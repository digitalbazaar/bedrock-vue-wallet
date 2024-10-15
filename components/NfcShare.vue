<template>
  <div>
    <q-btn
      v-show="!isSharing"
      no-caps
      rounded
      color="primary"
      :disabled="!supportsNfc"
      outline
      @click="writeNfc">
      <template #default>
        <div class="row justify-between items-center">
          <!-- eslint-disable vue/no-v-html
            this is ok to disable only because `contactlessSvg` has been
            specifically sanitized -->
          <div
            style="height: 24px; margin-right: 8px;"
            v-html="contactlessSvg" />
          <!-- eslint-enable -->
          <div>
            Tap to Share
          </div>
        </div>
      </template>
    </q-btn>
  </div>
</template>

<script>
import {ref, watch} from 'vue';
import {svg as contactlessSvg} from './contactless.js';
import {helpers} from '@bedrock/web-wallet';
import {useQuasar} from 'quasar';

export default {
  name: 'NfcShare',
  props: {
    credential: {
      type: Object,
      required: true
    }
  },
  emits: ['sharing'],
  setup(props, ctx) {
    // Constants
    const lenMaxNfcBytes = 32768;

    // Refs
    const supportsNfc = ref(false);
    const isSharing = ref(false);

    // watch
    watch(() => {
      const sharing = isSharing.value;
      ctx.emit('sharing', sharing);
    });
    // Hooks
    const $q = useQuasar();

    let abortController = null;
    let ndef = null;

    if('NDEFReader' in window) {
      supportsNfc.value = true;
      // eslint-disable-next-line no-undef
      ndef = new NDEFReader();

      // Proactively setup a reader to suppress OS-level reads
      ndef.scan().catch(error => {
        console.error(error, 'Failed to setup NDEF reader.');
      });

      ndef.onreading = event => {
        // receives the VPR
        const dec = new TextDecoder();
        try {
          // eslint-disable-next-line max-len
          if(event && event.message && event.message.records && event.message.records[0] && event.message.records[0].data) {
            const vpr = JSON.parse(dec.decode(event.message.records[0].data));
            console.log('NFC read event:', event);
            console.log('VPR received:', vpr);
          } else {
            console.warn('No valid data found in the NFC event.');
          }
        } catch(error) {
          console.error('Error decoding or parsing NFC data:', error);
        }
      };

      ndef.onreadingerror = event => {
        console.log(event, 'NDEF reader error.');
      };
    }

    function cancelWrite() {
      console.log('Write aborted.');
      if(abortController) {
        abortController.abort();
      }
      isSharing.value = false;
    }

    function notifyError(message) {
      $q.notify({
        message,
        timeout: 5000,
        type: 'negative',
        actions: [{label: 'Dismiss', color: 'white'}]
      });
    }

    function notifySuccess(message) {
      $q.notify({
        message,
        type: 'positive',
        timeout: 5000,
        actions: [{label: 'Dismiss', color: 'white'}]
      });
    }

    async function writeNfc() {

      if(supportsNfc.value === false) {
        notifyError('NFC is not supported on this device.');
        return;
      }

      if(isSharing.value === true) {
        cancelWrite();
      }

      isSharing.value = true;
      abortController = new AbortController();
      const {signal} = abortController;

      // Enqueue a write
      const vc = props.credential;
      const {bytes: rawBytes} = await helpers.toNFCPayload({credential: vc});
      console.log('Writing NFC...', {rawBytes});

      try {
        // FIXME: Check should be moved to vanilla-js layer and not UI layer
        if(rawBytes.length > lenMaxNfcBytes) {
          console.warn('Payload exceeds 32 kilobytes! Attempt may fail.');
        }
        if(ndef) {
          await ndef.write({
            records: [{
              data: rawBytes,
              lang: 'en',
              mediaType: 'application/octet-stream',
              recordType: 'mime',
            }]
          }, {
            overwrite: true,
            signal
          });
          notifySuccess('Credential shared successfully.');
        } else {
          throw new Error('NDEFReader not defined!');
        }
      } catch(error) {
        if(error.name === 'AbortError') {
          console.log('NFC write aborted.');
        } else {
          notifyError('An unexpected error occurred. Please try again.');
          console.error(error, 'Failed to write to NFC.');
        }
      } finally {
        cancelWrite();
      }
    }

    return {
      contactlessSvg,
      supportsNfc,
      isSharing,
      writeNfc,
      cancelWrite,
    };
  }
};
</script>
