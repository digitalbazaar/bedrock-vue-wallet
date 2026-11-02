<template>
  <q-page
    class="row justify-center q-pa-md">
    <div
      class="full-width"
      style="max-width: 385px; margin-top: 6%">
      <div
        v-if="creatingProfile"
        class="column items-center q-gutter-md">
        <q-spinner
          color="primary"
          size="3rem" />
        <p class="text-center">
          Setting up your wallet...
        </p>
      </div>
      <login-form
        v-else
        @login="$event.waitUntil(login())"
        @register="$event.waitUntil(register())" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2026 Digital Bazaar, Inc. All rights reserved.
 */
import {
  provisionDefaultProfile, takePendingDestination
} from '../lib/firstRun.js';
import LoginForm from '../components/LoginForm.vue';
import {session} from '@bedrock/web-session';

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
    return {
      creatingProfile: false
    };
  },
  async created() {
    if(this.account) {
      this.login();
    }
  },
  methods: {
    async login() {
      await this.ensureProfile();
      // back to wherever the holder was going, if a guard recorded it
      const destination = takePendingDestination({router: this.$router});
      this.$router.push(destination ?? {name: 'home'});
    },
    /* An account can reach a first login with no profile: the register form
    creates one as part of registering, but an account that arrives any other
    way has only the account itself. A
    profile is what owns the keystore and the encrypted vault, so without one
    there is nowhere for a credential to go. Profile creation needs the
    logged-in session and runs in the browser, so it cannot be done by whoever
    created the account. */
    async ensureProfile() {
      const {account = null} = session.data;
      if(account === null) {
        return;
      }
      this.creatingProfile = true;
      try {
        await provisionDefaultProfile({accountId: account.id ?? account});
      } catch(e) {
        console.error('Profile creation failed', e.message);
        this.$q.notify({
          type: 'negative',
          timeout: 0,
          message: 'Your wallet could not be set up. Try signing in again.',
          actions: [{icon: 'fa fa-times', color: 'white'}]
        });
        /* Rethrown so `login()` never navigates. Swallowing it left the
        holder on home, where the notification's instruction does nothing and
        nothing can be stored. */
        throw e;
      } finally {
        this.creatingProfile = false;
      }
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
