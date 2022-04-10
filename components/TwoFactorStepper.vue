<template>
  <div
    class="full-width"
    style="max-width: 600px">
    <br-q-title-card
      :title="step + '. ' + title"
      class="full-width">
      <div
        slot="body">
        <div class="column">
          <div
            v-if="step === 1"
            class="q-pa-md">
            <p class="text-left">
              Your secondary recovery email is used to recover your account
              in the event you lose access to your two-factor authentication
              device.
            </p>
            <q-input
              v-model="recoveryEmail"
              outlined
              stack-label
              type="text"
              label="Secondary Recovery Email (Optional)"
              hint="Add a secondary recovery email."
              :error="$v.recoveryEmail.$error"
              error-message="The email entered is invalid."
              @blur="$v.recoveryEmail.$touch" />
          </div>
          <!-- <div v-if="step === 2">
            <p class="text-left q-pa-md q-mb-none">
              Recovery codes are used to access your account in the event you
              cannot receive two-factor authentication codes.
            </p>
            <div>
              <q-separator />
            </div>
            <p class="text-left q-pa-md q-mb-none bg-yellow-2">
              Download or copy your recovery codes before continuing two-factor
              authentication setup below.
            </p>
            <div>
              <q-separator />
            </div>
            <div class="q-px-xl q-pt-md row text-h5">
              <div
                v-for="recoveryCode in recoveryCodes"
                :key="recoveryCode"
                class="col-sm-6 col-xs-12 row justify-center">
                <div
                  class="row items-center full-width"
                  style="max-width: 175px">
                  <q-icon
                    name="fas fa-circle"
                    class="text-grey"
                    style="font-size: 10px" />
                  <div class="q-ml-sm">{{recoveryCode}}</div>
                </div>
              </div>
            </div>
            <div class="row justify-center q-pt-md q-px-md">
              <div
                class="full-width q-pr-sm"
                style="max-width: 150px">
                <q-btn
                  outline
                  label="Download"
                  color="primary"
                  class="full-width"
                  @click="download" />
              </div>
              <div
                class="full-width q-pl-sm"
                style="max-width: 150px">
                <q-btn
                  outline
                  label="Copy"
                  color="primary"
                  class="full-width"
                  @click="copy" />
              </div>
            </div>
            <p class="text-left q-pa-md q-mb-none">
              Treat your recovery codes with the same level of attention as
              you would a password! We recommend saving them with a password
              manager such as Lastpass.
            </p>
          </div> -->
          <div
            v-if="step === 2"
            class="q-pa-md">
            <p class="text-left">
              Scan the image below with the two-factor authentication app on
              your phone, click the image to launch your authentication app, or
              manually enter the text details.
            </p>
            <q-tabs
              v-model="otpTab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify">
              <q-tab
                name="qrcode"
                label="QR Code" />
              <q-tab
                name="text"
                label="Text" />
            </q-tabs>

            <q-separator />

            <q-tab-panels
              v-model="otpTab">
              <q-tab-panel
                name="qrcode">
                <div
                  v-if="qrImageUrl"
                  class="q-mb-md">
                  <a :href="otpInfo.otpAuthUrl">
                    <qr-code
                      :url="qrImageUrl" />
                  </a>
                </div>
              </q-tab-panel>
              <q-tab-panel
                name="text">
                <div
                  v-if="otpInfo">
                  <q-table
                    :data="otpTableData"
                    :columns="otpTableColumns"
                    row-key="parameter"
                    hide-bottom />
                </div>
              </q-tab-panel>
            </q-tab-panels>

            <p class="text-left text-bold q-mb-none">
              Enter the six-digit code from the application
            </p>
            <p class="text-left q-mb-none">
              After setting up your two-factor authentication app it will
              display a six-digit code to enter below.
            </p>
            <code-input
              hint="Please enter the code from your two-factor app."
              :min-length="6"
              :max-length="6"
              @code="code = $event.code"
              @invalid="invalid = $event.invalid" />
          </div>
        </div>
        <div>
          <q-separator />
        </div>
        <div class="row justify-between q-pa-md">
          <div class="col-6 q-pr-sm">
            <q-btn
              outline
              label="Cancel"
              color="primary"
              class="full-width"
              @click="cancel" />
          </div>
          <div class="col-6 q-pl-sm">
            <q-btn
              :disable="loading || step === 2 && invalid"
              :label="step === 2 ? 'Enable' : 'Next'"
              :loading="loading"
              color="primary"
              class="full-width"
              @click="next" />
          </div>
        </div>
      </div>
    </br-q-title-card>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {AccountService} from '@bedrock/web-account';
import {BrQTitleCard} from '@bedrock/quasar-components';
import CodeInput from './CodeInput.vue';
import {config} from '@bedrock/web';
import {email} from 'vuelidate/lib/validators';
import {getTwoFactorCodes} from '../mocks/twoFactorCodes.js';
import QrCode from './QrCode.vue';
import {session} from '@bedrock/web-session';
import {TokenService} from '@bedrock/web-authn-token';

export default {
  name: 'TwoFactorStepper',
  components: {BrQTitleCard, CodeInput, QrCode},
  data() {
    return {
      recoveryEmail: '',
      code: '',
      invalid: true,
      step: 1,
      otpInfo: null,
      otpTab: 'qrcode',
      otpTableColumns: [
        {
          name: 'parameter',
          label: 'Parameter',
          field: 'parameter',
          align: 'left',
          sortable: true
        },
        {
          name: 'value',
          label: 'Value',
          field: 'value',
          align: 'left'
        }
      ],
      loading: false
    };
  },
  computed: {
    title() {
      if(this.step === 1) {
        return 'Secondary Recovery Email';
      }
      // if(this.step === 2) {
      //   return 'Recovery Codes';
      // }
      if(this.step === 2) {
        return 'Scan Bar Code';
      }
      return '';
    },
    otpTableData() {
      return [
        {
          parameter: 'Secret',
          value: this.otpInfo.secret
        },
        {
          parameter: 'Algorithm',
          value: this.otpInfo.algorithm
        },
        {
          parameter: 'Digits',
          value: this.otpInfo.digits
        },
        {
          parameter: 'Time Step',
          value: this.otpInfo.step
        }
      ];
    }
  },
  beforeCreate() {
    this._accountService = new AccountService();
    this._tokenService = new TokenService();
  },
  asyncComputed: {
    // TODO: Needs to generate real Two-Factor codes
    async recoveryCodes() {
      return getTwoFactorCodes();
    },
    async qrImageUrl() {
      if(this.otpInfo) {
        return this.otpInfo.otpAuthUrl;
      }
      return '';
    }
  },
  validations: {
    recoveryEmail: {email}
  },
  methods: {
    cancel() {
      // FIXME: emit an event instead of changing routes in a component
      this.$router.push({name: 'settings'});
    },
    // FIXME use shared code with TwoFactorSettings
    async getAccountId() {
      // FIXME error handling
      await session.refresh();
      const {account = null} = session.data;
      // if(!account) ...
      return account.id;
    },
    async removeTotp({account}) {
      await this._tokenService.remove({
        account,
        type: 'totp'
      });
    },
    async createTotp({account}) {
      const result = await this._tokenService.create({
        account,
        type: 'totp',
        authenticationMethod: 'totp-challenge',
        serviceId: config.vueWallet.branding.shortName
      });
      this.otpInfo = result.result;
    },
    async verifyTotpCode({account}) {
      const fullAccount = await this._accountService.get({id: account});
      const result = await this._tokenService.authenticate({
        //account,
        email: fullAccount.account.email,
        type: 'totp',
        authenticationMethod: 'totp-challenge',
        challenge: this.code
      });
      if(result.result.authenticated) {
        await this.setAuthenticationRequirements({
          account, totp: true, recoveryEmail: !!this.recoveryEmail
        });
      }
    },
    async setRecoveryEmail({account}) {
      await this._tokenService.setRecoveryEmail({
        account,
        recoveryEmail: this.recoveryEmail || ''
      });
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
    async next() {
      const account = await this.getAccountId();
      if(this.step === 1) {
        this.step = 2;
        await this.removeTotp({account});
        await this.createTotp({account});
        return;
      }
      if(this.step === 2) {
        await this.setRecoveryEmail({account});
        try {
          await this.verifyTotpCode({account});
        } catch(e) {
          let message;
          if(e.type === 'NotAllowedError') {
            message = 'The code you entered was incorrect. Please try again.';
          } else {
            message = e.message;
          }
          this.$q.notify({
            message,
            actions: [{icon: 'fa fa-times'}]
          });
          return;
        } finally {
          this.loading = false;
        }
        // FIXME: emit an event instead of changing routes in a component
        this.$router.push({name: 'settings'});
        return;
      }
    },
    download() {
      // TODO: Allow user to download codes
      console.log('Download Clicked');
    },
    copy() {
      // TODO: Copy codes to clipboard
      console.log('Copy Clicked');
    }
  }
};
</script>

<style scoped>
</style>
