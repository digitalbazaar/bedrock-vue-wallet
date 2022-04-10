<template>
  <br-q-title-card
    v-if="!awaitingAuthorization"
    :title="title"
    class="full-width">
    <div
      slot="body"
      class="q-pa-md">
      <div>
        <p
          class="text-left q-mb-md">
          {{text}}
        </p>
      </div>
      <div
        class="column">
        <q-btn
          v-if="isRegistered"
          size="form"
          color="primary"
          label="Next"
          @click.stop.prevent="next()" />
        <q-btn
          v-else
          size="form"
          color="primary"
          label="Register"
          @click.stop.prevent="register()" />
        <q-banner
          v-if="error"
          class="bg-red q-mt-md">
          {{errorText}}
        </q-banner>
      </div>
      <div
        v-if="loginLink">
        <div class="q-mt-sm">
          <small>
            Already registered?
            <a
              href=""
              @click.stop.prevent="login">
              Login</a>.
          </small>
        </div>
      </div>
    </div>
  </br-q-title-card>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQTitleCard} from '@bedrock/quasar-components';
import {helpers} from '@bedrock/web-wallet';
import {session} from '@bedrock/web-session';

const {openFirstPartyWindow} = helpers;

export default {
  name: 'Next',
  components: {BrQTitleCard},
  props: {
    display: {
      type: String,
      required: false,
      default: ''
    },
    title: {
      type: String,
      required: true,
      default: ''
    },
    text: {
      type: String,
      required: true,
      default: ''
    },
    errorMessage: {
      type: String,
      required: true,
      default: ''
    },
  },
  data() {
    return {
      error: false,
      errorText: this.errorMessage,
      isRegistered: true,
      awaitingAuthorization: false,
      loginLink: false
    };
  },
  methods: {
    async next() {
      this.loginLink = false;
      let hasStorageAccess;
      try {
        // A Promise that fulfills with undefined if the access to first-party
        // storage was granted, and rejects if access was denied.
        hasStorageAccess = await document.requestStorageAccess();
      } catch(e) {
        this.isRegistered = false;
        if(this.display === 'initial-share') {
          return this.$emitExtendable('login');
        }
        this.loginLink = true;
        this.errorText = 'Could not find a registered account. Please ' +
          'click on the Register button to register an account.';
        return this.error = true;
      }

      if(hasStorageAccess !== undefined) {
        return this.error = true;
      }

      // refresh session
      await session.refresh();

      // fallback to login if no session is found
      this.isRegistered = false;
      if(this.display === 'initial-share') {
        return this.$emitExtendable('login');
      }
      this.loginLink = true;
      this.errorText = 'Could not find a registered account. Please ' +
        'click on the Register button to register an account.';
      return this.error = true;
    },
    async register() {
      this.$q.loading.show({
        delay: 0, // ms
        // spinner: Spinner,
        message: 'Waiting for you to register an account.'
      });
      const handle = await openFirstPartyWindow();
      handle.addEventListener('load', () => {
        handle.addEventListener('unload', async () => {
          await this.$emitExtendable('next');
          this.reset();
          this.$q.loading.hide();
        });
      });
    },
    reset() {
      this.error = false;
      this.errorText = this.errorMessage;
      this.isRegistered = true;
      this.awaitingAuthorization = false;
    },
    async login() {
      await this.$emitExtendable('login');
    },
  }
};
</script>

<style scoped>
</style>
