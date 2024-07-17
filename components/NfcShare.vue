<template>
  <div v-if="supportsNfc">
    <q-btn
      v-if="!isSharing"
      outline
      no-caps
      color="primary"
      icon="fa fa-share"
      label="Share via NFC"
      @click="writeNfc" />
    <div
      v-else
      class="text-center">
      Hold your device near a reader to share your credential.
      <div>
        <q-btn
          outline
          no-caps
          class="q-mt-sm"
          @click="cancelWrite">
          Cancel
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script>
import {ref} from 'vue';
import {useQuasar} from 'quasar';

export default {
  name: 'NfcShare',
  props: {
    credential: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    // Constants
    const lenMaxNfcBytes = 32768;

    // Refs
    const supportsNfc = ref(false);
    const isSharing = ref(false);

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
        console.log('NFC read event:', event);
      };

      ndef.onreadingerror = event => {
        console.log(event, 'NDEF reader error.');
      };
    }

    function cancelWrite() {
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
      try {
        const jsonString = JSON.stringify(props.credential);
        const encoder = new TextEncoder();
        const data = encoder.encode(jsonString);

        if(data.length > lenMaxNfcBytes) {
          console.warn('Payload exceeds 32 kilobytes! Attempt may fail.');
        }

        if(ndef) {
          await ndef.write({
            records: [{
              data,
              lang: 'en',
              mediaType: 'application/json',
              recordType: 'mime',
            }]
          }, {
            overwrite: true,
            signal
          });
          notifySuccess('Credential shared via NFC.');
        } else {
          throw new Error('NDEFReader not defined!');
        }
      } catch(error) {
        if(error.name === 'AbortError') {
          console.log('NFC write aborted.');
        } else {
          notifyError('An unexpected NFC error occurred. Please try again.');
          console.error(error, 'Failed to write to NFC.');
        }
      } finally {
        cancelWrite();
      }
    }

    return {
      supportsNfc,
      isSharing,
      writeNfc,
      cancelWrite,
    };
  }
};
</script>
