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
import {credentialHelpers, helpers} from 'bedrock-web-wallet';
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
      supportedProofTypes: undefined,
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
    const self = this;
    let resolveRemoveSession;
    this.removeSessionListener = new Promise(
      resolve => resolveRemoveSession = resolve);
    try {
      this.ready = !!this.account;
      const remover = session.on('change', ({newData = {}}) => {
        self.ready = !!newData.account;
      });
      resolveRemoveSession(remover);
    } finally {
      resolveRemoveSession(() =>
        console.error('SharePage failed to remove session listener.'));
    }
    const event = await receiveCredentialEvent();
    console.log('credential request event', event);
    const {web} = event.credentialRequestOptions;
    const {
      query, challenge, domain, supportedProofTypes
    } = web.VerifiablePresentation;
    console.log('incoming challenge: ', prettify(challenge, null, 2));
    console.log('incoming domain: ', prettify(domain, null, 2));
    console.log('incoming query: ', prettify(query, null, 2));
    console.log('incoming supportedProofTypes: ',
      prettify(supportedProofTypes, null, 2));

    self.requestOrigin = event.credentialRequestOrigin;
    self.query = query || {};
    event.respondWith(new Promise((resolve, reject) => {
      self._share = () => {
        resolve({
          dataType: 'VerifiablePresentation',
          data: self.presentation
        });
      };
      self._cancel = () => resolve(null);
      self._error = err => reject(err);
    }));

    if(supportedProofTypes) {
      let hasSupportedProofType = false;
      for(const supportedProofType of supportedProofTypes) {
        if(helpers.supportedProofTypes.has(supportedProofType.name)) {
          hasSupportedProofType = true;
        }
      }

      if(!hasSupportedProofType) {
        const error = new Error('The site is requesting credentials that ' +
          'are not supported by this wallet.');
        error.name = 'ValidationError';
        error.details = 'None of the "supportedProofTypes" are supported.';
        this.error = error;
        this.loading = false;
        return;
      }
      this.supportedProofTypes = supportedProofTypes;
    }

    this.challenge = challenge;
    this.domain = domain;
    this.loading = false;
  },
  async beforeDestroy() {
    // clean up session listener
    (await this.removeSessionListener)();
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
          supportedProofTypes
        } = this;
        const signedPresentation = await credentialHelpers.signPresentation({
          challenge, domain, presentation, profileId: holder,
          supportedProofTypes
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
