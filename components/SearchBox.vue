<template>
  <q-input
    v-model="text"
    outlined
    dense
    :debounce="debounce"
    :placeholder="placeholder"
    @update:model-value="search()">
    <template #prepend>
      <q-icon
        name="fas fa-search"
        size="16px" />
    </template>
    <template
      v-if="text"
      #append>
      <q-icon
        name="fas fa-times"
        class="cursor-pointer"
        size="16px"
        @click.stop="search({reset: true})" />
    </template>
  </q-input>
</template>

<script>
/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'SearchBox',
  props: {
    debounce: {
      type: Number,
      default: 500,
      required: false
    },
    placeholder: {
      type: String,
      required: false,
      default: ''
    }
  },
  emits: ['search'],
  data() {
    return {
      text: ''
    };
  },
  methods: {
    async search({reset = false} = {}) {
      if(reset) {
        this.text = '';
      }
      await this.$emitExtendable('search', {text: this.text});
    }
  }
};
</script>

<style>
</style>
