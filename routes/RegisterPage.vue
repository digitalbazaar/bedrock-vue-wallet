<template>
  <q-page
    class="row justify-center q-pa-md">
    <div
      class="full-width"
      style="max-width: 500px">
      <register
        :is-popup="isPopup"
        @login="$event.waitUntil(login())"
        @register="$event.waitUntil(register())" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {getSession} from 'bedrock-web-session';
import Register from '../components/Register.vue';

export default {
  name: 'RegisterPage',
  components: {Register},
  data() {
    return {};
  },
  computed: {
    isPopup() {
      return window.location.href ===
        `${window.location.origin}/credential-handler/register`;
    }
  },
  methods: {
    async login() {
      // FIXME: might need to use a generic "login" route name to allow for
      // better customization
      this.$router.push({name: 'bedrock-vue-wallet-login'});
    },
    async register() {
      try {
        // get account user is logged into
        const session = await getSession();
        await session.refresh();
        // check here to make sure the login set the session data
        const {account: currentAccount = null} = session.data;
        if(!currentAccount) {
          // not logged in, redirect to login
          this.login();
          return;
        }

        // FIXME: might need to use a generic "home" route name to allow for
        // better customization

        // redirect home
        this.$router.push({name: 'bedrock-vue-wallet-home'});
      } catch(e) {
        const newError = `${e.name}: ${e.message || 'No Message'}`;
        // eslint-disable-line no-console
        console.error('Register Error:', e);
        this.$q.notify({
          type: 'negative',
          message: newError,
          actions: [{icon: 'fa fa-times'}]
        });
      }
    }
  }
};
</script>

<style scoped>
</style>
