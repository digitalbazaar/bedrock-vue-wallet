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
          data-testid="invite-request-error"
          rounded>
          {{error.message}}
        </q-banner>
        <q-btn
          v-if="error.retryable"
          no-caps
          rounded
          unelevated
          color="dark"
          label="Try again"
          :loading="working"
          @click="run" />
        <q-btn
          v-if="error.signIn"
          no-caps
          rounded
          unelevated
          color="dark"
          label="Sign in"
          data-testid="invite-request-sign-in"
          @click="$router.push({name: 'login'})" />
        <q-btn
          no-caps
          rounded
          unelevated
          outline
          label="Go to my wallet"
          @click="$router.push({name: 'home'})" />
      </div>
      <share-credentials
        v-else-if="display === 'share'"
        :verifiable-presentation-request="verifiablePresentationRequest"
        :request-origin="requestOrigin"
        @cancel="$event.waitUntil(cancel())"
        @share="$event.waitUntil(share($event))" />
      <store-credentials
        v-else-if="display === 'store'"
        :account="account"
        :holder="holder"
        :verifiable-credential="verifiableCredential"
        @cancel="$event.waitUntil(cancel())"
        @store="$event.waitUntil(store($event))" />
      <div
        v-else-if="display === 'continue'"
        class="column q-gutter-md"
        data-testid="invite-request-continue">
        <div class="text-h6">
          Get another credential?
        </div>
        <p>
          <strong>{{continueOrigin}}</strong> has another credential for you.
          Continue to get it?
        </p>
        <q-btn
          no-caps
          rounded
          unelevated
          color="dark"
          label="Continue"
          data-testid="invite-request-continue-accept"
          @click="decideContinue(true)" />
        <q-btn
          no-caps
          rounded
          unelevated
          outline
          label="Not now"
          data-testid="invite-request-continue-decline"
          @click="decideContinue(false)" />
      </div>
      <div
        v-else
        class="column items-center q-gutter-md"
        data-testid="invite-request-working">
        <q-spinner
          color="primary"
          size="3rem" />
        <p class="text-center">
          {{status}}
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
  completeInteractionChain, exchanges, getCredentialStore, presentations
} from '@bedrock/web-wallet';
import {
  findSignInCredential, isCredentialSignInEnabled, signInWithCredential
} from '../lib/credentialSignIn.js';
import {provisionDefaultProfile, setPendingDestination}
  from '../lib/firstRun.js';
import {config} from '@bedrock/web';
import {session} from '@bedrock/web-session';
import ShareCredentials from '../components/ShareCredentials.vue';
import StoreCredentials from '../components/StoreCredentials.vue';
import {toRaw} from 'vue';

/* The endpoint named by `interaction_creators` in the web app manifest. A
coordinator sends the holder here with one query parameter: the URL of an
exchange that is waiting for them.

Reaching this route means the holder is signed in and has a profile -- the
route guards see to that -- so this page runs the exchange the coordinator
prepared. It does not decide on the holder's behalf what to hand over or what
to keep: a presentation request goes through the same ShareCredentials review
every other exchange surface uses, and anything delivered goes through
StoreCredentials. The link arrives from outside the wallet and anyone can
craft one, so the exchange's origin has to be one this deployment named before
any of that begins.

An exchange can finish by naming a follow-on exchange in its `redirectUrl`
(an interaction URL, `iuv=1`). The chain asks the holder before starting each
one, after what the previous exchange delivered has been stored; any other
`redirectUrl` is ignored and the holder goes to their wallet. */
// the exchange refused the presentation it was sent, e.g. an unverifiable
// proof; retrying the same link sends the same presentation
function _signInError(message, cause) {
  const error = new Error(message, {cause});
  error.name = 'SignInError';
  return error;
}

function _isVerificationError(error) {
  const details = error?.data?.details;
  return error?.status === 400 && (details?.verified === false ||
    details?.presentationResult?.verified === false);
}

export default {
  name: 'InviteRequestPage',
  components: {ShareCredentials, StoreCredentials},
  data() {
    return {
      working: false,
      error: null,
      display: 'working',
      status: 'Getting your credentials...',
      requestOrigin: '',
      verifiablePresentationRequest: undefined,
      holder: '',
      verifiableCredential: [],
      continueOrigin: '',
      // set again after an invitation signs the holder in
      account: session.data?.account?.id ?? null
    };
  },
  async created() {
    await this.run();
  },
  methods: {
    async run() {
      if(this.working) {
        return;
      }
      this.working = true;
      this.error = null;
      this.display = 'working';
      this.status = 'Getting your credentials...';
      let interactionUrl;
      try {
        interactionUrl = this._allowedInteractionUrl();
      } catch(e) {
        this.working = false;
        this.error = {message: e.message, retryable: false};
        return;
      }
      try {
        this.requestOrigin = new URL(interactionUrl).origin;
        await completeInteractionChain({
          interactionUrl,
          createInteraction: ({interactionUrl}) =>
            exchanges.createClientInteraction({interactionUrl}),
          startExchange: ({interaction}) => exchanges.start({interaction}),
          onBeforeContinue: args => this.confirmContinue(args),
          onPresentationRequest: args => this.review(args),
          onLegComplete: args => this.keep(args)
        });
        this.$router.push({name: 'home'});
      } catch(e) {
        if(e.name === 'AbortError') {
          this.$router.push({name: 'home'});
          return;
        }
        if(e.name === 'SignInRequiredError') {
          // nothing was delivered yet: sign in as before, then come back
          setPendingDestination(this.$route.fullPath);
          this.$router.push({name: 'login'});
          return;
        }
        if(e.name === 'SignInError') {
          console.error('Could not sign in from the invite request.',
            e.cause?.message ?? e.message);
          /* The link's first exchange is spent, so trying again would not
          deliver the credential again. */
          this.error = {
            message: e.message + ' Sign in to your wallet, then ask for a ' +
              'new link.',
            retryable: false,
            signIn: true
          };
          this.display = 'working';
          return;
        }
        console.error('Could not complete the invite request.', e.message);
        this.error = _isVerificationError(e) ? {
          message: 'The site could not verify what your wallet sent. Ask ' +
            'the site for a new link.',
          retryable: false
        } : {
          message: 'Your credentials could not be added. Check your ' +
            'connection and try again.',
          retryable: true
        };
        this.display = 'working';
      } finally {
        this.working = false;
      }
    },
    /* The origin is checked against configuration rather than trusted, and
    the default list is empty: a deployment that has not named its coordinators
    cannot be walked into an exchange by a crafted link. */
    _allowedInteractionUrl() {
      const {request} = this.$route.query;
      if(typeof request !== 'string' || request === '') {
        throw new Error('This link is incomplete. Ask for a new one.');
      }
      let url;
      try {
        url = new URL(request);
      } catch{
        throw new Error('This link is not valid. Ask for a new one.');
      }
      if(url.protocol !== 'https:') {
        throw new Error('This link is not secure. Ask for a new one.');
      }
      const {allowedOrigins = []} =
        config.vueWallet?.interactionCreator ?? {};
      if(!allowedOrigins.includes(url.origin)) {
        throw new Error(
          `This wallet does not accept invitations from ${url.origin}.`);
      }
      return url.href;
    },
    /* Both halves park the chain on a promise the review component settles,
    which is how the other exchange surfaces in this wallet wait for a
    decision. Cancelling aborts the chain rather than answering it. */
    _decide(display) {
      this.display = display;
      return new Promise((resolve, reject) => {
        this._settle = {resolve, reject};
      });
    },
    async review({verifiablePresentationRequest, origin}) {
      if(!this.account) {
        /* Sharing needs a profile to choose and sign with. Signed out, an
        invitation that opens by asking for something cannot be answered, so
        the holder signs in first, as before credential sign-in. */
        const error = new Error('Sign in to answer this request.');
        error.name = 'SignInRequiredError';
        throw error;
      }
      this.status = 'Confirming your details...';
      this.requestOrigin = origin;
      this.verifiablePresentationRequest = verifiablePresentationRequest;
      const answer = await this._decide('share');
      this.verifiablePresentationRequest = undefined;
      this.display = 'working';
      return answer;
    },
    /* A follow-on exchange is named by the previous one, not by the link the
    holder followed, so the allowlist that vetted the link says nothing about
    it. The holder is shown where it leads and decides; declining ends the
    chain with what has been stored so far. */
    async confirmContinue({origin}) {
      this.continueOrigin = origin;
      const proceed = await this._decide('continue');
      this.continueOrigin = '';
      this.display = 'working';
      this.status = 'Getting your credentials...';
      return proceed === true;
    },
    /* Runs once, after the first exchange, for a holder who arrived signed
    out. The backend decides whether it trusts the credential; a refusal ends
    the invitation, since its first exchange cannot be replayed. Then the
    default profile is created, as `/welcome` would, so the credentials just
    delivered have somewhere to go. */
    async _signIn({credentials}) {
      const credential = isCredentialSignInEnabled() ?
        findSignInCredential({credentials}) : undefined;
      if(!credential) {
        throw _signInError('This link could not sign you in.');
      }
      this.status = 'Signing you in...';
      try {
        await signInWithCredential({credential});
      } catch(e) {
        throw _signInError('This link could not sign you in.', e);
      }
      const account = session.data?.account?.id ?? null;
      if(!account) {
        throw _signInError('This link could not sign you in.');
      }
      this.account = account;
      this.status = 'Setting up your wallet...';
      await provisionDefaultProfile({accountId: account});
    },
    decideContinue(proceed) {
      this._settle?.resolve(proceed);
    },
    async keep({delta, origin}) {
      if(!this.account) {
        await this._signIn({credentials: delta});
      }
      if(delta.length === 0) {
        return;
      }
      this.status = 'Adding your credentials...';
      this.requestOrigin = origin;
      this.verifiableCredential = delta;
      this.holder = delta[0]?.credentialSubject?.id ?? '';
      await this._decide('store');
      this.verifiableCredential = [];
      this.display = 'working';
    },
    /* Signing happens in the exchange, with `signOptions` built for the
    profile the holder chose in ShareCredentials, as on the scanner and CHAPI
    pages; a presentation sent without them carries no proof. */
    async share({
      presentation, profileId, authnOption, verifiablePresentationRequest
    }) {
      try {
        const verifiablePresentation = toRaw(presentation);
        let signOptions;
        if(authnOption) {
          signOptions = await presentations.createSignOptions({
            profileId, authnOption, verifiablePresentationRequest
          });
          verifiablePresentation.holder = signOptions.controller;
        }
        this._settle?.resolve({verifiablePresentation, signOptions});
      } catch(e) {
        this._settle?.reject(e);
      }
    },
    async store({holder, verifiableCredential}) {
      try {
        const credentialStore = await getCredentialStore({
          // FIXME: determine how password will be provided / set; currently
          // set to `profileId`
          profileId: holder, password: holder
        });
        await credentialStore.add({credentials: verifiableCredential});
        this._settle?.resolve();
      } catch(e) {
        const error = new Error('Credential storage failed.');
        error.name = 'OperationError';
        error.details = e;
        this._settle?.reject(error);
      }
    },
    async cancel() {
      const error = new Error('The holder cancelled the invitation.');
      error.name = 'AbortError';
      this._settle?.reject(error);
    }
  }
};
</script>

<style scoped>
</style>
