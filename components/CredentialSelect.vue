<template>
  <div style="display: flex; flex-direction: row;">
    <!-- FIXME: mh:85px is based on height of the cred title + desc. section -->
    <div style="align-items: center; display: flex; max-height: 85px;">
      <q-checkbox
        :val="id"
        :model-value="selectedCredentials"
        @click="toggleSelect(id)" />
    </div>
    <div style="width: 100%">
      <slot />
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2026 Digital Bazaar, Inc.
 */
import {toRaw} from 'vue';

export default {
  name: 'CredentialSelect',
  props: {
    selectedCredentials: {
      type: Array,
      default: () => []
    },
    id: {
      required: true,
      type: String
    }
  },
  emits: ['select-credentials'],
  methods: {
    /**
     * Takes in an id and emits a set of selected credentials.
     *
     * @param {string} id - An identifier for the selected credential (does
     *   not have to be `credential.id`; it is determined by the `id` prop).
    */
    toggleSelect(id) {
      const selections = new Set(toRaw(this.selectedCredentials));
      if(selections.has(id)) {
        selections.delete(id);
        this.$emit('select-credentials', {selections});
        return;
      }
      selections.add(id);
      this.$emit('select-credentials', {selections});
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
