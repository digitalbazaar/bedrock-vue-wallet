<template>
  <q-layout
    v-show="!loadingSession"
    view="hHh LpR fFf"
    class="s-page">
    <q-header
      v-if="!chapi && !loading"
      class="shadow-3">
      <wallet-header
        :account="account"
        :loading-account="loadingAccount"
        :logout="logout"
        :toggle-drawer="toggleDrawer" />
    </q-header>

    <q-page-container>
      <q-drawer
        v-model="showDrawer"
        class="lt-md"
        side="left">
        <drawer
          :account="account"
          :loading-account="loadingAccount" />
      </q-drawer>
      <router-view
        v-if="!loading"
        :account="account" />
    </q-page-container>

    <q-footer />
  </q-layout>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {AccountService} from 'bedrock-web-account';
import {config} from 'bedrock-web';
import Drawer from './Drawer.vue';
import {getRootData} from '../lib/rootData.js';
import {installHandler} from 'web-credential-handler';
import {session} from 'bedrock-web-session';
import {TokenService} from 'bedrock-web-authn-token';
import WalletHeader from './WalletHeader.vue';

export default {
  name: 'BrRoot',
  components: {
    Drawer,
    WalletHeader
  },
  data() {
    return {
      loadingSession: true,
      loadingAccount: true,
      showDrawer: false,
      rootData: null,
      session: null
    };
  },
  computed: {
    account() {
      if(this.hasSessionAccount) {
        return this.session.data.account.id;
      }
      return '';
    },
    chapi() {
      return this.$route.meta.chapi;
    },
    hasSessionAccount() {
      return !!((this.session || {}).data || {}).account;
    },
    loading() {
      return this.loadingSession || this.loadingAccount;
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
  async created() {
    this.rootData = await getRootData();
    await this.initializeSession();
  },
  methods: {
    async cleanup() {
      this.showDrawer = false;
      this.loadingSession = false;
      this.loadingAccount = false;
    },
    async initializeSession() {
      try {
        this.loadingSession = true;
        this.session = session;
      } catch(e) {
        const message =
          'An error has occured. Please refresh the page to try again.';
        this.$q.notify({
          type: 'negative',
          timeout: 0,
          message,
          actions: [{icon: 'fa fa-times', color: 'white'}]
        });
      } finally {
        // ensures that loading always get sets to false, if not the
        // site will fail to display
        this.loadingSession = false;
        this.loadingAccount = false;
      }
    },
    async logout() {
      this.cleanup();
      await this.session.end();
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
