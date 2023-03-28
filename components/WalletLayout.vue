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
import {session, sessionDataRef} from '../lib/session.js';
import {AccountService} from '@bedrock/web-account';
import {computed} from 'vue';
import Drawer from './Drawer.vue';
import {installHandler} from 'web-credential-handler';
import {TokenService} from '@bedrock/web-authn-token';
import WalletHeader from './WalletHeader.vue';

export default {
  name: 'WalletLayout',
  components: {
    Drawer,
    WalletHeader
  },
  props: {
    installHandler: {
      type: Boolean,
      default: true
    }
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
          // if the prop installHandler is false don't install
          if(this.installHandler === false) {
            return;
          }
          // install credential handler
          await installHandler({url: '/credential-handler'});
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
