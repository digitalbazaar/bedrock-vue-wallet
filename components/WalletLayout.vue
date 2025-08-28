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
import {computed, ref, watch} from 'vue';
import {session, sessionDataRef} from '../lib/session.js';
import {useRoute, useRouter} from 'vue-router';
import {rootData} from '../lib/rootData.js';
import {useQuasar} from 'quasar';
import WalletHeader from './WalletHeader.vue';

export default {
  name: 'WalletLayout',
  components: {
    WalletHeader
  },
  props: {
    cardDesigns: {
      type: Array,
      default: () => []
    }
  },
  setup() {
    // Refs
    const $q = useQuasar();
    const showDrawer = ref(false);

    // Use functions
    const route = useRoute();
    const router = useRouter();

    // Computed
    const ready = computed(() => rootData.ready);
    const chapi = computed(() => route.meta.chapi);
    const displayDrawer = computed(() => $q.screen.lt.md);
    const account = computed(() => sessionDataRef.value?.account?.id ?? '');

    // Watchers
    watch(() => displayDrawer, newVal => {
      if(!newVal) {
        showDrawer.value = false;
      }
    });

    // Helper functions
    async function cleanup() {
      showDrawer.value = false;
    }

    async function logout() {
      cleanup();
      await session.end();
      if(route.name !== '/') {
        router.push({path: '/'});
      }
    }

    function toggleDrawer() {
      showDrawer.value = !showDrawer.value;
    }

    return {
      chapi,
      ready,
      logout,
      account,
      showDrawer,
      toggleDrawer,
      displayDrawer
    };
  }
};
</script>

<style scoped>
.q-layout__section--marginal {
  /* Hides line of primary color on mobile */
  background-color: transparent;
}
.bg-gradient {
  /* fallback for old browsers */
  background: #FFFFFF;
  /* Chrome 10-25, Safari 5.1-6 */
  background: -webkit-linear-gradient(to bottom, #FFFFFF 20%, #D3D3D3);
  /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
  background: linear-gradient(to bottom, #FFFFFF 20%, #D3D3D3);
}
</style>
