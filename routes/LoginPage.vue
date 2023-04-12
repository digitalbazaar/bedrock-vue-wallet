<template>
  <q-page
    class="row justify-center q-pa-md">
    <div
      class="full-width"
      style="max-width: 500px">
      <login
        @login="$event.waitUntil(login())"
        @register="$event.waitUntil(register())" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import Login from '../components/Login.vue';
import {notifyAllowWallet} from '../lib/notifications.js';

export default {
  name: 'LoginPage',
  components: {Login},
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {};
  },
  async created() {
    if(this.account) {
      this.login();
    }
  },
  methods: {
    async login() {
      // redirect home
      this.$router.push({name: 'home'});
      await notifyAllowWallet();
    },
    async register() {
      // redirect to register
      this.$router.push({name: 'register'});
    }
  }
};
</script>

<style scoped>
</style>
