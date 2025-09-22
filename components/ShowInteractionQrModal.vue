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
      <q-card-section style="max-height: 375px">
        <q-img
          fit="contain"
          :src="qrCodeImageUrl" />
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
          @click="handleCopyCodeClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
/*!
 * Copyright (c) 2019-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as walletInteraction from './wallet-interaction.js';
import {computed, onMounted, ref} from 'vue';
import {useQuasar} from 'quasar';

export default {
  name: 'ShowInteractionQrModal',
  props: {
    modelValue: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update', 'update:modelValue'],
  setup(props, {emit}) {
    const $q = useQuasar();
    const qrCodeImageUrl = ref('');
    const qrCodeText = ref('');
    // on mounted
    onMounted(async () => {
      const interactionIdUrl = await walletInteraction.create();
      console.log('Interaction ID URL:\n', interactionIdUrl);
      const text = walletInteraction.toQrText({url: interactionIdUrl});
      qrCodeText.value = text;
      console.log('Encoded URL:\n', text);
      qrCodeImageUrl.value = await walletInteraction.toQrCode({text});

      // FIXME: abort poll if dialog is closed
      const website = await walletInteraction.poll({url: interactionIdUrl});
      const {hostname} = new URL(website);

      $q.dialog({
        title: 'Are you sure you want to leave Veres Wallet?',
        message: `This site would like you to complete checkout (${hostname}).`,
        cancel: true,
        persistent: true
      }).onOk(() => {
        location.assign(website);
      });
    });

    // computed
    const show = computed({
      get: () => props.modelValue,
      set: value => emit('update:modelValue', value)
    });

    async function handleCopyCodeClick() {
      await navigator.clipboard.writeText(qrCodeText.value);
    }

    return {
      handleCopyCodeClick,
      show,
      qrCodeImageUrl
    };
  }
};
</script>

<style lang="scss" scoped>
</style>
