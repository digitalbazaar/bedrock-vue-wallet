<template>
  <q-layout
    view="hHh LpR fFf"
    class="bg-gradient">
    <q-header v-if="ready">
      <wallet-header
        :logout="logout"
        class="bg-white"
        :account="account"
        :hide-navigation="chapi"
        :toggle-drawer="toggleDrawer" />
    </q-header>

    <q-inner-loading :showing="!ready">
      <q-spinner-tail
        size="5em"
        color="primary" />
    </q-inner-loading>

    <q-page-container v-if="ready">
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
import {rootData} from '../lib/rootData.js';
import WalletHeader from './WalletHeader.vue';

export default {
  name: 'WalletLayout',
  components: {
    WalletHeader,
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
.q-layout__section--marginal {
  /* Hides line of primary color on mobile */
  background-color: transparent;
}
.bg-gradient {
  background: #FFFFFF;  /* fallback for old browsers */
  background: -webkit-linear-gradient(to bottom, #FFFFFF 20%, #D3D3D3);  /* Chrome 10-25, Safari 5.1-6 */
  background: linear-gradient(to bottom, #FFFFFF 20%, #D3D3D3); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
}
</style>
