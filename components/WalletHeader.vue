<template>
  <q-toolbar class="bg-secondary">
    <q-btn
      v-show="account && !hideNavigation"
      flat
      round
      dense
      color="info"
      icon="fa fa-bars"
      class="toggle-drawer-btn lt-md"
      @click="toggleDrawer()" />
    <q-toolbar-title
      class="row"
      @click="!hideNavigation && home()">
      <img
        v-if="branding.logo"
        :src="branding.logo"
        :style="$q.screen.lt.sm ? `height: ${branding.logoSize.mobile}` :
          `height: ${branding.logoSize.desktop}`">
      <div v-else>
        {{branding.name}}
      </div>
    </q-toolbar-title>
    <q-btn-toggle
      v-if="account && !hideNavigation"
      v-model="navRouteName"
      color="accent"
      toggle-color="info"
      class="gt-sm"
      flat
      :options="[
        {label: 'Credentials', value: 'home'},
        {label: 'Profiles', value: 'profiles'},
        {label: 'Settings', value: 'settings'},
        {label: 'Log Out', value: 'logout'}
      ]"
      @click="handleNav()" />
    <q-btn
      v-else-if="!hideNavigation"
      flat
      no-wrap
      color="info"
      icon="fa fa-sign-in-alt"
      label="Log in"
      @click="login()" />
  </q-toolbar>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/web';

export default {
  name: 'WalletHeader',
  props: {
    account: {
      type: String,
      default: undefined
    },
    logout: {
      type: Function,
      default: undefined
    },
    toggleDrawer: {
      type: Function,
      default: undefined
    },
    hideNavigation: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      branding: config.vueWallet.branding,
      // FIXME: enable customization of the routes that show up in the
      // navigation drawer
      navRouteName: ''
    };
  },
  computed: {},
  watch: {
    $route() {
      this.navRouteName = this.$route.name;
    }
  },
  created() {
    this.navRouteName = this.$route.name;
  },
  methods: {
    async routerPush(options) {
      // avoid NavigationDuplicated errors
      if((options.path && (options.path !== this.$route.path)) ||
        (options.name && (options.name !== this.$route.name))) {
        await this.$router.push(options);
      }
    },
    async home() {
      // if user is logged in, go home, otherwise to go landing
      const options = {};
      if(this.account) {
        options.name = 'home';
      } else {
        options.path = '/';
      }
      await this.routerPush(options);
    },
    async login() {
      await this.routerPush({name: 'login'});
    },
    async settings() {
      await this.routerPush({name: 'settings'});
    },
    async handleNav() {
      if(this.navRouteName === 'logout') {
        this.logout();
      } else {
        await this.routerPush({name: this.navRouteName});
      }
    },
    async interact() {
      await this.routerPush({name: 'interact'});
    },
  }
};
</script>

<style lang="scss" scoped>
$breakpoint-sm: 1023px;
$breakpoint-xs: 599px;

@mixin mobile {
  @media (min-width: 0) and (max-width: #{$breakpoint-sm}) {
    @content;
  }
}

.profile-name {
  line-height: 14px !important;
  text-transform: none;
}

.add-persona-btn,
.persona-btn,
.toggle-drawer-btn {
  padding: 4px 0px;
  font-size: 14px !important;
}

.persona-btn {
  .profile-text {
    @include mobile {
      display: none;
    }
  }
}
</style>
