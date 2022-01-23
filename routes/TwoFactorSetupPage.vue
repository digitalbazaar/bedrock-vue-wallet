<template>
  <q-page
    class="row justify-center q-pa-md">
    <div
      v-if="!stepper"
      class="full-width"
      style="max-width: 600px">
      <br-q-title-card
        title="Two-Factor Authentication Setup"
        class="full-width">
        <div
          slot="body">
          <div class="column q-pa-md">
            <p class="text-left">
              Two-factor authentication adds an extra layer of security to your
              account. In addition to the code sent to your email, you'll need
              to enter a code sent to you via an app on your phone.
            </p>
            <ol>
              <li>
                <p class="text-left">
                  When you sign in you'll use the code sent to your email, like
                  always.
                </p>
              </li>
              <li>
                <p class="text-left">
                  After entering the code from your email, you'll need to enter
                  an additional code from your phone or tablet.
                </p>
              </li>
              <li>
                <p class="text-left">
                  Once you enter the additional code on the website, you'll be
                  logged into {{branding.name}}.
                </p>
              </li>
            </ol>
            <div>
              <q-separator class="q-mb-md" />
            </div>
            <div class="row justify-center">
              <div
                class="column"
                style="max-width: 350px">
                <p class="text-left">
                  Use an application on your phone to get two-factor
                  authentication codes when prompted.
                </p>
                <q-btn
                  label="Set Up Using An App"
                  color="primary"
                  class="q-px-md"
                  @click="setup" />
                <small class="text-left q-mt-md">
                  We recommend using an application such as Authy, 1Password,
                  or LastPass Authenticator. These applications support secure
                  backup of your authentication codes in the cloud and can be
                  restored if you lose access to your device.
                </small>
              </div>
            </div>
          </div>
        </div>
      </br-q-title-card>
    </div>
    <div
      v-else
      class="row justify-center">
      <two-factor-stepper />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQTitleCard} from 'bedrock-quasar-components';
import {config} from 'bedrock-web';
import TwoFactorStepper from '../components/TwoFactorStepper.vue';

export default {
  name: 'TwoFactorSetupPage',
  components: {BrQTitleCard, TwoFactorStepper},
  data() {
    return {
      branding: config.vueWallet.branding,
      stepper: false
    };
  },
  methods: {
    setup() {
      this.stepper = true;
    }
  }
};
</script>

<style scoped>
</style>
