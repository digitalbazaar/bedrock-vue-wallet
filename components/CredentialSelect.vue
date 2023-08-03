<template>
  <div style="display: flex; flex-direction: row;">
    <!-- FIXME: mh:85px is based on height of the cred title + desc. section -->
    <div style="align-items: center; display: flex; max-height: 85px;">
      <q-checkbox
        :val="id"
        :model-value="selectedCredentials"
        @click="toggleSelect(id)" />
    </div>
    <div>
      <slot />
    </div>
  </div>
</template>

<script>
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
  emit: ['select-credentials'],
  methods: {
    /**
     * Takes in an id and emits a set of selected credentials.
     *
     * @param {string} id - A credential id.
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
