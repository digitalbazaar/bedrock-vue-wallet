<template>
  <div v-if="supportsNfc">
    <button
      v-if="!isSharing"
      @click="writeNfc">
      Share via NFC
    </button>
    <div v-if="isSharing">
      Hold your device near a reader to share your credential.
      <button @click="cancelWrite">
        Cancel
      </button>
    </div>
  </div>
</template>

<script>
import {defineComponent, ref} from 'vue';
import {Notify} from 'quasar';

export default defineComponent({
  props: {
    credential: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const lenMaxNfcBytes = 32768;

    const supportsNfc = ref(false);
    const isSharing = ref(false);

    let abortController = null;
    let ndef = null;

    if('NDEFReader' in window) {
      supportsNfc.value = true;
      // eslint-disable-next-line no-undef
      ndef = new NDEFReader();
    }

    function cancelWrite() {
      if(abortController) {
        abortController.abort();
      }
      isSharing.value = false;
    }

    function notifyError(message) {
      Notify.create({
        message,
        color: 'red-5',
        timeout: 5000,
        textColor: 'white',
        actions: [{
          label: 'Dismiss',
          color: 'white'
        }]
      });
    }

    function notifySuccess(message) {
      Notify.create({
        message,
        color: 'green-5',
        timeout: 5000,
        textColor: 'white',
        actions: [{
          label: 'Dismiss',
          color: 'white'
        }]
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
});
</script>
