<template>
  <div
    v-if="ready"
    class="row justify-center">
    <!-- a configured page shows its own progress -->
    <q-inner-loading :showing="loading && !exchangePageComponent">
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
      <problem-card
        v-if="error"
        :account="account"
        :loading="loading"
        :error="error"
        @cancel="$event.waitUntil(cancel(error))" />
      <!-- a configured page replaces the store and share screens; it stays
        mounted from the offer through the request, so it is not keyed -->
      <component
        :is="exchangePageComponent"
        v-else-if="exchangePageComponent &&
          (display === 'store' || display === 'share')"
        :account="account"
        :display="display"
        :holder="holder"
        :verifiable-credential="verifiableCredential"
        :verifiable-presentation-request="verifiablePresentationRequest"
        :request-origin="requestOrigin"
        @cancel="$event.waitUntil(cancel())"
        @share="$event.waitUntil(share($event))"
        @store="$event.waitUntil(store($event))" />
      <share-credentials
        v-else-if="!loading && display === 'share' &&
          verifiablePresentationRequest"
        :key="shareRound"
        :verifiable-presentation-request="verifiablePresentationRequest"
        :request-origin="requestOrigin"
        @cancel="$event.waitUntil(cancel())"
        @obtain="$event.waitUntil(obtain($event))"
        @share="$event.waitUntil(share($event))" />
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
      <login-form
        v-if="display === 'login'"
        @login="$event.waitUntil(login())"
        @register="setDisplay('register')" />
      <register-form
        v-if="display === 'register'"
        @login="setDisplay('login')"
        @register="$event.waitUntil(login())" />
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2026 Digital Bazaar, Inc.
 */
import {
  computed, defineAsyncComponent, ref, shallowRef, toRaw, toRef
} from 'vue';
import {
  envelopes, exchanges, getCredentialStore, helpers,
  presentations, profileManager
} from '@bedrock/web-wallet';
import ChapiHeader from '../components/ChapiHeader.vue';
import {config} from '@bedrock/web';
import {getExchangePage} from '../lib/useCredentialCardConfig.js';
import LoginForm from '../components/LoginForm.vue';
import ProblemCard from '../components/ProblemCard.vue';
import {receiveCredentialEvent} from 'web-credential-handler';
import RegisterForm from '../components/RegisterForm.vue';
import ShareCredentials from '../components/ShareCredentials.vue';
import StoreCredentials from '../components/StoreCredentials.vue';
import {useQuasar} from 'quasar';
import {WebAppManifestClient} from '@digitalbazaar/web-app-manifest-utils';

const manifestClient = new WebAppManifestClient();
// interactions one "obtain" may chain through by redirect
const MAX_NESTED_INTERACTIONS = 5;

const {prettify} = helpers;

export default {
  name: 'ChapiExchangePage',
  components: {
    ChapiHeader,
    LoginForm,
    ProblemCard,
    RegisterForm,
    ShareCredentials,
    StoreCredentials
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
    const ready = ref(false);
    const registering = ref(false);
    const storing = ref(false);
    const verifiableCredential = ref([]);
    const verifiablePresentation = ref();
    const verifiablePresentationRequest = ref();
    // changes for each share screen so it renders fresh
    const shareRound = ref(0);
    // a configured page that replaces the store and share screens
    const exchangePage = shallowRef();
    const exchangePageComponent = shallowRef();

    let credentialRecords;

    const loading = computed(() =>
      !ready.value ||
      exchanging.value ||
      storing.value);

    const setDisplay = value => {
      display.value = value;
      registering.value = value === 'register';
    };

    // presentation signing options
    let signOptions;

    // utils for waiting for user interaction
    let resume;
    let abort;
    const wait = async () => new Promise((resolve, reject) => {
      resume = resolve;
      abort = reject;
    });

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
        if(exchangePage.value?.request) {
          return exchangePage.value.request;
        }
        if(display.value === 'store') {
          return 'has something for you';
        } else if(display.value === 'share') {
          if(verifiablePresentationRequest.value?.query?.type ===
            'DIDAuthentication') {
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
    // an exchange run to obtain a credential for `exchange`
    let nested;
    let reject;
    const cancel = error => {
      // cancelling a nested exchange returns to the outer one
      if(nested) {
        nested.cancel();
        const e = new Error('Nested exchange cancelled.');
        e.name = 'AbortError';
        return abort(e);
      }
      return reject ?
        reject(error) :
        error ? exchange.close({error}) : exchange.cancel();
    };

    const share = async ({
      presentation, profileId, authnOption, verifiablePresentationRequest
    }) => {
      verifiablePresentation.value = toRaw(presentation);
      if(authnOption) {
        signOptions = await presentations.createSignOptions({
          profileId, authnOption, verifiablePresentationRequest
        });
        verifiablePresentation.value.holder = signOptions.controller;
      }
      resume();
    };
    const store = async ({profileId, verifiableCredential}) => {
      profileId = toRaw(profileId);

      // filter by credentials chosen for storage
      const credentialSet = new Set(toRaw(verifiableCredential));
      credentialRecords = credentialRecords.filter(
        record => credentialSet.has(record.credential));

      storing.value = true;
      try {
        const credentialStore = await getCredentialStore({
          // FIXME: determine how password will be provided / set; currently
          // set to `profileId`
          profileId, password: profileId
        });
        await credentialStore.add({records: credentialRecords});
        resume();
      } catch(e) {
        if(e.name === 'DuplicateError') {
          $q.notify({
            type: 'negative',
            message: 'Failed to store duplicate credential(s).'
          });
        }
        const error = new Error('Credential storage failed.');
        error.name = 'OperationError';
        error.details = e;
        console.log('storage error(s): ', e, prettify(e, null, 2));
        error.value = error;
      } finally {
        storing.value = false;
      }
    };

    // the first offer may pick a configured page for the whole exchange
    const selectExchangePage = ({credentials}) => {
      const page = getExchangePage({
        credentials, exchangePages: config.vueWallet?.exchangePages
      });
      if(page) {
        exchangePage.value = page;
        exchangePageComponent.value = defineAsyncComponent(page.component);
      }
    };

    // steps through an exchange, showing the store and share screens it
    // needs; resolves to the exchange's final `redirectUrl`, if any
    const runExchange = async ({exchange, allowPage = false}) => {
      let actionTaken = false;
      while(true) {
        const options = {};
        if(verifiablePresentation.value) {
          options.verifiablePresentation = toRaw(
            verifiablePresentation.value);
          options.signOptions = signOptions;
        }
        exchanging.value = true;
        const {value, done} = await exchange.next(options);
        exchanging.value = false;

        // clear share-related state, modulo `signOptions` which includes
        // might include information that needs to be stored
        verifiablePresentationRequest.value = undefined;
        verifiablePresentation.value = undefined;

        if(value?.verifiablePresentation) {
          // set store-related state
          const {verifiablePresentation: presentation} = value;
          holder.value = presentation.holder ?? '';
          let credentials = presentation.verifiableCredential;
          if(!credentials) {
            credentials = [];
          } else if(!Array.isArray(credentials)) {
            credentials = [credentials];
          }

          // create credential records
          let meta;
          if(signOptions?.newConfidenceMethod) {
            // FIXME: if share/authentication purpose for
            // `newConfidenceMethod` is for VC-2FA then it can be stored with
            // received VC(s), but if for another purpose, it needs to be
            // stored elsewhere or it won't be reusable
            const {id, type, multikey, jwk} = signOptions.newConfidenceMethod;
            meta = {
              // 2FA confidence methods; add first one
              confidenceMethods: [{id, type, multikey, jwk}]
            };
          }
          credentialRecords = await Promise.all(
            credentials.map(credential => {
              if(credential?.type !== 'EnvelopedVerifiableCredential') {
                return {credential, meta};
              }
              return envelopes.transformEnvelopedCredential({
                credential, meta
              });
            }));

          // use transformed VCs in display
          verifiableCredential.value = credentialRecords.map(
            ({credential}) => credential);

          if(allowPage && !exchangePage.value) {
            selectExchangePage({credentials: verifiableCredential.value});
          }
          // a configured page handles the offer and the request as one
          // screen, so it gets the request alongside the offer
          if(exchangePage.value) {
            verifiablePresentationRequest.value =
              value.verifiablePresentationRequest;
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

        const nonEmptyVpr = Object.keys(
          value?.verifiablePresentationRequest ?? {}).length > 0;
        if(nonEmptyVpr) {
          // user must approve share...
          setDisplay('share');

          // set share-related state
          verifiablePresentationRequest.value =
            value.verifiablePresentationRequest;
          shareRound.value++;

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
          return {redirectUrl: value?.redirectUrl};
        }
      }
    };

    // runs another exchange to obtain a credential the current request asks
    // for, then returns to the current request
    const obtain = async ({interactionUrl}) => {
      const outer = {
        resume, abort,
        requestOrigin: requestOrigin.value,
        verifiablePresentationRequest: verifiablePresentationRequest.value
      };
      try {
        // a redirect to another interaction URL continues the interaction
        // (e.g., from presenting credentials to receiving the issued one)
        let url = interactionUrl;
        for(let i = 0; url && i < MAX_NESTED_INTERACTIONS; ++i) {
          const interaction = await exchanges.createClientInteractionFromUrl({
            interactionUrl: url
          });
          // show who is asking on the nested screens
          await processRelyingPartyOrigin({origin: interaction.origin});
          nested = await exchanges.start({interaction});
          const {redirectUrl} = await runExchange({exchange: nested});
          url = exchanges.isInteractionUrl({url: redirectUrl}) ?
            redirectUrl : null;
        }
      } catch(e) {
        if(e.name !== 'AbortError') {
          console.error(e);
          $q.notify({
            type: 'negative',
            message: `Could not obtain credential: ${e.message}`
          });
        }
      } finally {
        nested = undefined;
        exchanging.value = false;
        error.value = undefined;
        // the nested exchange's signing state must not reach the outer share
        signOptions = undefined;
        verifiablePresentation.value = undefined;
        ({resume, abort} = outer);
        await processRelyingPartyOrigin({origin: outer.requestOrigin});
        verifiablePresentationRequest.value =
          outer.verifiablePresentationRequest;
        setDisplay('share');
        shareRound.value++;
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

        await runExchange({exchange, allowPage: true});

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
      cancel, display, error, exchangePageComponent, exchanging, holder,
      loading, login, obtain, ready,
      relyingPartyImage, relyingPartyName, relyingPartyRequest,
      registering, requestOrigin, setDisplay, shareRound,
      share, store, storing, userLoggedIn, verifiableCredential,
      verifiablePresentationRequest
    };
  }
};
</script>

<style scoped>
.s-separator {
  background: rgba(157, 157, 157, 0.75);
}
</style>
