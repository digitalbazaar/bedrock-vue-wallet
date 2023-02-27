<template>
  <q-checkbox
    val="true"
    @click="toggleSelect(id)">
    <slot />
  </q-checkbox>
</template>

<script>
export default {
  name: 'CredentialSelect',
  methods: {
    toggleSelect(id) {
      if(this.selected.has(id)) {
        this.selected.delete(id);
        return;
      }
      this.selected.add(id);
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
