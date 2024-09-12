<template>
  <q-page class="row justify-center q-pa-md">
    <div class="col-md-9 col-xs-12">
      <!-- Scanner -->
      <div
        v-if="!result && enableScanning"
        class="full-width">
        <BarcodeScanner
          v-if="enableScanning"
          tip-text="Scan a barcode containing a credential"
          :formats-to-support="supportedFormats"
          @close="closeScanner"
          @result="handleScan" />
      </div>

      <!-- UI Workflow -->
      <div
        v-if="ready"
        class="row justify-center">
        <q-inner-loading :showing="loading">
          <q-spinner-tail
            size="5em"
            color="primary" />
        </q-inner-loading>
        <div
          class="column"
          style="max-width: 500px">
          <div v-if="requestOrigin">
            <chapi-header
              :name="relyingPartyName"
              :image="relyingPartyImage"
              :request="relyingPartyRequest" />
            <q-separator class="q-my-md" />
          </div>
          <problem-card
            v-if="error"
            :error="error"
            :account="account"
            :loading="loading"
            @cancel="$event.waitUntil(cancel(error))" />
          <share-credentials
            v-else-if="!loading && display === 'share'"
            :verifiable-presentation-request="verifiablePresentationRequest"
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
      </div>
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */

import {computed, ref, toRaw} from 'vue';
import {exchanges, getCredentialStore, helpers} from '@bedrock/web-wallet';
import BarcodeScanner from '../components/BarcodeScanner.vue';
import ChapiHeader from '../components/ChapiHeader.vue';
import {Html5QrcodeSupportedFormats} from 'html5-qrcode';
import {httpClient} from '@digitalbazaar/http-client';
import ProblemCard from '../components/ProblemCard.vue';
import {sessionDataRef} from '../lib/session.js';
import ShareCredentials from '../components/ShareCredentials.vue';
import StoreCredentials from '../components/StoreCredentials.vue';
import {useQuasar} from 'quasar';
import {useRouter} from 'vue-router';
import {WebAppManifestClient} from '@digitalbazaar/web-app-manifest-utils';

export default {
  name: 'WalletScanner',
  components: {
    ChapiHeader,
    ProblemCard,
    BarcodeScanner,
    ShareCredentials,
    StoreCredentials
  },
  setup() {
    // constants
    const {prettify} = helpers;
    const manifestClient = new WebAppManifestClient();
    const supportedFormats = [Html5QrcodeSupportedFormats.QR_CODE];

    // refs
    const holder = ref('');
    const ready = ref(null);
    const error = ref(null);
    const reject = ref(null);
    const result = ref(null);
    const exchange = ref(null);
    const storing = ref(false);
    const display = ref('login');
    const exchanging = ref(false);
    const registering = ref(false);
    const enableScanning = ref(true);
    const verifiableCredential = ref([]);
    const verifiablePresentation = ref();
    const credentialRequestOrigin = ref('');
    const verifiablePresentationRequest = ref();

    const loading = computed(() => {
      return !ready.value || exchanging.value || storing.value;
    });

    const account = computed(() => sessionDataRef.value?.account?.id ?? '');

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
          if(verifiablePresentationRequest.value?.query?.type ===
            'DIDAuthentication') {
            return 'would like you to authenticate';
          }
          return 'would like some information from you';
        }
        return 'would like to interact with you';
      });

    // utils for waiting for user interaction
    let resume;
    const wait = async () => new Promise(r => resume = r);

    // Use functions
    const $q = useQuasar();
    const router = useRouter();

    // helper functions
    function closeScanner() {
      router.push('/');
    }

    function cancel(error) {
      if(reject.value) {
        reject(error);
      } else if(error) {
        exchange?.value?.close({error});
      } else {
        exchange?.value?.cancel();
      }
      closeScanner();
    }

    async function handleScan({type, text}) {
      enableScanning.value = false;
      credentialRequestOrigin.value = new URL(text).origin;
      if(type === 'QR_CODE') {
        await handleQrCode({text, type});
      }
    }

    async function handleQrCode({text, type}) {
      try {
        ready.value = true;
        error.value = null;
        let protocols;
        const isHttpRequest = text.includes('https://');
        const isOpenId = text.includes('openid-credential-offer');
        if(isHttpRequest) {
          const {data} = await httpClient.post(text, {json: {}});
          protocols = data.protocols;
        } else if(isOpenId) {
          protocols = {oid4vci: text};
        }
        if(!protocols) {
          throw new Error('Unable to handle scanned QR code.');
        }
        const event = {
          credential: {options: {protocols}},
          credentialRequestOptions: {web: {protocols}},
          type: 'credentialrequest'
        };
        const promise = new Promise(res => event.respondWith = res);
        result.value = {type, text, event};
        await handleCredentialEvent({event});
        await promise;
      } catch(e) {
        console.error(e);
        error.value = e;
      }
    }

    async function handleCredentialEvent({event}) {
      // process relying party origin prior to indicating `ready` to create
      // a smooth loading experience
      await processRelyingPartyOrigin({origin: credentialRequestOrigin.value});
      // as the exchange happens, pass resulting VPs and VPRs to components
      // that handle either share or store, showing first the `store` component
      // and then the `share` component ... for each round of the exchange
      try {
        // start exchange
        exchange.value = await exchanges.start({event});
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
          const {value, done} = await exchange.value.next(options);
          exchanging.value = false;
          // clear share-related state
          verifiablePresentationRequest.value = undefined;
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
            verifiablePresentationRequest.value =
              value.verifiablePresentationRequest;
            await wait();
            actionTaken = true;
          }
          // if no action was taken then nothing actionable was in in `value`
          // (no VPR, no VP / empty VP); so set an error condition and `wait()`
          // to let the user see something went wrong
          if(!actionTaken) {
            const e = new Error('Nothing was received or requested.');
            e.name = 'OperationError';
            await wait();
            throw e;
          }
          if(done) {
            // exchange is finished
            exchange.value.close();
            $q.notify({
              type: 'positive',
              message: 'Successfully stored credential',
            });
            router.push({name: 'home'});
            break;
          }
        }
      } catch(e) {
        console.error(e);
        error.value = e;
      } finally {
        // ready.value = false;
        exchanging.value = false;
        // no exchange created; just reject event once user cancels
        if(!exchange.value) {
          event.respondWith(new Promise((res, rej) => {
            reject.value = rej;
          }));
        }
      }
    }

    async function processRelyingPartyOrigin({origin}) {
      requestOrigin.value = origin;
      relyingPartyManifest.value = await getManifest(origin);
      relyingPartyIcon.value = await getManifestIcon();
    }

    async function getManifest(origin) {
      try {
        if(origin) {
          return await manifestClient.getManifest({origin});
        }
      } catch(e) {
        console.error(e);
        return;
      }
    }

    async function getManifestIcon() {
      const {value: manifest} = relyingPartyManifest;
      const {value: origin} = requestOrigin;
      if(!(manifest && origin)) {
        return '';
      }
      const icon = await manifestClient.getManifestIcon(
        {size: 64, manifest, origin});
      return icon ? icon.src : '';
    }

    function setDisplay(value) {
      display.value = value;
      registering.value = value === 'register';
    }

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
        error.name = 'OperationError';
        error.details = e;
        console.log('storage error(s): ', prettify(e, null, 2));
        error.value = error;
      } finally {
        storing.value = false;
      }
    };

    const share = async presentation => {
      verifiablePresentation.value = toRaw(presentation);
      resume();
    };

    return {
      share,
      error,
      store,
      ready,
      result,
      holder,
      cancel,
      account,
      display,
      loading,
      handleScan,
      closeScanner,
      requestOrigin,
      enableScanning,
      supportedFormats,
      relyingPartyName,
      relyingPartyImage,
      relyingPartyRequest,
      verifiableCredential,
      verifiablePresentationRequest
    };
  }
};
</script>

<style lang="scss" scoped>
.s-separator {
  background: rgba(157, 157, 157, 0.75);
}
</style>
