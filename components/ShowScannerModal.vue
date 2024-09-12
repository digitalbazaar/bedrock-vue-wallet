<template>
  <q-dialog v-model="show">
    <q-card
      flat
      class="q-pa-md"
      style="border-radius: 12px; width: 340px">
      <q-card-section class="row items-center">
        <div class="text-body1 q-my-md text-center">
          Scan a QR code to present or receive a credential
        </div>
      </q-card-section>
      <q-card-actions align="between">
        <q-btn
          v-close-popup
          flat
          no-caps
          rounded
          size="16px"
          color="dark"
          label="Cancel"
          padding="sm md" />
        <q-btn
          v-close-popup
          no-caps
          rounded
          unelevated
          size="16px"
          color="dark"
          padding="sm md"
          label="Open Scanner"
          @click="goToScanner" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
/*!
 * Copyright (c) 2019-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {computed} from 'vue';
import {useRouter} from 'vue-router';

export default {
  name: 'ShowScannerModal',
  props: {
    modelValue: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update', 'update:modelValue'],
  setup(props, {emit}) {

    // use functions
    const router = useRouter();

    // computed
    const show = computed({
      get: () => props.modelValue,
      set: value => emit('update:modelValue', value)
    });

    // helper functions
    function goToScanner() {
      router.push({path: '/scanner'});
    }

    return {
      show,
      goToScanner
    };
  }
};
</script>

<style lang="scss" scoped>
</style>
