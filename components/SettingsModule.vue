<template>
  <q-card>
    <q-card-section
      class="q-pa-none"
      :class="customBg">
      <q-item>
        <q-item-label class="row justify-center items-center full-width">
          <div
            class="text-subtitle1">
            {{title}}
          </div>
        </q-item-label>
      </q-item>
    </q-card-section>
    <q-separator />
    <q-card-section :class="setPadding">
      <slot />
    </q-card-section>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'SettingsModule',
  props: {
    title: {
      type: String,
      required: true
    },
    noPadding: {
      type: Boolean,
      required: false,
      default: false
    },
    customBg: {
      type: String,
      required: false,
      default: ''
    }
  },
  computed: {
    setPadding() {
      if(this.noPadding) {
        return 'q-pa-none';
      }
      return '';
    }
  }
};
</script>

<style>
</style>
