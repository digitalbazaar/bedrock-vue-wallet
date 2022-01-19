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
import qrcode from 'qrcode';

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
    },
  },
  asyncComputed: {
    async qrImage() {
      const qrUrl = await qrcode.toDataURL(this.url);
      return qrUrl;
    }
  },
};
</script>

<style scoped>
</style>
