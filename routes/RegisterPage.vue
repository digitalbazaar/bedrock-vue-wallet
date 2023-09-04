<template>
  <q-page
    class="row justify-center q-pa-md">
    <div
      class="full-width"
      style="max-width: 500px">
      <register
        @login="$event.waitUntil(login())"
        @register="$event.waitUntil(register())" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2023 Digital Bazaar, Inc. All rights reserved.
 */
import Register from '../components/Register.vue';
import {session} from '@bedrock/web-session';
import {useQuasar} from 'quasar';
import {useRouter} from 'vue-router';

export default {
  name: 'RegisterPage',
  components: {Register},
  setup() {
    const router = useRouter();
    const $q = useQuasar();

    const login = async () => router.push({name: 'login'});

    const register = async () => {
      try {
        // get account user is logged into
        await session.refresh();
        // check here to make sure the login set the session data
        const {account: currentAccount = null} = session.data;
        if(!currentAccount) {
          // not logged in, redirect to login
          login();
          return;
        }

        // redirect home
        router.push({name: 'home'});
      } catch(e) {
        const newError = `${e.name}: ${e.message || 'No Message'}`;
        // eslint-disable-line no-console
        console.error('Register Error:', e);
        $q.notify({
          type: 'negative',
          message: newError,
          actions: [{icon: 'fa fa-times'}]
        });
      }
    };

    return {login, register};
  }
};
</script>

<style scoped>
</style>
