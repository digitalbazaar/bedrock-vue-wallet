<template>
  <q-page class="row justify-center q-pa-md">
    <div
      class="full-width"
      style="max-width: 385px; margin-top: 6%">
      <div
        v-if="error"
        class="column q-gutter-md">
        <q-banner
          class="bg-red text-white"
          data-testid="welcome-error"
          rounded>
          {{error}}
        </q-banner>
        <q-btn
          no-caps
          rounded
          unelevated
          color="dark"
          label="Try again"
          :loading="working"
          @click="setUp" />
      </div>
      <div
        v-else
        class="column items-center q-gutter-md"
        data-testid="welcome-working">
        <q-spinner
          color="primary"
          size="3rem" />
        <p class="text-center">
          Setting up your wallet...
        </p>
      </div>
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {
  provisionDefaultProfile, takePendingDestination
} from '../lib/firstRun.js';
import {session} from '@bedrock/web-session';

/* First run. An account can arrive with no profile -- one that arrives any
way but the register form has only the account itself -- and a profile owns the
keystore and the encrypted vault, so until one exists there is nowhere for a
credential to go.

This is its own route rather than a step inside login for two reasons: signing
in and provisioning storage are different acts and should be named
differently, and a profile creates metered resources, so it should not appear
as a side effect of a shared login page that every wallet uses. */

export default {
  name: 'WelcomePage',
  data() {
    return {
      working: false,
      error: ''
    };
  },
  async created() {
    await this.setUp();
  },
  methods: {
    async setUp() {
      this.working = true;
      this.error = '';
      try {
        const {account = null} = session.data;
        if(account === null) {
          throw new Error('No account to set up.');
        }
        await provisionDefaultProfile({accountId: account.id ?? account});
        const destination = takePendingDestination({router: this.$router});
        await this.$router.push(destination ?? {name: 'home'});
      } catch(e) {
        console.error('Wallet setup failed.', e.message);
        this.error = 'Your wallet could not be set up. Check your connection ' +
          'and try again.';
      } finally {
        this.working = false;
      }
    }
  }
};

</script>

<style scoped>
</style>
