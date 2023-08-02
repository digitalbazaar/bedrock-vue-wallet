<template>
  <div
    v-if="ready"
    class="row justify-center">
    <q-inner-loading :showing="loading">
      <q-spinner-tail
        size="5em"
        color="primary" />
    </q-inner-loading>
    <div
      v-if="userLoggedIn"
      class="column" style="max-width: 500px">
      <div v-if="requestOrigin">
        <chapi-header
          :name="relyingPartyName"
          :image="relyingPartyImage" />
        <q-separator class="s-separator" />
      </div>
      <problem
        v-if="error"
        :account="account"
        :loading="loading"
        :error="error"
        @cancel="$event.waitUntil(cancel(error))" />
      <share-credentials
        v-else-if="!loading && display === 'share'"
        :query="query"
        :request-origin="requestOrigin"
        @cancel="$event.waitUntil(cancel())"
        @share="$event.waitUntil(share($event.presentation))" />
      <store-credentials
        v-else-if="!loading && display === 'store'"
        :account="account"
        :holder="holder"
        :verifiable-credential="verifiableCredential"
        @cancel="$event.waitUntil(cancel())"
        @store="$event.waitUntil(store($event))" />
    </div>
    <div
      v-else-if="!loading"
      class="full-width q-pa-md"
      style="max-width: 500px">
      <login
        v-if="display === 'login'"
        @register="setDisplay('register')" />
      <register
        v-if="display === 'register'"
        @login="setDisplay('login')"
        @register="$event.waitUntil(register())" />
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {exchanges, getCredentialStore, helpers} from '@bedrock/web-wallet';
import {computed, ref, toRaw} from 'vue';
import {computedAsync} from '@vueuse/core';
import ChapiHeader from '../components/ChapiHeader.vue';
import Login from '../components/Login.vue';
import Problem from '../components/Problem.vue';
import {receiveCredentialEvent} from 'web-credential-handler';
import Register from '../components/Register.vue';
import {session} from '@bedrock/web-session';
import ShareCredentials from '../components/ShareCredentials.vue';
import StoreCredentials from '../components/StoreCredentials.vue';
import {WebAppManifestClient} from '@digitalbazaar/web-app-manifest-utils';

const manifestClient = new WebAppManifestClient();

const {prettify} = helpers;

export default {
  name: 'ChapiExchangePage',
  components: {
    ChapiHeader, Login, Problem, Register, ShareCredentials, StoreCredentials
  },
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  setup() {
    const requestOrigin = ref('');

    const relyingPartyManifestUpdating = ref(true);
    const relyingPartyManifest = computedAsync(async () => {
      try {
        const {value: origin} = requestOrigin;
        if(origin) {
          return await manifestClient.getManifest({origin});
        }
      } catch(e) {
        console.error(e);
        return undefined;
      }
    }, undefined, relyingPartyManifestUpdating);

    const relyingPartyIcon = computedAsync(async () => {
      const {value: manifest} = relyingPartyManifest;
      const {value: origin} = requestOrigin;
      if(!(manifest && origin)) {
        return '';
      }
      const icon = await manifestClient.getManifestIcon(
        {size: 64, manifest, origin});
      return icon ? icon.src : '';
    }, '');

    const relyingPartyFavicon = computed(
      () => `${requestOrigin.value}/favicon.ico`);
    const relyingPartyImage = computed(
      () => relyingPartyIcon.value || relyingPartyFavicon.value);
    const relyingPartyName = computed(
      () => relyingPartyManifest.value?.name || requestOrigin.value);

    const exchanging = ref(false);
    const storing = ref(false);
    const ready = ref(false);

    const loading = computed(() =>
      !ready.value ||
      relyingPartyManifestUpdating.value ||
      exchanging.value ||
      storing.value);

    return {
      exchanging, loading, ready, relyingPartyImage, relyingPartyName,
      requestOrigin, storing
    };
  },
  // FIXME: convert to `setup()`
  data() {
    return {
      // FIXME: clean up
      //acceptedProofTypes: undefined,
      display: 'login',
      error: undefined,
      holder: '',
      query: undefined,
      registering: false,
      removeSessionListener: undefined,
      resolveYield: undefined,
      verifiableCredential: [],
      verifiablePresentation: undefined
    };
  },
  created() {
    this.userLoggedIn = !!this.account;
    this.removeSessionListener = session.on('change', ({newData = {}}) => {
      this.userLoggedIn = !!newData.account;
    });
    this.handleCredentialEvent().finally(() => {
      this.ready = true;
    });
  },
  async beforeUnmount() {
    // clean up session listener
    this.removeSessionListener();
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
    async share(presentation) {
      this.verifiablePresentation = presentation;
      this.continue();
    },
    async store({holder, verifiableCredential}) {
      holder = toRaw(holder);
      verifiableCredential = toRaw(verifiableCredential);

      this.storing = true;
      try {
        const credentialStore = await getCredentialStore({
          // FIXME: determine how password will be provided / set; currently
          // set to `profileId`
          profileId: holder, password: holder
        });
        await credentialStore.add({credentials: verifiableCredential});
        this.continue();
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
        this.storing = false;
      }
    },
    cancel(error) {
      // FIXME: perhaps set a flag to cancel and then call `continue` instead,
      // allowing `_exchange` to be scoped only to `handleCredentialEvent`
      error ? this._exchange.close({error}) : this._exchange.cancel();
    },
    async yield() {
      await new Promise(r => this.resolveYield = r);
    },
    continue() {
      this.resolveYield();
    },
    async handleCredentialEvent() {
      const event = await receiveCredentialEvent();
      console.log('CHAPI event received', event);
      this.requestOrigin = event.credentialRequestOrigin;

      // as the exchange happens, pass resulting VPs and VPRs to components
      // that handle either share or store, showing first the `store` component
      // and then the `share` component ... for each round of the exchange
      try {
        // start exchange
        this._exchange = await exchanges.start({event});
        this.ready = true;

        while(true) {
          const options = {};
          if(this.verifiablePresentation) {
            options.verifiablePresentation = toRaw(this.verifiablePresentation);
          }
          this.exchanging = true;
          const {value, done} = await this._exchange.next(options);
          this.exchanging = false;

          // clear share-related state
          this.query = undefined;
          this.verifiablePresentation = undefined;

          if(value?.verifiablePresentation) {
            // user must approve store...
            this.setDisplay('store');

            // set store-related state
            const {verifiablePresentation: presentation} = value;
            this.holder = presentation.holder;
            const {verifiableCredential} = presentation;
            if(!verifiableCredential) {
              this.verifiableCredential = [];
            } else if(!Array.isArray(verifiableCredential)) {
              this.verifiableCredential = [verifiableCredential];
            } else {
              this.verifiableCredential = verifiableCredential;
            }

            await this.yield();

            // clear store-related state
            this.verifiableCredential = [];
            this.holder = '';
          }
          if(value?.verifiablePresentationRequest) {
            // user must approve share...
            this.setDisplay('share');

            // set share-related state
            this.query = value.verifiablePresentationRequest.query;

            await this.yield();
          }

          if(done) {
            // exchange is finished
            this._exchange.close();
            break;
          }
        }
      } catch(e) {
        console.error(e);
        this.error = e;
        return;
      } finally {
        this.ready = true;
        this.exchanging = false;
        // no exchange created; just reject event once user cancels
        if(!this._exchange) {
          event.respondWith(new Promise((resolve, reject) => {
            this.cancel = err => reject(err);
          }));
        }
      }
    }
  }
};
</script>

<style scoped>
.s-separator {
  background: rgba(157, 157, 157, 0.75);
}
</style>
