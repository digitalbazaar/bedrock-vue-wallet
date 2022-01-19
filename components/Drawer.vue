<template>
  <q-list
    separator
    class="text-subtitle1">
    <q-item-label header>
      Navigation
    </q-item-label>
    <q-separator />
    <q-item
      v-if="!account"
      to="/login"
      exact>
      <q-item-section avatar>
        <q-icon name="fa fa-sign-in-alt" />
      </q-item-section>
      <q-item-section>Log In</q-item-section>
    </q-item>
    <q-item
      to="/"
      exact>
      <q-item-section avatar>
        <q-icon name="fa fa-home" />
      </q-item-section>
      <q-item-section>Credentials</q-item-section>
    </q-item>
    <q-item
      to="/profiles"
      exact>
      <q-item-section avatar>
        <q-icon name="fa fa-users" />
      </q-item-section>
      <q-item-section>Profiles</q-item-section>
    </q-item>
  </q-list>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'Drawer',
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {};
  }
};

</script>

<style scoped>
</style>
