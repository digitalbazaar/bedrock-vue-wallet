<template>
  <div>
    <div
      v-if="ready && !registering"
      v-show="query"
      class="row justify-center">
      <share
        v-if="!error"
        :query="query"
        :request-origin="requestOrigin"
        @cancel="$event.waitUntil(cancel())"
        @share="$event.waitUntil(share($event.presentation))" />
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
          @login="setDisplay('login')"
          @next="setDisplay('next')" />
        <next
          v-if="display === 'initial'"
          display="initial-share"
          title="You are about to store some credentials"
          text="Please continue to the next step in order to select a profile
            to authenticate with."
          error-message="There was a problem logging into your account."
          @login="setDisplay('login')"
          @next="setDisplay('next')" />
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {cryptoSuites, helpers, presentations} from 'bedrock-web-wallet';
import Login from '../components/Login.vue';
import Problem from '../components/Problem.vue';
import Next from '../components/Next.vue';
import {receiveCredentialEvent} from 'web-credential-handler';
import Register from '../components/Register.vue';
import {session} from 'bedrock-web-session';
import Share from '../components/Share.vue';

const {prettify} = helpers;

export default {
  name: 'ChapiSharePage',
  components: {Register, Share, Login, Next, Problem},
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {
      loading: true,
      error: undefined,
      challenge: undefined,
      domain: undefined,
      acceptedProofTypes: undefined,
      ready: false,
      query: undefined,
      removeSessionListener: undefined,
      requestOrigin: '',
      display: 'login',
      registering: false,
      storageChecked: false
    };
  },
  computed: {
    // FIXME: update to zcap or RAR query
    hasOcapQuery() {
      const type = 'OcapLdQuery';
      if(!this.query) {
        return false;
      }
      if(Array.isArray(this.query)) {
        const ocapQuery = this.query.filter(query => query.type === type);
        return ocapQuery.length > 0;
      }
      return this.query.type === type;
    }
  },
  async created() {
    this.loading = true;
    this.storageChecked = false;
    if(typeof document.hasStorageAccess === 'function') {
      const hasStorageAccess = await document.hasStorageAccess();
      if(!hasStorageAccess) {
        this.display = 'initial';
      }
    }
    this.storageChecked = true;
    this.ready = !!this.account;
    this.removeSessionListener = session.on('change', ({newData = {}}) => {
      this.ready = !!newData.account;
    });
    const event = await receiveCredentialEvent();
    console.log('credential request event', event);
    const {web} = event.credentialRequestOptions;
    const {query, challenge, domain} = web.VerifiablePresentation;
    // backwards compatibility (name SHOULD be `acceptedProofTypes` but some
    // older software used `supportedProofTypes`)
    let {acceptedProofTypes} = web.VerifiablePresentation;
    if(!acceptedProofTypes && web.VerifiablePresentation.supportedProofTypes) {
      acceptedProofTypes = web.VerifiablePresentation.supportedProofTypes;
    }
    console.log('incoming challenge: ', prettify(challenge, null, 2));
    console.log('incoming domain: ', prettify(domain, null, 2));
    console.log('incoming query: ', prettify(query, null, 2));
    console.log('incoming acceptedProofTypes: ',
      prettify(acceptedProofTypes, null, 2));

    this.requestOrigin = event.credentialRequestOrigin;
    this.query = query || {};
    event.respondWith(new Promise((resolve, reject) => {
      this._share = () => {
        resolve({
          dataType: 'VerifiablePresentation',
          data: this.presentation
        });
      };
      this._cancel = () => resolve(null);
      this._error = err => reject(err);
    }));

    if(acceptedProofTypes) {
      let hasAcceptedProofType = false;
      for(const {name} of acceptedProofTypes) {
        if(cryptoSuites.supported.has(name)) {
          hasAcceptedProofType = true;
        }
      }

      if(!hasAcceptedProofType) {
        const error = new Error(
          'The site is requesting credentials that are not supported ' +
          'by this wallet.');
        error.name = 'ValidationError';
        error.details = 'None of the "acceptedProofTypes" are supported.';
        this.error = error;
        this.loading = false;
        return;
      }
      this.acceptedProofTypes = acceptedProofTypes;
    }

    this.challenge = challenge;
    this.domain = domain;
    this.loading = false;
  },
  async beforeDestroy() {
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
      const {holder, type} = presentation;
      if(type === 'VerifiablePresentation') {
        const {
          // FIXME: Throw error if challenge not provided
          challenge = 'c0ae1c8e-c7e7-469f-b252-86e6a0e7387e',
          domain,
          acceptedProofTypes
        } = this;
        const signedPresentation = await presentations.sign({
          challenge, domain, presentation, profileId: holder,
          acceptedProofTypes
        });
        this.presentation = signedPresentation;
      } else { // FIXME: Remove this branch of code for mock presentation
        this.presentation = {
          ...presentation,
          proof: {
            type: 'Ed25519Signature2020',
            created: '2020-04-05T19:53:46Z',
            challenge: '48456d02-cfb8-4c7f-a50f-1c0d75ceaca1',
            domain: 'example.com',
            proofValue: 'z3MvGcVxzRzzpKF1HA11EjvfPZsN8NAb7kXBRfeTm3CBg2gcJLQM' +
              '5hZNmj6Ccd9Lk4C1YueiFZvkSx4FuHVYVouQk',
            proofPurpose: 'authentication'
          }
        };
      }
      this._share();
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
