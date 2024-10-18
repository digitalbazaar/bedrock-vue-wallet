<template>
  <q-card
    class="full-width"
    flat
    bordered>
    <q-card-section class="q-mt-lg text-center">
      <img
        v-if="branding.logo"
        :src="branding.logo"
        :style="`height: ${branding.logoSize.desktop}; filter:invert(1)`">
    </q-card-section>
    <q-card-section class="column text-center q-px-xl">
      <form class="full-width">
        <q-input
          v-model="name"
          outlined
          stack-label
          color="dark"
          :error="vuelidate.name.$error"
          error-message="A name is required."
          label="Name"
          autofocus
          bottom-slots />
        <q-input
          v-model="ctrl.email"
          outlined
          stack-label
          color="dark"
          :hint="emailAvailable || ''"
          :error="vuelidate.ctrl.email.$error ||
            (vuelidate.ctrl.email.$dirty && !isEmailUnique && !checkingEmail)"
          :error-message="emailErrorMessage"
          type="email"
          label="Email"
          class="q-mt-md"
          bottom-slots
          :loading="checkingEmail" />
      </form>
      <div class="row q-my-lg">
        <q-checkbox
          v-model="tosAgree"
          dense />
        <span class="q-ml-sm">
          I agree to the
          <a
            href=""
            style="text-decoration: none"
            @click.stop.prevent="showTosModal = true">
            Terms of Service
          </a>
        </span>
      </div>
      <q-dialog
        v-model="showTosModal"
        :maximized="maximizeModal">
        <q-card
          :style="!maximizeModal && {width: '700px', maxWidth: '80vw'}">
          <q-toolbar class="bg-primary text-white">
            <q-toolbar-title>Terms of Service</q-toolbar-title>
            <q-btn
              v-close-popup
              dense
              flat
              label="Close">
              <q-tooltip>Close</q-tooltip>
            </q-btn>
          </q-toolbar>
          <q-card-section>
            <p
              v-for="(line, index) in tos"
              :key="index">
              {{line}}
            </p>
          </q-card-section>
        </q-card>
      </q-dialog>
      <div class="text-body2 text-left q-mb-md">
        When you click "Register", you may be asked to grant permission to
        show your wallet in your browser's wallet selector. If you decline,
        you can change this later under "Settings".
      </div>
      <q-btn
        no-caps
        rounded
        size="16px"
        unelevated
        color="dark"
        class="q-mb-sm"
        label="Register"
        :loading="loading"
        :disable="vuelidate.ctrl.$invalid || vuelidate.tosAgree.$invalid ||
          vuelidate.name.$invalid || checkingEmail || !isEmailUnique ||
          loading"
        @click="register" />
      <q-separator
        class="q-mt-lg q-mb-sm q-mx-xl"
        inset />
      <div class="q-mt-sm">
        <p style="margin: 0px">
          Already registered?
          <q-btn
            flat
            no-caps
            color="primary"
            label="Log In"
            class="q-ma-none q-pa-xs"
            @click.stop.prevent="login" />
        </p>
      </div>
      <q-banner
        v-if="error"
        class="bg-red q-mt-md q-ml-sm">
        {{error}}
      </q-banner>
    </q-card-section>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2018-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {AccountService, RegisterController} from '@bedrock/web-account';
import {email, minLength, required} from '@vuelidate/validators';
import {addWalletToChapi} from '../lib/helpers';
import {config} from '@bedrock/web';
import {helpers} from '@bedrock/web-wallet';
import {randomColor} from 'randomcolor';
import {session} from '@bedrock/web-session';
import {TokenService} from '@bedrock/web-authn-token';
import useVuelidate from '@vuelidate/core';

const {createProfile} = helpers;

export default {
  name: 'RegisterForm',
  emits: ['login', 'register'],
  setup() {
    return {
      vuelidate: useVuelidate()
    };
  },
  data() {
    return {
      branding: config.vueWallet.branding,
      showTosModal: false,
      tosAgree: false,
      isEmailUnique: true,
      checkingEmail: false,
      ctrl: this._ctrl.state,
      loading: false,
      name: '',
      error: false
    };
  },
  computed: {
    email() {
      return this.ctrl.email;
    },
    emailAvailable() {
      if(!this.vuelidate.ctrl.email.$dirty ||
        this.vuelidate.ctrl.email.$error) {
        return '';
      }
      if(this.checkingEmail) {
        return 'Checking if account is available...';
      }
      return 'Account is available!';
    },
    emailErrorMessage() {
      return (this.vuelidate.ctrl.email.$dirty && !this.isEmailUnique) ?
        'The email address you entered is already in use.' :
        'Please enter a valid email address.';
    },
    maximizeModal() {
      return this.$q.screen.lt.md;
    },
    tos() {
      const {vueWallet: {terms = ''}} = config;
      if(terms.length === 0) {
        return ['Please contact us for the terms of service.'];
      }
      return terms.split(/\r\n|\r|\n/);
    }
  },
  watch: {
    async email(value) {
      if(!value || !email.$validator(value)) {
        // not a valid email, do not bother checking for uniqueness
        this.isEmailUnique = true;
        this.checkingEmail = false;
        return;
      }
      this.checkingEmail = true;
      if(!this.vuelidate.ctrl.email.$dirty) {
        this.vuelidate.ctrl.email.$touch();
      }
      try {
        const exists = await this._ctrl.exists();
        if(value === this.ctrl.email) {
          this.isEmailUnique = !exists;
        }
      } catch(e) {
        if(e.status === 404) {
          this.isEmailUnique = true;
        } else {
          this.$q.notify({
            type: 'negative',
            message: e.message || 'Unknown Error'
          });
        }
      } finally {
        this.checkingEmail = false;
      }
    }
  },
  beforeCreate() {
    this._ctrl = new RegisterController();
    this._tokenService = new TokenService();
    this._accountService = new AccountService();
  },
  validations: {
    ctrl: {
      email: {required, email}
    },
    name: {
      required,
      minLength: minLength(1)
    },
    tosAgree: {
      required,
      checked: value => value
    }
  },
  methods: {
    async createProfile({name}) {
      const profileContent = {
        name,
        shared: false,
        color: randomColor(),
        type: ['User', 'Person']
      };
      const profileOptions = {
        didMethod: 'v1', // Default to Veres One type DIDs
        didOptions: {mode: 'test'} // Default to testnet
      };
      await createProfile({profileContent, profileOptions});
    },
    async login() {
      await this.$emitExtendable('login');
    },
    async register() {
      try {
        this.error = false;
        this.loading = true;

        await addWalletToChapi();

        // end session to ensure the user is not logged in
        await session.end();

        // create new account
        await this._ctrl.register();

        // update session to get auto-login info for new account
        await session.refresh();

        // get auto-login info
        const {account: currentAccount = null} = session.data;
        if(currentAccount) {
          // user was auto-logged in, so create initial profile
          await this.createProfile({name: this.name});
        }

        // registration now complete
        await this.$emitExtendable('register');
      } catch(e) {
        // eslint-disable-line no-console
        console.error('Register Error', e);
        const newError = `${e.name}: ${e.message || 'No Message'}`;
        this.error = newError;

        const message =
          'An error has occurred. Please refresh the page to try again.';
        this.$q.notify({
          type: 'negative',
          timeout: 0,
          message,
          actions: [{icon: 'fa fa-times', color: 'white'}]
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
</style>
