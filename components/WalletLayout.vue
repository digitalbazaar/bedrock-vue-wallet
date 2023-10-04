<template>
  <q-layout
    view="hHh LpR fFf"
    class="s-page">
    <q-header
      v-if="ready && !chapi"
      class="shadow-3">
      <wallet-header
        :account="account"
        :logout="logout"
        :toggle-drawer="toggleDrawer" />
    </q-header>

    <q-inner-loading :showing="!ready">
      <q-spinner-tail
        size="5em"
        color="primary" />
    </q-inner-loading>

    <q-page-container v-if="ready">
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
 * Copyright (c) 2015-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {session, sessionDataRef} from '../lib/session.js';
import {computed} from 'vue';
import Drawer from './Drawer.vue';
import {default as iconSet} from 'quasar/icon-set/fontawesome-v5.js';
import {rootData} from '../lib/rootData.js';
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
  // FIXME: convert to setup()
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
    },
    ready() {
      return rootData.ready;
    }
  },
  watch: {
    displayDrawer(newVal) {
      if(!newVal) {
        this.showDrawer = false;
      }
    }
  },
  beforeMount() {
    // Set icon library
    this.$q.iconSet.set(iconSet);
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
