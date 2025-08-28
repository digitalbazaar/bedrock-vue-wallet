<template>
  <q-toolbar
    v-if="!isLoginPage && !isRegisterPage && !$route.meta.hideNavbar"
    class="text-dark"
    :class="$q.screen.gt.xs ? 'q-px-lg' : 'q-px-xs'"
    v-bind="$attrs">
    <q-toolbar-title
      class="row"
      @click="!hideNavigation && home()">
      <div
        v-if="branding.logo"
        class="flex q-pl-xs">
        <img
          :src="branding.logo"
          :style="`height: ${branding.logoSize.desktop}; filter:invert(1)`">
      </div>
      <div v-else>
        {{branding.name}}
      </div>
    </q-toolbar-title>
    <div v-if="account && !hideNavigation">
      <q-btn-toggle
        v-model="navRouteName"
        flat
        no-caps
        size="16px"
        :ripple="false"
        class="gt-xs q-ml-md"
        toggle-color="primary"
        :options="[
          {label: 'Credentials', value: 'home'},
          {label: 'Profiles', value: 'profiles'},
        ]"
        @click="handleNav()" />
      <q-btn-dropdown
        v-show="account && !hideNavigation"
        flat
        dense
        rounded
        no-icon-animation
        class="q-pa-sm q-ml-sm"
        :size="$q.screen.gt.xs ? 'sm': 'md'"
        :dropdown-icon="$q.screen.gt.xs ? 'far fa-user' : 'fa fa-bars'">
        <q-list style="min-width: 300px; font-size: 16px">
          <q-item-label header>
            Welcome!
          </q-item-label>
          <q-item
            v-for="menuItem in menuItems"
            :key="menuItem.route"
            v-close-popup
            clickable
            active-class="bg-grey-3"
            :class="menuItem.class + ' q-pa-lg'"
            :active="$route.path === `/${menuItem.route}`"
            @click="navigateTo(menuItem.route)">
            <q-item-section avatar>
              <q-icon
                size="xs"
                :color="$route.path === `/${menuItem.route}`
                  ? 'primary' : 'dark'"
                :name="menuItem.icon" />
            </q-item-section>
            <q-item-section>{{menuItem.label}}</q-item-section>
          </q-item>
          <q-separator
            inset
            spaced />
          <q-item
            v-close-popup
            clickable
            class="q-pa-lg"
            @click="logout">
            <q-item-section avatar>
              <q-icon
                size="xs"
                color="dark"
                name="fa fa-sign-out-alt" />
            </q-item-section>
            <q-item-section>Log Out</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>
    <q-btn
      v-else-if="!hideNavigation"
      rounded
      no-wrap
      no-caps
      unelevated
      color="primary"
      label="Log In / Register"
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
      navRouteName: '',
      menuItems: [
        {
          route: 'home',
          class: 'lt-sm',
          label: 'Credentials',
          icon: 'fa fa-address-card'
        },
        {
          route: 'profiles',
          class: 'lt-sm',
          label: 'Profiles',
          icon: 'fa fa-users'
        },
        {
          route: 'settings',
          class: '',
          label: 'Settings',
          icon: 'fa fa-cog'
        }
      ]
    };
  },
  computed: {
    isLoginPage() {
      return this.$route.path === '/login';
    },
    isRegisterPage() {
      return this.$route.path === '/register';
    }
  },
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
    async navigateTo(routeName) {
      this.navRouteName = routeName;
      this.handleNav();
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
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
