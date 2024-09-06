<template>
  <q-page class="row justify-center q-pa-md">
    <div class="col-md-9 col-xs-12">
      <WalletScanner />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2019-2024 Digital Bazaar, Inc. All rights reserved.
 */
import WalletScanner from '../components/WalletScanner.vue';

export default {
  name: 'ScannerPage',
  components: {
    WalletScanner,
  }
};
</script>

<style lang="scss" scoped>
</style>
