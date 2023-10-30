<template>
  <br-q-title-card
    v-if="!awaitingAuthorization"
    :title="title"
    class="full-width">
    <template #body>
      <div class="column q-pa-md">
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
              v-if="!deviceRegistrationRequired"
              class="text-left">
              We will email you a code so you can access your wallet. Please
              enter the email address below associated with your wallet.
            </p>
            <p
              v-if="deviceRegistrationRequired"
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
                :error="vuelidate.ctrl.email.$error"
                error-message="Please enter the email address you registered
                  with."
                type="email"
                label="Email"
                autofocus
                bottom-slots
                clearable
                @keydown.enter.prevent="handleEnterForEmail"
                @blur="vuelidate.ctrl.email.$touch" />
            </form>
            <q-btn
              v-if="showSendEmail"
              :disable="loading.emailCode || vuelidate.ctrl.email.$invalid"
              size="form"
              color="primary"
              label="Send Email Code"
              :loading="loading.emailCode"
              class="q-mt-md full-width"
              @click="sendEmail" />
            <q-btn
              v-if="showResendEmail"
              :disable="loading.emailCode || vuelidate.ctrl.email.$invalid"
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
                <a
                  href=""
                  @click.stop.prevent="register($event)">
                  Register</a>.
              </small>
            </div>
          </div>

          <div v-if="showEmailCode && !deviceRegistrationRequired">
            <p class="text-left q-mt-md">
              Please enter the code that was sent to your above email.
            </p>
            <code-input
              hint="Please enter the 6 character code sent to your email
                address."
              :min-length="6"
              :max-length="6"
              @code="emailCode = $event.code"
              @keydown.enter.prevent="handleEnterForCode"
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
            hint="Please enter the 6 character code sent to your email address."
            :min-length="6"
            :max-length="6"
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
    </template>
  </br-q-title-card>
</template>

<script>
/*!
 * Copyright (c) 2018-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {email, required} from '@vuelidate/validators';
import {BrQTitleCard} from '@bedrock/quasar-components';
import CodeInput from './CodeInput.vue';
import {config} from '@bedrock/web';
import {LoginController} from '@bedrock/web-authn-token';
import {session} from '@bedrock/web-session';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'Login',
  components: {CodeInput, BrQTitleCard},
  emits: ['login', 'register'],
  setup() {
    return {
      vuelidate: useVuelidate()
    };
  },
  data() {
    return {
      branding: config.vueWallet.branding,
      ctrl: this._ctrl.state,
      deviceRegistrationRequired: false,
      emailCode: '',
      emailCodeAuthenticated: false,
      invalidEmailCode: false,
      totpCode: '',
      totpCodeAuthenticated: false,
      invalidTotpCode: false,
      recoveryEmailCode: '',
      invalidRecoveryEmailCode: false,
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
      awaitingAuthorization: false
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
      if(this.deviceRegistrationRequired) {
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
      email: {required, email}
    }
  },
  methods: {
    reset() {
      this.deviceRegistrationRequired = false;
      this.showDeviceAlreadyRegistered = false;
    },
    async sendEmail() {
      try {
        const {email} = this.ctrl;
        this.loading.emailCode = true;

        if(this.deviceRegistrationRequired) {
          // create nonce for device registration; it will send email as well;
          // note this is a legacy feature for older accounts only
          await this._ctrl.tokenService.create({
            email,
            type: 'nonce',
            authenticationMethod: 'token-client-registration',
            typeOptions: {entryStyle: 'machine'}
          });
        } else {
          // create nonce for email authentication; it will send email as well
          await this._ctrl.tokenService.create({
            email,
            type: 'nonce',
            authenticationMethod: 'login-email-challenge'
          });
        }

        this.showSendEmail = false;
        this.showResendEmail = true;
        this.showRegisterLink = false;
        this.showEmailCode = true;
        this.emailCode = '';
      } catch(e) {
        console.error('sendEmail error', e);
        this.reset();
      } finally {
        this.loading.emailCode = false;
      }
    },
    handleEnterForEmail() {
      if(this.loading.emailCode || this.vuelidate.ctrl.email.$invalid) {
        return;
      }
      this.sendEmail();
    },
    async registerDevice({email, code}) {
      let result;
      try {
        result = await this._ctrl.tokenService.authenticate({
          type: 'nonce', email, challenge: code
        });
      } catch(e) {
        if(e.name !== 'DuplicateError') {
          console.error('Device registration error', e);
        } else {
          this.showDeviceAlreadyRegistered = true;
        }
        return;
      }
      this.showDeviceRegistered = true;
      await this.handleAuthenticationResult({result});
    },
    async emailCodeEntered() {
      try {
        this.loading.login = true;

        const {email} = this.ctrl;
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

        await this.handleAuthenticationResult({result});
      } catch(e) {
        console.error('Login Error', e);
      } finally {
        this.loading.login = false;
      }
    },
    handleEnterForCode() {
      if(this.loading.login || this.invalidEmailCode) {
        return;
      }
      this.emailCodeEntered();
    },
    async handleAuthenticationResult({result} = {}) {
      // check for device registration requirement; this is a legacy method
      // that has been deprecated but some accounts still require it
      this.deviceRegistrationRequired = this.requiresMethod({
        method: 'token-client-registration',
        authenticatedMethods: result.result.authenticatedMethods,
        requiredAuthenticationMethods:
          result.result.requiredAuthenticationMethods
      });
      if(this.deviceRegistrationRequired) {
        // do device registration
        this.showRegisterDevice = true;
        return this.sendEmail();
      }

      // check if email authentication is required
      const emailAuthnRequired = this.requiresMethod({
        method: 'login-email-challenge',
        authenticatedMethods: result.result.authenticatedMethods,
        requiredAuthenticationMethods:
          result.result.requiredAuthenticationMethods
      });
      if(emailAuthnRequired) {
        this.showRegisterDevice = false;
        return this.sendEmail();
      }

      // check for other multifactors
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
    },
    requiresMethod({
      method, authenticatedMethods, requiredAuthenticationMethods
    }) {
      // FIXME: improve / share with TwoFactorStepper code
      return !authenticatedMethods.includes(method) &&
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
        console.error('Login Error', e);
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
      try {
        await this._ctrl.login();
      } catch(e) {
        console.error('Login error', e);
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
        await this.removeTokenClientRegistrationRequirement();
      } catch(e) {
        console.error(e);
        const message =
          'An error has occurred. Please refresh the page to try again.';
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
    async register() {
      await this.$emitExtendable('register');
    },
    async removeTokenClientRegistrationRequirement() {
      // remove `token-client-registration` requirement if present
      const {account: {id: account}} = session.data;
      const response = await this._ctrl.tokenService
        .getAuthenticationRequirements({account});
      const requiredAuthenticationMethods =
        response.requiredAuthenticationMethods.filter(
          m => m !== 'token-client-registration');
      if(requiredAuthenticationMethods.length <
        response.requiredAuthenticationMethods.length) {
        await this._ctrl.tokenService.setAuthenticationRequirements({
          account,
          requiredAuthenticationMethods
        });
      }
    }
  }
};
</script>

<style scoped>
</style>
