<template>
  <br-q-title-card
    v-if="!awaitingAuthorization"
    :title="title"
    class="full-width">
    <div
      slot="body"
      class="column q-pa-md">
      <div v-if="showDeviceAlreadyRegistered">
        <p class="text-left q-mb-none">
          We detected that your device was already registered. Either you
          registered your device in another browser tab or you may have been
          on a website that was pretending to be <strong>{{domain}}</strong>.
        </p>
        <p class="text-left q-mt-md">
          Make sure to check your browser's URL bar on any other tabs that
          may have directed you here to ensure you are on the correct website
          and then try to
          <a
            href=""
            @click.stop.prevent="reset">
            login again</a>.
        </p>
      </div>

      <div v-else-if="showRegisterDevice">
        <p class="text-left q-mb-none">
          Your device has not been registered with {{branding.name}} yet.
          To continue logging in, you must click on the link that was sent
          to your email to register your device.
        </p>
      </div>

      <div v-else-if="showEmail">
        <div>
          <p
            v-if="showDeviceRegistered"
            class="text-left">
            Your device has been registered! Now we are able to safely send
            a login code to your email address. Please check your email for
            a code that you can enter below to log into your wallet.
          </p>
          <p
            v-if="deviceRegistered"
            class="text-left">
            We will email you a code so you can access your wallet. Please
            enter the email address below associated with your wallet.
          </p>
          <p
            v-if="!deviceRegistered"
            class="text-left">
            We could not find an account with the email you entered.
            You can register
            <a
              href=""
              @click.stop.prevent="register">
              here</a>.
          </p>
          <form
            class="full-width"
            @submit.prevent>
            <q-input
              v-model="ctrl.email"
              outlined
              stack-label
              autocomplete="email"
              hint="Please enter your email address."
              :error="$v.ctrl.email.$error"
              error-message="Please enter the email address you registered
                with."
              type="email"
              label="Email"
              autofocus
              bottom-slots
              clearable
              @blur="$v.ctrl.email.$touch" />
          </form>
          <q-btn
            v-if="showSendEmail"
            :disable="loading.emailCode || $v.ctrl.email.$invalid"
            size="form"
            color="primary"
            label="Send Email Code"
            :loading="loading.emailCode"
            class="q-mt-md full-width"
            @click="sendEmail" />
          <q-btn
            v-if="showResendEmail"
            :disable="loading.emailCode || $v.ctrl.email.$invalid"
            size="form"
            color="primary"
            label="Resend Email Code"
            :loading="loading.emailCode"
            class="q-mt-md full-width"
            @click="sendEmail" />
        </div>

        <div v-if="showRegisterLink">
          <div class="q-mt-sm">
            <small>
              Not registered?
              <span v-if="!checkedStorageAccess">Register</span>
              <a
                v-else
                href=""
                @click.stop.prevent="register($event)">
                Register</a>.
            </small>
          </div>
        </div>

        <div v-if="showEmailCode && deviceRegistered">
          <p class="text-left q-mt-md">
            Please enter the code that was sent to your above email.
            <!-- FIXME -->
            You may also click directly on the link sent to your email.
          </p>
          <code-input
            hint="Please enter the 9 character code sent to your email address."
            :min-length="9"
            :max-length="9"
            @code="emailCode = $event.code"
            @invalid="invalidEmailCode = $event.invalid" />
          <q-btn
            :disable="loading.login || invalidEmailCode"
            size="form"
            color="primary"
            label="Login"
            :loading="loading.login"
            class="q-mt-md full-width"
            @click="emailCodeEntered" />
        </div>

        <div v-if="showEmailCodeAuthenticated">
          <p class="text-left q-mt-md">
            <q-icon name="fas fa-check" />
            Email Code Authenticated.
          </p>
        </div>
      </div>

      <div v-else-if="showTotpCode">
        <p class="text-left q-mt-md">
          Your wallet has Two-Factor Authentication enabled. Please enter
          the six digit code from your Two-Factor Authentication app.
        </p>
        <code-input
          hint="Please enter the code from your two-factor app."
          :min-length="6"
          :max-length="6"
          @code="totpCode = $event.code"
          @invalid="invalidTotpCode = $event.invalid" />
        <q-btn
          :disable="loading.twoFactorLogin || invalidTotpCode"
          size="form"
          color="primary"
          label="Login"
          :loading="loading.twoFactorLogin"
          class="q-mt-md full-width"
          @click="totpCodeEntered" />
        <div
          v-if="hasRecoveryEmail">
          <div class="q-mt-sm">
            <small>
              No longer have access to your authenticator? Click
              <a
                href=""
                @click.stop.prevent="sendRecoveryEmail">
                here
              </a>
              to use your recovery email instead.
            </small>
          </div>
        </div>
      </div>

      <div v-else-if="showRecoveryEmailCode">
        <p class="text-left">
          An email has been sent to the recovery email for your account.
          Please enter the code from that email below.
        </p>
        <code-input
          hint="Please enter the 9 character code sent to your email address."
          :min-length="9"
          :max-length="9"
          @code="recoveryEmailCode = $event.code"
          @invalid="invalidRecoveryEmailCode = $event.invalid" />
        <q-btn
          :disable="invalidRecoveryEmailCode || ctrl.loading"
          size="form"
          color="primary"
          label="Login"
          :loading="ctrl.loading"
          class="q-mt-md full-width"
          @click="recoveryEmailCodeEntered" />
      </div>
    </div>
  </br-q-title-card>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQTitleCard} from 'bedrock-quasar-components';
import CodeInput from './CodeInput.vue';
import {config} from '../lib/config.js';
import {helpers} from 'bedrock-web-wallet';
import {LoginController} from 'bedrock-web-authn-token';
import {required, email} from 'vuelidate/lib/validators';
import {session} from 'bedrock-web-session';

const {openFirstPartyWindow} = helpers;

export default {
  name: 'Login',
  components: {CodeInput, BrQTitleCard},
  data() {
    return {
      branding: config.branding,
      ctrl: this._ctrl.state,
      emailCode: '',
      emailCodeAuthenticated: false,
      invalidEmailCode: false,
      totpCode: '',
      totpCodeAuthenticated: false,
      invalidTotpCode: false,
      recoveryEmailCode: '',
      invalidRecoveryEmailCode: false,
      deviceRegistered: true,
      showEmail: true,
      showSendEmail: true,
      showResendEmail: false,
      showRegisterLink: true,
      showRegisterDevice: false,
      showDeviceRegistered: false,
      showEmailCode: false,
      showTotpCode: false,
      hasRecoveryEmailCode: false,
      showRecoveryEmailCode: false,
      showDeviceAlreadyRegistered: false,
      loading: {
        emailCode: false,
        login: false,
        twoFactorLogin: false
      },
      showEmailCodeAuthenticated: false,
      awaitingAuthorization: false,
      hasStorageAccess: true,
      checkedStorageAccess: false
    };
  },
  computed: {
    domain() {
      return window.location.hostname;
    },
    title() {
      if(this.showDeviceAlreadyRegistered) {
        return 'Warning: Possible Scam Blocked!';
      }
      if(!this.deviceRegistered) {
        return 'Device Not Registered';
      }
      if(this.showRecoveryEmailCode) {
        return 'Login: Recovery Email Code';
      }
      if(this.showTotpCode) {
        return 'Login: Two-factor Authentication';
      }
      if(this.showDeviceRegistered) {
        return 'Login: Device Registered';
      }
      return 'Login';
    }
  },
  beforeCreate() {
    this._ctrl = new LoginController();
  },
  async created() {
    if(typeof document.hasStorageAccess === 'function') {
      this.hasStorageAccess = await document.hasStorageAccess();
    }
    this.checkedStorageAccess = true;
  },
  mounted() {
    // FIXME: pass as parameters to component instead of getting from URL query
    const {email = '', code} = this.$route.query;
    this.ctrl.email = email;
    if(email && code) {
      this.registerDevice({email, code});
    }
  },
  validations: {
    ctrl: {
      email: {required, email},
      // FIXME
      //challenge: {required, minLength: minLength(8)}
      //token: {required, minLength: minLength(11), maxLength: maxLength(11)}
    }
  },
  methods: {
    reset() {
      this.deviceRegistered = true;
      this.showDeviceAlreadyRegistered = false;
    },
    async requestStorageAccess() {
      try {
        // A Promise that fulfills with undefined if the access to first-party
        // storage was granted, and rejects if access was denied.
        await document.requestStorageAccess();
      } catch(e) {
        console.log('storage access error', e);
      }
    },
    async sendEmail() {
      if(typeof document.requestStorageAccess === 'function') {
        await this.requestStorageAccess();
      }
      try {
        const {email} = this.ctrl;
        this.loading.emailCode = true;
        // check if device registered
        const result = await this._ctrl.tokenService.isClientRegistered(
          {email});
        this.deviceRegistered = result.registered;
        let authenticationMethod;
        const requiredAuthenticationMethods = [];
        let typeOptions;
        if(this.deviceRegistered) {
          requiredAuthenticationMethods.push('token-client-registration');
          authenticationMethod = 'login-email-challenge';
        } else {
          authenticationMethod = 'token-client-registration';
          typeOptions = {entryStyle: 'machine'};
        }
        await this._ctrl.tokenService.create({
          email,
          type: 'nonce',
          authenticationMethod,
          requiredAuthenticationMethods,
          typeOptions
        });

        // go to page to enter info
        if(!this.deviceRegistered) {
          this.showRegisterDevice = true;
        } else {
          this.showSendEmail = false;
          this.showResendEmail = true;
          this.showRegisterLink = false;
          this.showEmailCode = true;
          this.emailCode = '';
        }
      } catch(e) {
        console.log('sendEmail error', e);
        this.reset();
      } finally {
        this.loading.emailCode = false;
      }
    },
    async registerDevice({email, code}) {
      try {
        await this._ctrl.tokenService.authenticate({
          type: 'nonce', email, challenge: code
        });
      } catch(e) {
        if(e.name === 'DuplicateError') {
          this.showDeviceAlreadyRegistered = true;
        }
      }
      if(!this.showDeviceAlreadyRegistered) {
        this.showDeviceRegistered = true;
        // TODO: optimize to only create new email login token
        await this.sendEmail();
      }
    },
    async emailCodeEntered() {
      try {
        const {email} = this.ctrl;
        this.loading.login = true;
        let result;
        try {
          result = await this._ctrl.tokenService.authenticate({
            type: 'nonce', email, challenge: this.emailCode
          });
        } catch(e) {
          let message;
          // FIXME: improve error handling
          //if(e.response.data.type === 'NotAllowedError') {
          if(e.response.status === 400) {
            message = 'Your credentials are incorrect. Please try again.';
          } else if(e.response.status === 404) {
            message = 'Your code expired. Please resend and try again.';
          } else {
            message = e.message;
          }
          this.$q.notify({
            message,
            actions: [{icon: 'fa fa-times'}]
          });
          return;
        }
        this.totpCode = '';
        this.showTotpCode = this.requiresMethod({
          method: 'totp-challenge',
          authenticatedMethods: result.result.authenticatedMethods,
          requiredAuthenticationMethods:
            result.result.requiredAuthenticationMethods
        });
        this.showEmailCodeAuthenticated = this.showTotpCode;
        this.hasRecoveryEmail = this.requiresMethod({
          method: 'recovery-email-challenge',
          authenticatedMethods: result.result.authenticatedMethods,
          requiredAuthenticationMethods:
            result.result.requiredAuthenticationMethods
        });
        if(!this.showTotpCode) {
          await this.login();
        }
        this.showEmail = false;
        this.showEmailCode = false;
      } catch(e) {
        console.log('Login Error', e);
      } finally {
        this.loading.login = false;
      }
    },
    requiresMethod({
      method, authenticatedMethods, requiredAuthenticationMethods
    }) {
      // FIXME: improve / share with TwoFactorStepper code
      return !(method in authenticatedMethods) &&
        requiredAuthenticationMethods
          .some(element => {
            return element === method ||
              (Array.isArray(element) && element.includes(method));
          });
    },
    async totpCodeEntered() {
      this.loading.twoFactorLogin = true;
      try {
        const {email} = this.ctrl;
        await this._ctrl.tokenService.authenticate({
          type: 'totp', email, challenge: this.totpCode
        });
        await this.login();
      } catch(e) {
        console.log('Login Error', e);
      } finally {
        this.loading.twoFactorLogin = false;
      }
    },
    async sendRecoveryEmail() {
      const {email} = this.ctrl;
      await this._ctrl.tokenService.create({
        email,
        type: 'nonce',
        authenticationMethod: 'recovery-email-challenge'
      });
      this.showTotpCode = false;
      this.showRecoveryEmailCode = true;
    },
    async recoveryEmailCodeEntered() {
      const {email} = this.ctrl;
      await this._ctrl.tokenService.authenticate({
        email,
        type: 'nonce',
        authenticationMethod: 'recover-email-challenge',
        challenge: this.recoveryEmailCode
      });
      await this.login();
    },
    async login() {
      // TODO: Needs to properly check for correct code
      //console.log('Code: ' + this.ctrl.challenge);

      //const result = await this._ctrl.authenticate({type: 'nonce'});
      //console.log('LOGIN AUTH', {result});
      // FIXME: check result for two-factor needed and type(s)

      // TODO: Check for two-factor authentication
      /*
      const hasTwoFactor = false;
      if(hasTwoFactor) {
        await this.$emitExtendable('authenticate');
        return;
      }
      */

      try {
        await this._ctrl.login();
      } catch(e) {
        let message;
        if(e.type === 'ValidationError') {
          message = 'Your credentials are incorrect. Please try again.';
        } else {
          message = e.message;
        }
        this.$q.notify({
          message,
          actions: [{icon: 'fa fa-times'}]
        });
        return;
      }

      // clear challenge from state
      this._ctrl.state.challenge = '';

      try {
        await session.refresh();
      } catch(e) {
        console.log(e);
        const message =
          'An error has occured. Please refresh the page to try again.';
        this.$q.notify({
          type: 'negative',
          timeout: 0,
          message,
          actions: [{icon: 'fa fa-times', color: 'white'}]
        });
        return;
      }

      await this.$emitExtendable('login');
    },
    async register(event) {
      if(!this.hasStorageAccess) {
        this.$q.loading.show({
          delay: 0, // ms
          // spinner: Spinner,
          message: 'Waiting for you to register...'
        });
        this.awaitingAuthorization = true;
        const handle = await openFirstPartyWindow(event);
        handle.addEventListener('load', () => {
          handle.addEventListener('unload', async () => {
            this.awaitingAuthorization = false;
            await this.$emitExtendable('next');
            this.$q.loading.hide();
          });
        });
      } else {
        await this.$emitExtendable('register');
      }
    }
  }
};
</script>

<style scoped>
</style>
