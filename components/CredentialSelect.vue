<template>
  <q-checkbox
    :val="id"
    :model-value="selections"
    @click="toggleSelect(id)">
    <slot />
  </q-checkbox>
</template>

<script>
import {toRaw} from 'vue';

export default {
  name: 'CredentialSelect',
  props: {
    selections: {
      required: true,
      type: Array
    },
    id: {
      required: true,
      type: String
    }
  },
  methods: {
    toggleSelect(id) {
      const selections = new Set(toRaw(this.selections));
      if(selections.has(id)) {
        this.$emit('selectVc', {remove: id});
        return;
      }
      this.$emit('selectVc', {select: id});
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
