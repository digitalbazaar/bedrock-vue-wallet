<template>
  <div>
    <div
      class="text-subtitle1 text-bold q-mb-sm">
      <span
        v-if="hasTwoFactor">
        Two-Factor Authentication is enabled.
      </span>
      <span
        v-else>
        Two-Factor Authentication is not enabled yet.
      </span>
    </div>
    <p>
      Two-factor authentication adds an additional layer of security to your
      account by requiring more than just a code sent to your email.
    </p>
    <div v-if="!hasTwoFactor">
      <q-btn
        label="Enable Two-Factor Authentication"
        color="primary"
        class="q-px-md"
        @click="enable" />
    </div>
    <div v-else>
      <q-separator class="q-mb-md" />

      <div
        class="text-subtitle2 text-bold q-mb-sm">
        Secondary Recovery Email
      </div>
      <p>
        Your secondary recovery email can be updated at anytime and is used to
        recover your account in the event you lose access to your two-factor
        authentication device.
      </p>
      <q-input
        v-model="recoveryEmail"
        clearable
        outlined
        stack-label
        class="q-mb-md"
        type="text"
        label="Secondary Recovery Email (Optional)"
        hint="Update your secondary recovery email."
        :error="$v.recoveryEmail.$error"
        error-message="The email entered is invalid."
        @input="handleEmailChange()"
        @blur="$v.recoveryEmail.$touch" />
      <q-btn
        label="Save"
        color="primary"
        class="full-width"
        style="max-width: 250px"
        :disable="loading || $v.recoveryEmail.$invalid || disabled"
        :loading="loading"
        @click="save" />

      <q-separator class="q-my-md" />

      <div
        class="text-subtitle2 text-bold q-mb-sm">
        Authentication Device
      </div>
      <p>
        An authentication device is active.
      </p>

      <q-separator class="q-my-md" />

      <p>
        You may remove all two-factor authentication methods at any time by
        clicking the button below. Once removed, you will have the ability to
        set them up again.
      </p>
      <q-btn
        outline
        label="Remove"
        color="negative"
        class="full-width"
        style="max-width: 250px"
        @click="remove" />
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {email} from 'vuelidate/lib/validators';
import {AccountService} from 'bedrock-web-account';
import {session} from 'bedrock-web-session';
import {TokenService} from 'bedrock-web-authn-token';

export default {
  name: 'TwoFactorSettings',
  props: {},
  data() {
    return {
      hasTwoFactor: false,
      recoveryEmail: '',
      disabled: true,
      loading: false,
      initialRecoveryEmail: ''
    };
  },
  beforeCreate() {
    this._accountService = new AccountService();
    this._tokenService = new TokenService();
  },
  async created() {
    // FIXME error handling
    const account = await this.getAccountId();
    const fullAccount = await this._accountService.get({id: account});
    // FIXME: gets back meta

    const authRequirements =
      await this._tokenService.getAuthenticationRequirements({
        account
      });

    this.hasTwoFactor = authRequirements.requiredAuthenticationMethods
      .some(method => {
        const totpMethod = 'totp-challenge';
        return method === totpMethod ||
          (Array.isArray(method) && method.includes(totpMethod));
      });
    this.recoveryEmail = fullAccount.account.recoveryEmail || '';
    this.initialRecoveryEmail = fullAccount.account.recoveryEmail || '';
  },
  validations: {
    recoveryEmail: {email}
  },
  methods: {
    enable() {
      // FIXME: emit an event instead of changing routes in a component
      this.$router.push({name: 'settings-two-factor-setup'});
    },
    // FIXME use shared code with TwoFactorStepper
    async getAccountId() {
      // FIXME error handling
      await session.refresh();
      const {account = null} = session.data;
      // if(!account) ...
      return account.id;
    },
    async setAuthenticationRequirements({account, totp, recoveryEmail}) {
      // TODO: update rather than full overwrite
      const requiredAuthenticationMethods = [
        'token-client-registration',
        'login-email-challenge'
      ];
      if(totp || recoveryEmail) {
        requiredAuthenticationMethods.push([
          ...(totp ? ['totp-challenge'] : []),
          ...(recoveryEmail ? ['recovery-email-challenge'] : [])
        ]);
      }
      await this._tokenService.setAuthenticationRequirements({
        account,
        requiredAuthenticationMethods
      });
    },
    async save() {
      this.loading = true;
      try {
        // FIXME error handling
        const account = await this.getAccountId();
        await this._tokenService.setRecoveryEmail({
          account,
          recoveryEmail: this.recoveryEmail || ''
        });
        await this.setAuthenticationRequirements({
          account, totp: true, recoveryEmail: !!this.recoveryEmail
        });
        this.$q.notify({
          message: 'Your recovery email has been updated.',
          color: 'green',
          icon: 'fas fa-thumbs-up',
          position: 'bottom'
        });
        this.initialRecoveryEmail = this.recoveryEmail;
        this.disabled = true;
      } catch(e) {
        console.log('Error: ', e);
      } finally {
        this.loading = false;
      }
    },
    async remove() {
      // FIXME error handling
      const account = await this.getAccountId();
      await this.setAuthenticationRequirements({
        account, totp: false, recoveryEmail: false
      });
      this.hasTwoFactor = false;
    },
    handleEmailChange() {
      if(this.recoveryEmail !== this.initialRecoveryEmail) {
        this.disabled = false;
        return;
      }
      this.disabled = true;
    }
  }
};
</script>

<style>
</style>
