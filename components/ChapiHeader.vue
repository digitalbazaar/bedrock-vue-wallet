<template>
  <div
    class="row justify-center"
    :class="$q.screen.lt.sm ? 'q-px-lg' : ''">
    <div class="column">
      <div class="q-mt-md text-center">
        <img
          :src="image"
          class="s-rp-image">
      </div>
      <h6 class="q-my-sm">
        <strong>{{name}}</strong> would like to interact with you.
      </h6>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'ChapiHeader',
  props: {
    image: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }
};
</script>

<style scoped>
.s-rp-image {
  width: 64px;
  height: 64px;
}
</style>
