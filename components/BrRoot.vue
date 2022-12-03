<template>
  <q-layout
    view="hHh LpR fFf"
    class="s-page">
    <q-header
      v-if="!chapi"
      class="shadow-3">
      <wallet-header
        :account="account"
        :logout="logout"
        :toggle-drawer="toggleDrawer" />
    </q-header>

    <q-page-container>
      <q-drawer
        v-model="showDrawer"
        class="lt-md"
        side="left">
        <drawer :account="account" />
      </q-drawer>
      <router-view :account="account" />
    </q-page-container>

    <q-footer />
  </q-layout>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {AccountService} from '@bedrock/web-account';
import {computed} from 'vue';
import {config} from '@bedrock/web';
import Drawer from './Drawer.vue';
import {installHandler} from 'web-credential-handler';
import {TokenService} from '@bedrock/web-authn-token';
import {session, sessionDataRef} from '../lib/session.js';
import WalletHeader from './WalletHeader.vue';

export default {
  name: 'WalletLayout',
  components: {
    Drawer,
    WalletHeader
  },
  setup() {
    const account = computed(() => {
      return sessionDataRef.value?.account?.id ?? '';
    });

    return {
      account
    };
  },
  data() {
    return {
      showDrawer: false
    };
  },
  computed: {
    chapi() {
      return this.$route.meta.chapi;
    },
    displayDrawer() {
      return this.$q.screen.lt.md;
    }
  },
  watch: {
    displayDrawer(newVal) {
      if(!newVal) {
        this.showDrawer = false;
      }
    },
    async account(newVal) {
      // FIXME: move this code into vanilla Web app layer (out of Vue layer)

      // if not in CHAPI and the user logs in, ensure the credential handler
      // gets installed
      const accountId = newVal;
      if(!this.$route.meta.chapi && accountId) {
        try {
          // install credential handler and add a hint for this account
          const registration = await installHandler(
            {url: '/credential-handler'});
          await registration.credentialManager.hints.set(
            accountId, {
              name: config.vueWallet.branding.shortName,
              enabledTypes: ['VerifiablePresentation']
            });
        } catch(e) {
          // eslint-disable-line no-console
          console.error('CHAPI register error:', e);
          this.$q.notify({
            type: 'negative',
            message:
              'Your wallet will not be shown to you as an option for using ' +
              'credentials on other websites. Please reload the page and ' +
              'select "Accept" to change this.',
            actions: [{icon: 'fa fa-times'}]
          });
        }
      }
    }
  },
  beforeCreate() {
    this._accountService = new AccountService();
    this._tokenService = new TokenService();
  },
  methods: {
    async cleanup() {
      this.showDrawer = false;
    },
    async logout() {
      this.cleanup();
      await session.end();
      if(this.$route.path !== '/') {
        this.$router.push({path: '/'});
      }
    },
    toggleDrawer() {
      this.showDrawer = !this.showDrawer;
    }
  }
};
</script>

<style scoped>
.s-page {
  background: rgb(240, 240, 240);
}
</style>
