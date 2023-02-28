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
        selections.delete(id);
        this.$emit('update-selections', {selections});
        return;
      }
      selections.add(id);
      this.$emit('update-selections', {selections});
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
