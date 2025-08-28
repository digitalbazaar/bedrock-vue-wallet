<template>
  <div>
    <img
      :src="qrImage"
      :width="width"
      :height="height"
      :style="border ? 'border: 1px solid #222' : ''">
  </div>
</template>

<script>
/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {computedAsync} from '@vueuse/core';
import qrcode from 'qrcode';
import {toRef} from 'vue';

export default {
  name: 'QrCode',
  props: {
    url: {
      type: String,
      required: true
    },
    width: {
      type: String,
      default: '250px',
      required: false
    },
    height: {
      type: String,
      default: '250px',
      required: false
    },
    border: {
      type: Boolean,
      default: true,
      required: false
    }
  },
  setup(props) {
    const url = toRef(props, 'url');
    const qrImage = computedAsync(async () => qrcode.toDataURL(url.value));
    return {
      qrImage
    };
  }
};
</script>

<style scoped>
</style>
