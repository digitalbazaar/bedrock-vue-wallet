<template>
  <div>
    <div
      v-if="account && !registering"
      class="row justify-center">
      <store-credentials
        v-if="!error"
        :account="account"
        :loading="loading"
        :holder="holder"
        :verifiable-credential="verifiableCredential"
        @cancel="$event.waitUntil(cancel())"
        @store="$event.waitUntil(store($event))" />
      <!-- FIXME: bikeshed name of store-credentials-error, this captures
      user intent and emits events, it is not a simple display so we need a
      better name -->
      <problem
        v-else
        :account="account"
        :loading="loading"
        :error="error"
        @cancel="$event.waitUntil(cancel(error))" />
    </div>
    <div
      v-else
      class="row justify-center q-pa-md">
      <div
        v-if="storageChecked"
        class="full-width"
        style="max-width: 500px">
        <login
          v-if="display === 'login'"
          @register="setDisplay('register')"
          @next="setDisplay('next')" />
        <register
          v-if="display === 'register'"
          @login="setDisplay('login')"
          @register="$event.waitUntil(register())" />
        <next
          v-if="display === 'next'"
          title="Registration"
          text="Please continue to the next step in order to select a profile
            to authenticate with."
          error-message="There was a problem registering your account."
          @next="setDisplay('next')" />
        <next
          v-if="display === 'initial'"
          title="Login"
          text="Please continue to the next step in order to select a
          profile to store your credentials."
          error-message="There was a problem logging into your account."
          @next="setDisplay('next')" />
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {exchanges, getCredentialStore, helpers} from '@bedrock/web-wallet';
import Login from '../components/Login.vue';
import Next from '../components/Next.vue';
import Problem from '../components/Problem.vue';
import {receiveCredentialEvent} from 'web-credential-handler';
import Register from '../components/Register.vue';
import StoreCredentials from '../components/StoreCredentials.vue';
import {toRaw} from 'vue';

const {prettify} = helpers;

export default {
  name: 'ChapiStorePage',
  components: {Register, StoreCredentials, Problem, Login, Next},
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {
      error: undefined,
      verifiableCredential: [],
      presentation: null,
      loading: true,
      holder: '',
      display: 'login',
      registering: false,
      storageChecked: false
    };
  },
  async created() {
    this.storageChecked = false;
    // FIXME: remove all usage of storage access API
    if(typeof document.hasStorageAccess === 'function') {
      const hasStorageAccess = await document.hasStorageAccess();
      if(!hasStorageAccess) {
        this.display = 'initial';
      }
    }
    this.storageChecked = true;
    this.loading = true;
    const self = this;
    const event = await receiveCredentialEvent();
    console.log('credential store event', event);
    let exchange;
    try {
      // start exchange
      exchange = await exchanges.start({event});
      const {value, done} = await exchange.next();
      if(!done) {
        // FIXME: implement
        throw new Error('Multi-step exchange not implemented.');
      }
      if(!value?.verifiablePresentation) {
        throw new Error(
          'No verifiable presentation with content to store found.');
      }
      this.presentation = value.verifiablePresentation;
      this.holder = this.presentation.holder;
      const {verifiableCredential} = this.presentation;
      if(!verifiableCredential) {
        this.verifiableCredential = [];
      } else if(!Array.isArray(verifiableCredential)) {
        this.verifiableCredential = [verifiableCredential];
      } else {
        this.verifiableCredential = verifiableCredential;
      }
    } catch(e) {
      console.error(e);
      this.error = e;
      return;
    } finally {
      this.loading = false;
      if(exchange) {
        self._store = () => exchange.close();
        self._cancel = () => exchange.cancel();
        self._error = error => exchange.close({error});
      } else {
        event.respondWith(new Promise((resolve, reject) => {
          self._error = err => reject(err);
        }));
      }
    }
  },
  methods: {
    setDisplay(display) {
      this.display = display;
      this.registering = display === 'register';
    },
    async register() {
      this.display = 'login';
      this.registering = false;
    },
    async store({holder, verifiableCredential}) {
      holder = toRaw(holder);
      verifiableCredential = toRaw(verifiableCredential);

      this.loading = true;
      try {
        if(!this.presentation) {
          throw new Error('VerifiablePresentation not set.');
        }

        const credentialStore = await getCredentialStore({
          // FIXME: determine how password will be provided / set; currently
          // set to `profileId`
          profileId: holder, password: holder
        });
        await credentialStore.add({credentials: verifiableCredential});

        const presentation = {
          ...toRaw(this.presentation),
          verifiableCredential
        };
        this._store({presentation});
      } catch(e) {
        if(e.name === 'DuplicateError') {
          this.$q.notify({
            type: 'negative',
            message: 'Failed to store duplicate credential(s).'
          });
        }
        const error = new Error('Credential storage failed.');
        error.name = 'StorageError';
        error.details = e;
        console.log('storage error(s): ', prettify(e, null, 2));
        this.error = error;
      } finally {
        this.loading = false;
      }
    },
    cancel(error) {
      if(error) {
        return this._error(error);
      }
      this._cancel();
    }
  }
};
</script>

<style scoped>
</style>
