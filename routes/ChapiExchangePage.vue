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
      class="column"
      style="max-width: 500px">
      <div v-if="requestOrigin">
        <chapi-header
          :name="relyingPartyName"
          :image="relyingPartyImage"
          :request="relyingPartyRequest" />
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
        @login="$event.waitUntil(login())"
        @register="setDisplay('register')" />
      <register
        v-if="display === 'register'"
        @login="setDisplay('login')"
        @register="$event.waitUntil(login())" />
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref, toRaw, toRef} from 'vue';
import {
  exchanges, getCredentialStore, helpers, profileManager
} from '@bedrock/web-wallet';
import ChapiHeader from '../components/ChapiHeader.vue';
import Login from '../components/Login.vue';
import Problem from '../components/Problem.vue';
import {receiveCredentialEvent} from 'web-credential-handler';
import Register from '../components/Register.vue';
import ShareCredentials from '../components/ShareCredentials.vue';
import StoreCredentials from '../components/StoreCredentials.vue';
import {useQuasar} from 'quasar';
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
  setup(props) {
    const $q = useQuasar();

    const display = ref('login');
    const error = ref();
    const exchanging = ref(false);
    const holder = ref('');
    const query = ref();
    const ready = ref(false);
    const registering = ref(false);
    const storing = ref(false);
    const verifiableCredential = ref([]);
    const verifiablePresentation = ref();

    const loading = computed(() =>
      !ready.value ||
      exchanging.value ||
      storing.value);

    const setDisplay = value => {
      display.value = value;
      registering.value = value === 'register';
    };

    // utils for waiting for user interaction
    let resume;
    const wait = async () => new Promise(r => resume = r);

    // track user logged in status
    const account = toRef(props, 'account');
    const userLoggedIn = ref(!!account.value);
    const login = async () => {
      // ensure profiles are reloaded after login
      await profileManager.getProfiles({useCache: false});
      userLoggedIn.value = true;
      resume?.();
    };

    // relying party origin processing
    const requestOrigin = ref('');
    const relyingPartyManifest = ref();
    const relyingPartyIcon = ref('');
    const relyingPartyFavicon = computed(
      () => `${requestOrigin.value}/favicon.ico`);
    const relyingPartyImage = computed(
      () => relyingPartyIcon.value || relyingPartyFavicon.value);
    const relyingPartyName = computed(
      () => relyingPartyManifest.value?.name || requestOrigin.value);
    const relyingPartyRequest = computed(
      () => {
        if(display.value === 'store') {
          return 'has something for you';
        } else if(display.value === 'share') {
          if(query.value?.type === 'DIDAuthentication') {
            return 'would like you to authenticate';
          }
          return 'would like some information from you';
        }
        return 'would like to interact with you';
      });
    const getManifest = async origin => {
      try {
        if(origin) {
          return await manifestClient.getManifest({origin});
        }
      } catch(e) {
        console.error(e);
        return;
      }
    };
    const getManifestIcon = async () => {
      const {value: manifest} = relyingPartyManifest;
      const {value: origin} = requestOrigin;
      if(!(manifest && origin)) {
        return '';
      }
      const icon = await manifestClient.getManifestIcon(
        {size: 64, manifest, origin});
      return icon ? icon.src : '';
    };
    const processRelyingPartyOrigin = async ({origin}) => {
      requestOrigin.value = origin;
      relyingPartyManifest.value = await getManifest(origin);
      relyingPartyIcon.value = await getManifestIcon();
    };

    // exchange processing
    let exchange;
    let reject;
    const cancel = error => reject ?
      reject(error) :
      error ? exchange.close({error}) : exchange.cancel();

    const share = async presentation => {
      verifiablePresentation.value = toRaw(presentation);
      resume();
    };
    const store = async ({holder, verifiableCredential}) => {
      holder = toRaw(holder);
      verifiableCredential = toRaw(verifiableCredential);

      storing.value = true;
      try {
        const credentialStore = await getCredentialStore({
          // FIXME: determine how password will be provided / set; currently
          // set to `profileId`
          profileId: holder, password: holder
        });
        await credentialStore.add({credentials: verifiableCredential});
        resume();
      } catch(e) {
        if(e.name === 'DuplicateError') {
          $q.notify({
            type: 'negative',
            message: 'Failed to store duplicate credential(s).'
          });
        }
        const error = new Error('Credential storage failed.');
        error.name = 'StorageError';
        error.details = e;
        console.log('storage error(s): ', prettify(e, null, 2));
        error.value = error;
      } finally {
        storing.value = false;
      }
    };

    const handleCredentialEvent = async () => {
      const event = await receiveCredentialEvent();
      console.log('CHAPI event received', event);

      // process relying party origin prior to indicating `ready` to create
      // a smooth loading experience
      await processRelyingPartyOrigin({origin: event.credentialRequestOrigin});

      // as the exchange happens, pass resulting VPs and VPRs to components
      // that handle either share or store, showing first the `store` component
      // and then the `share` component ... for each round of the exchange
      try {
        // start exchange
        exchange = await exchanges.start({event});
        ready.value = true;

        // wait for user to be logged in
        if(!userLoggedIn.value) {
          await wait();
        }

        let actionTaken = false;
        while(true) {
          const options = {};
          if(verifiablePresentation.value) {
            options.verifiablePresentation = toRaw(
              verifiablePresentation.value);
            if(options.verifiablePresentation.holder) {
              // FIXME: enable setting of other sign options such as
              // cryptosuite / VM to use
              options.signOptions = {
                profileId: options.verifiablePresentation.holder
              };
            }
          }
          exchanging.value = true;
          const {value, done} = await exchange.next(options);
          exchanging.value = false;

          // clear share-related state
          query.value = undefined;
          verifiablePresentation.value = undefined;

          if(value?.verifiablePresentation) {
            // set store-related state
            const {verifiablePresentation: presentation} = value;
            holder.value = presentation.holder;
            const {verifiableCredential: credentials} = presentation;
            if(!credentials) {
              verifiableCredential.value = [];
            } else if(!Array.isArray(credentials)) {
              verifiableCredential.value = [credentials];
            } else {
              verifiableCredential.value = credentials;
            }

            // if there is something to store, wait for user to approve storage
            // FIXME: enable storage of capabilities as well
            if(verifiableCredential.value.length > 0) {
              // user must approve store...
              setDisplay('store');

              await wait();
              actionTaken = true;
            }

            // clear store-related state
            verifiableCredential.value = [];
            holder.value = '';
          }
          if(value?.verifiablePresentationRequest) {
            // user must approve share...
            setDisplay('share');

            // set share-related state
            query.value = value.verifiablePresentationRequest.query;

            await wait();
            actionTaken = true;
          }

          // if no action was taken then nothing actionable was in in `value`
          // (no VPR, no VP / empty VP); so set an error condition and `wait()`
          // to let the user see something went wrong
          if(!actionTaken) {
            const e = new Error('Nothing was received or requested.');
            e.name = 'OperationError';
            error.value = e;
            await wait();
            throw e;
          }

          if(done) {
            // exchange is finished
            exchange.close();
            break;
          }
        }
      } catch(e) {
        console.error(e);
        error.value = e;
        return;
      } finally {
        ready.value = true;
        exchanging.value = false;
        // no exchange created; just reject event once user cancels
        if(!exchange) {
          event.respondWith(new Promise((res, rej) => {
            reject = rej;
          }));
        }
      }
    };

    // start processing any CHAPI event
    handleCredentialEvent().finally(() => ready.value = true);

    return {
      cancel, display, error, exchanging, holder,
      loading, login, query, ready,
      relyingPartyImage, relyingPartyName, relyingPartyRequest,
      registering, requestOrigin, setDisplay,
      share, store, storing, userLoggedIn, verifiableCredential
    };
  }
};
</script>

<style scoped>
.s-separator {
  background: rgba(157, 157, 157, 0.75);
}
</style>
