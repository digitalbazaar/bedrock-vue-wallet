<template>
  <q-toolbar
    class="bg-secondary">
    <q-btn
      v-show="account"
      flat
      round
      dense
      color="info"
      icon="fa fa-bars"
      class="toggle-drawer-btn lt-md"
      @click="toggleDrawer()" />
    <q-toolbar-title
      class="row cursor-pointer"
      @click="home()">
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
      v-if="account"
      v-model="navRouteName"
      color="accent"
      toggle-color="info"
      class="gt-sm"
      flat
      :options="[
        {label: 'Credentials', value: 'home'},
        {label: 'Profiles', value: 'profiles'}
      ]"
      @click="handleNav()" />
    <div v-if="account">
      <q-btn
        v-if="$q.screen.lt.md"
        flat
        no-wrap
        dense
        class="persona-btn q-mr-sm"
        @click="interact()">
        <interact-icon
          :fill="branding.brand.info" />
      </q-btn>
      <q-btn
        flat
        no-wrap
        dense
        color="info"
        icon="fas fa-user-circle"
        class="persona-btn">
        <q-menu
          anchor-click
          fit
          no-wrap
          anchor="bottom right"
          self="top right">
          <q-separator />
          <q-list
            separator
            link
            class="text-subtitle1">
            <q-item
              v-close-popup
              clickable
              @click="settings()">
              <q-item
                avatar
                class="items-center">
                <q-icon
                  name="fas fa-cog"
                  style="font-size: 25px;" />
              </q-item>
              <q-item-section>
                <q-item-label>
                  Settings
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              v-close-popup
              clickable
              @click="logout()">
              <q-item
                avatar
                class="items-center">
                <q-icon
                  name="fa fa-sign-out-alt"
                  style="font-size: 25px;" />
              </q-item>
              <q-item-section>
                <q-item-label>
                  Log Out
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
    <q-btn
      v-else
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
import InteractIcon from './InteractIcon.vue';

export default {
  name: 'WalletHeader',
  components: {InteractIcon},
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
      await this.routerPush({name: this.navRouteName});
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
