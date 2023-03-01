<template>
  <q-checkbox
    :val="id"
    :model-value="selectedCredentials.value"
    @click="toggleSelect(id)">
    <slot />
  </q-checkbox>
</template>

<script>
import {toRaw} from 'vue';

export default {
  name: 'CredentialSelect',
  inject: ['selectedCredentials', 'selectCredential'],
  props: {
    id: {
      required: true,
      type: String
    }
  },
  methods: {
    toggleSelect(id) {
      const selections = new Set(toRaw(this.selectedCredentials.value));
      if(selections.has(id)) {
        selections.delete(id);
        return this.selectCredential({selections});
      }
      selections.add(id);
      this.selectCredential({selections});
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
