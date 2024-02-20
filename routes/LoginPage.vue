<template>
  <q-page
    class="row justify-center q-pa-md">
    <div
      class="full-width"
      style="max-width: 385px; margin-top: 6%">
      <login-form
        @login="$event.waitUntil(login())"
        @register="$event.waitUntil(register())" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import LoginForm from '../components/LoginForm.vue';

export default {
  name: 'LoginPage',
  components: {LoginForm},
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
