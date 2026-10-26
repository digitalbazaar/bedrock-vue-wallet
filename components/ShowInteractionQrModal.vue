<template>
  <q-dialog v-model="show">
    <q-card
      flat
      class="q-pa-md"
      style="border-radius: 12px; width: 340px">
      <q-card-section class="row items-center">
        <div class="text-body1 q-my-md text-center">
          Show QR code
        </div>
      </q-card-section>
      <q-card-section
        class="text-center"
        style="max-height: 375px">
        <div
          v-if="error"
          class="text-negative">
          {{error}}
        </div>
        <q-img
          v-else-if="qrCodeImageUrl"
          fit="contain"
          :src="qrCodeImageUrl" />
        <q-spinner
          v-else
          color="primary"
          size="3em" />
      </q-card-section>
      <q-card-actions align="between">
        <q-btn
          v-close-popup
          flat
          no-caps
          rounded
          size="16px"
          color="dark"
          label="Close"
          padding="sm md" />
        <q-btn
          no-caps
          rounded
          size="16px"
          color="primary"
          label="Copy Code"
          padding="sm md"
          :disable="!qrCodeText || !!error"
          @click="handleCopyCodeClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
/*!
 * Copyright (c) 2025-2026 Digital Bazaar, Inc.
 */
import * as walletInteraction from './wallet-interaction.js';
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {config} from '@bedrock/web';
import {useQuasar} from 'quasar';

export default {
  name: 'ShowInteractionQrModal',
  props: {
    modelValue: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, {emit}) {
    const $q = useQuasar();
    const qrCodeImageUrl = ref('');
    const qrCodeText = ref('');
    const error = ref('');
    // stops polling when the dialog closes; the parent mounts this
    // component with `v-if`, so closing it unmounts it
    const abortController = new AbortController();

    const show = computed({
      get: () => props.modelValue,
      set: value => emit('update:modelValue', value)
    });

    onMounted(async () => {
      let inviteResponse;
      try {
        const interactionId = await walletInteraction.create();
        qrCodeText.value = walletInteraction.toQrText({interactionId});
        qrCodeImageUrl.value = await walletInteraction.toQrCode({
          text: qrCodeText.value
        });
        inviteResponse = await walletInteraction.poll({
          interactionId, signal: abortController.signal
        });
      } catch(e) {
        if(!abortController.signal.aborted) {
          console.error(e);
          error.value = 'Unable to complete checkout. Close and try again.';
        }
        return;
      }

      let url;
      try {
        url = walletInteraction.parseRedirectUrl({url: inviteResponse.url});
      } catch(e) {
        console.error(e);
        error.value = 'The merchant sent an invalid checkout link.';
        return;
      }

      const {name} = config.vueWallet.branding;
      $q.dialog({
        title: `Leave ${name}?`,
        message: 'This site would like you to complete checkout ' +
          `(${url.hostname}).`,
        cancel: true,
        persistent: true
      }).onOk(() => {
        location.assign(url.href);
      }).onCancel(() => {
        // the interaction is complete; its QR code can't be reused
        show.value = false;
      });
    });

    onBeforeUnmount(() => abortController.abort());

    async function handleCopyCodeClick() {
      await navigator.clipboard.writeText(qrCodeText.value);
    }

    return {
      error,
      handleCopyCodeClick,
      qrCodeImageUrl,
      qrCodeText,
      show
    };
  }
};
</script>
