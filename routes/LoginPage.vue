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
    // FIXME: these routes may need to go to a generic "home" and a generic
    // "register" instead, to better allow for customization
    async login() {
      // redirect home
      this.$router.push({name: 'bedrock-vue-wallet-home'});
    },
    async register() {
      // redirect to register
      this.$router.push({name: 'bedrock-vue-wallet-register'});
    }
  }
};
</script>

<style scoped>
</style>
