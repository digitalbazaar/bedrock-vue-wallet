<template>
  <q-card
    flat
    bordered>
    <q-card-section class="q-mt-lg q-pb-sm text-center">
      <img
        v-if="branding.logo"
        :src="branding.logo"
        :style="`height: ${branding.logoSize.desktop}; filter:invert(1)`">
    </q-card-section>
    <q-card-section class="column text-center text-body1 q-px-xl q-mb-lg">
      <div v-if="showEmail">
        <div v-if="showSendEmail">
          Enter your email to get a login code.
          <form @submit.prevent>
            <q-input
              v-model="ctrl.email"
              outlined
              autofocus
              stack-label
              color="dark"
              type="email"
              label="Email"
              bottom-slots
              class="q-mt-md"
              autocomplete="email"
              :input-style="{ fontSize: '16px' }"
              :error="vuelidate.ctrl.email.$error"
              error-message=
                "Please enter the email address you registered with."
              @keydown.enter.prevent="handleEnterForEmail" />
          </form>
          <q-btn
            no-caps
            rounded
            unelevated
            size="16px"
            color="dark"
            label="Continue"
            class="q-my-xs full-width"
            :loading="loading.emailCode"
            :disable="loading.emailCode || vuelidate.ctrl.email.$invalid"
            @click="sendEmail" />
          <q-separator
            class="q-my-lg q-mx-xl"
            inset />
          <div class="column text-body2">
            New to Veres Wallet?
            <a
              href=""
              style="text-decoration: none"
              @click.stop.prevent="register($event)">
              Create Account</a>
          </div>
        </div>

        <div v-if="showEmailCode">
          A verification code was sent to
          <div class="text-body1 q-mt-md q-mb-lg text-weight-bold">
            {{ctrl.email}}
          </div>
          <code-input
            :min-length="6"
            :max-length="6"
            @code="emailCode = $event.code"
            @keydown.enter.prevent="handleEnterForCode"
            @invalid="invalidEmailCode = $event.invalid" />
          <q-btn
            :disable="loading.login || invalidEmailCode"
            rounded
            no-caps
            unelevated
            size="16px"
            color="dark"
            label="Log In"
            class="q-my-xs full-width"
            :loading="loading.login || loading.emailCode"
            @click="emailCodeEntered" />
          <q-separator
            class="q-my-lg q-mx-xl"
            inset />
          <div class="column text-body2">
            Didn't receive an email?
            <div>
              <a
                href=""
                style="text-decoration: none"
                @click.stop.prevent="sendEmail({resend: true})">
                Resend code
              </a>
              or
              <a
                href=""
                style="text-decoration: none"
                @click.stop.prevent="backToEmailInput()">
                change email
              </a>
            </div>
          </div>
        </div>

        <div v-if="showEmailCodeAuthenticated">
          <p class="q-mt-md">
            <q-icon name="fas fa-check" />
            Email Code Authenticated.
          </p>
        </div>
      </div>

      <div v-else-if="showTotpCode">
        <div class="q-mb-lg">
          Your wallet has Two-Factor Authentication enabled. Please enter
          the six digit code from your Two-Factor Authentication app.
        </div>
        <code-input
          :min-length="6"
          :max-length="6"
          @code="totpCode = $event.code"
          @invalid="invalidTotpCode = $event.invalid" />
        <q-btn
          :disable="loading.twoFactorLogin || invalidTotpCode"
          rounded
          no-caps
          unelevated
          size="16px"
          color="dark"
          label="Log In"
          class="q-my-xs full-width"
          :loading="loading.twoFactorLogin"
          @click="totpCodeEntered" />
        <div v-if="hasRecoveryEmail">
          <q-separator
            class="q-my-lg q-mx-xl"
            inset />
          <div class="column text-body2">
            Can't access your authenticator app?
            <a
              href=""
              style="text-decoration: none"
              @click.stop.prevent="sendRecoveryEmail">
              Use your recovery email</a>
          </div>
        </div>
      </div>

      <div v-else-if="showRecoveryEmailCode">
        <div class="q-mb-lg">
          An email has been sent to the recovery email associated with your
          account. Please enter the code from that email below.
        </div>
        <code-input
          :min-length="6"
          :max-length="6"
          @code="recoveryEmailCode = $event.code"
          @invalid="invalidRecoveryEmailCode = $event.invalid" />
        <q-btn
          :disable="invalidRecoveryEmailCode || ctrl.loading"
          rounded
          no-caps
          unelevated
          size="16px"
          color="dark"
          label="Log In"
          :loading="ctrl.loading"
          class="q-my-xs full-width"
          @click="recoveryEmailCodeEntered" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2018-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {email, required} from '@vuelidate/validators';
import CodeInput from './CodeInput.vue';
import {config} from '@bedrock/web';
import {LoginController} from '@bedrock/web-authn-token';
import {session} from '@bedrock/web-session';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'LoginForm',
  components: {CodeInput},
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
      showEmailCode: false,
      showTotpCode: true,
      hasRecoveryEmailCode: false,
      showRecoveryEmailCode: false,
      loading: {
        emailCode: false,
        login: false,
        twoFactorLogin: false
      },
      showEmailCodeAuthenticated: false,
      customErrorMessage:
        'Too many login requests, check your email for a log in code.'
    };
  },
  computed: {
    domain() {
      return window.location.hostname;
    },
    title() {
      if(this.showRecoveryEmailCode) {
        return 'Login: Recovery Email Code';
      }
      if(this.showTotpCode) {
        return 'Login: Two-factor Authentication';
      }
      return 'Login';
    }
  },
  beforeCreate() {
    this._ctrl = new LoginController();
  },
  validations: {
    ctrl: {
      email: {required, email}
    }
  },
  methods: {
    async sendEmail({resend} = {resend: false}) {
      if(this.loading.emailCode) {
        return;
      }
      let errorMessage = '';
      try {
        const {email} = this.ctrl;
        this.loading.emailCode = true;
        // create nonce for email authentication; it will send email as well
        await this._ctrl.tokenService.create({
          email,
          type: 'nonce',
          authenticationMethod: 'login-email-challenge'
        });
      } catch(e) {
        console.error('sendEmail error', e);
        errorMessage = e.message.includes('No more than 5 tokens') ?
          this.customErrorMessage : e.message;
        this.$q.notify({
          timeout: 0,
          type: 'negative',
          message: errorMessage,
          actions: [{icon: 'fa fa-times', color: 'white'}]
        });
      }
      if(!errorMessage || !errorMessage !== this.customErrorMessage) {
        this.showSendEmail = false;
        this.showEmailCode = true;
        this.emailCode = '';
        if(resend && !errorMessage) {
          this.$q.notify({
            timeout: 5000,
            type: 'positive',
            message: 'A new log in code has been sent.',
            actions: [{icon: 'fa fa-times', color: 'white'}]
          });
        }
      }
      this.loading.emailCode = false;
    },
    handleEnterForEmail() {
      if(this.loading.emailCode || this.vuelidate.ctrl.email.$invalid) {
        return;
      }
      this.sendEmail();
    },
    backToEmailInput() {
      if(this.loading.emailCode) {
        return;
      }
      this.showSendEmail = true;
      this.showEmailCode = false;
      this.emailCode = '';
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
          this.$q.notify({message, actions: [{icon: 'fa fa-times'}]});
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
      // check if email authentication is required
      const emailAuthnRequired = this.requiresMethod({
        method: 'login-email-challenge',
        authenticatedMethods: result.result.authenticatedMethods,
        requiredAuthenticationMethods:
          result.result.requiredAuthenticationMethods
      });
      if(emailAuthnRequired) {
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
        this.$q.notify({message, actions: [{icon: 'fa fa-times'}]});
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
          message,
          timeout: 0,
          type: 'negative',
          actions: [{icon: 'fa fa-times', color: 'white'}]
        });
        return;
      }
      await this.$emitExtendable('login');
    },
    async register() {
      if(!this.loading.emailCode) {
        await this.$emitExtendable('register');
      }
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
