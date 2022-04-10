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
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {getCredentialStore, helpers, validator} from '@bedrock/web-wallet';
import Login from '../components/Login.vue';
import Next from '../components/Next.vue';
import Problem from '../components/Problem.vue';
import {receiveCredentialEvent} from 'web-credential-handler';
import Register from '../components/Register.vue';
import StoreCredentials from '../components/StoreCredentials.vue';

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
    const presentation = event.credential.data;
    console.log('incoming presentation: ', prettify(presentation, null, 2));
    try {
      validator.validate({
        type: 'VerifiablePresentation',
        doc: presentation
      });
      this.presentation = presentation;
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
      let error;
      if(e.message === 'Proof "type" is not supported.') {
        error = new Error('This credential is not compatible with this ' +
          'wallet.');
      } else {
        error = new Error('Credential request failed validation.');
      }
      error.name = 'ValidationError';
      error.details = e.message;
      this.error = error;
      return;
    } finally {
      this.loading = false;
      // TODO: implement
      event.respondWith(new Promise((resolve, reject) => {
        self._store = () => resolve({
          dataType: 'VerifiablePresentation',
          data: self.presentation
        });
        self._cancel = () => resolve(null);
        self._error = err => reject(err);
      }));
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

        this._store();
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
