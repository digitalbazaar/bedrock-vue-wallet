<template>
  <div
    class="row justify-center"
    :class="$q.screen.lt.sm ? 'q-px-lg' : ''">
    <div class="column">
      <div class="q-mt-md text-center">
        <img
          :src="image"
          class="s-issuer-image">
      </div>
      <h6 class="q-my-sm">
        <strong>{{name}}</strong>
        <span v-if="type === 'query'">
          would like some information from you.
        </span>
        <span v-else>would like you to authenticate.</span>
      </h6>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'ShareHeader',
  props: {
    image: {
      type: String,
      default: '',
      required: true
    },
    name: {
      type: String,
      default: '',
      required: true
    },
    type: {
      type: String,
      default: () => 'query',
      required: false
    }
  },
  data() {
    return {};
  }
};
</script>

<style scoped>
.s-issuer-image {
  width: 80px;
  height: 80px;
}
</style>
