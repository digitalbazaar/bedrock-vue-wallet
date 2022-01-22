<template>
  <q-page
    class="q-pa-md"
    :class="$q.screen.lt.md ? 'column' : 'row justify-center'">
    <div
      v-if="$q.screen.lt.md"
      class="col-12 q-mb-md">
      <div>
        <settings-module
          title="Settings">
          <div
            v-if="loading"
            class="q-gutter-md row justify-center">
            <q-spinner-tail
              color="primary"
              size="5em" />
          </div>
          <q-select
            v-else
            v-model="settingsSelection"
            outlined
            stack-label
            label="Choose Settings"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            :options="settingList"
            @input="handleSelect()" />
        </settings-module>
      </div>
    </div>
    <div
      v-if="$q.screen.gt.sm"
      class="col-3">
      <div class="q-mr-md">
        <settings-module
          title="General Settings"
          no-padding
          custom-bg="bg-grey-2">
          <q-list separator>
            <q-item
              v-ripple
              clickable
              :active="settingsPageMode === 'account-settings'"
              active-class="text-primary"
              @click="navigateTo('account-settings')">
              <q-item-section>Account</q-item-section>
            </q-item>
          </q-list>
        </settings-module>
        <settings-module
          title="Profile Settings"
          no-padding
          custom-bg="bg-grey-2"
          class="q-my-md">
          <div
            v-if="loading"
            class="q-gutter-md row justify-center q-pa-md">
            <q-spinner-tail
              color="primary"
              size="2em" />
          </div>
          <q-list separator>
            <q-item
              v-for="profile in profiles"
              :key="profile.id"
              v-ripple
              :clickable="profile.id !== $route.params.profileId"
              :active="profile.id === $route.params.profileId"
              active-class="text-primary"
              @click="navigateTo('profile-settings', profile.id)">
              <q-item-section>{{profile.name}}</q-item-section>
            </q-item>
          </q-list>
        </settings-module>
      </div>
    </div>
    <div class="col-xs-12 col-md-9">
      <div>
        <settings-module
          :title="label">
          <template v-if="settingsPageMode === 'account-settings'">
            <general-settings />
          </template>
          <template v-if="settingsPageMode === 'profile-settings'">
            <div
              v-if="loading"
              class="q-gutter-md row justify-center">
              <q-spinner-tail
                color="primary"
                size="5em" />
            </div>
            <profile-settings
              v-else
              :active-profile="activeProfile" />
          </template>
        </settings-module>
        <settings-module
          v-if="settingsPageMode === 'account-settings'"
          title="Two-Factor Authentication"
          class="q-my-md">
          <two-factor-settings />
        </settings-module>
        <settings-module
          v-if="showAccessManagement"
          title="Access Management"
          class="q-my-md"
          no-padding>
          <access-management :profile-id="$route.params.profileId" />
        </settings-module>
      </div>
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import AccessManagement from '../components/AccessManagement.vue';
import GeneralSettings from '../components/GeneralSettings.vue';
import {profileManager} from 'bedrock-web-wallet';
import ProfileSettings from '../components/ProfileSettings.vue';
import SettingsModule from '../components/SettingsModule.vue';
import TwoFactorSettings from '../components/TwoFactorSettings.vue';

export default {
  name: 'SettingsPage',
  components: {
    SettingsModule,
    GeneralSettings,
    ProfileSettings,
    TwoFactorSettings,
    AccessManagement
  },
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {
      profiles: [],
      loading: false,
      settingList: [],
      settingsSelection: ''
    };
  },
  asyncComputed: {
    activeProfile: {
      async get() {
        const {profiles} = this;
        if(!profiles || (Array.isArray(profiles) && profiles.length === 0)) {
          return {};
        }
        const {settingsPageMode, $route} = this;
        const {profileId} = $route.params;
        if(settingsPageMode === 'profile-settings') {
          const profile = profiles.find(profile => profile.id === profileId);
          if(!profile) {
            // if a profile is not found, we will change the route to account
            // settings
            return this.$emitExtendable('redirect', {
              route: {name: 'settings'}
            });
          }
          return profile;
        }
        return {};
      },
      default() {
        return {};
      }
    }
  },
  computed: {
    label() {
      const {settingsPageMode} = this;
      if(settingsPageMode === 'profile-settings') {
        return 'Profile Settings';
      }
      return 'Account Settings';
    },
    settingsPageMode() {
      const {name} = this.$route;
      if(name === 'settings-profile') {
        return 'profile-settings';
      }
      // default to account settings
      return 'account-settings';
    },
    showAccessManagement() {
      return this.settingsPageMode === 'profile-settings' &&
        (this.activeProfile || {}).shared;
    }
  },
  watch: {
    activeProfile: {
      handler(profile) {
        if(profile && profile.id) {
          this.settingsSelection = profile.id;
          return;
        }
        this.settingsSelection = 'account';
      },
      immediate: true
    }
  },
  async created() {
    this.loading = true;
    // redirect to the specified page
    this.$on('redirect', event => {
      event.waitUntil(this.$router.replace(event.route));
    });
    try {
      const profiles = await profileManager.getProfiles({type: 'Person'});
      profiles.sort(({name: nameA}, {name: nameB}) =>
        nameA.toLowerCase().localeCompare(nameB.toLowerCase()));
      this.profiles = profiles;
      this.settingList = [
        {
          name: 'Account',
          id: 'account'
        },
        ...this.profiles.map(x => {
          return {
            name: x.name,
            id: x.id
          };
        })
      ];
    } catch(e) {
      console.log('Error: ', e);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async navigateTo(location, profileId) {
      if(location === 'account-settings') {
        await this.$router.push({name: 'settings'});
      } else if(location === 'profile-settings') {
        await this.$router.push({
          name: 'settings-profile',
          params: {profileId}
        });
      }
    },
    async handleSelect() {
      if(this.settingsSelection === 'account') {
        this.navigateTo('account-settings');
        return;
      }
      const id = this.settingsSelection;
      this.navigateTo('profile-settings', id);
    }
  }
};
</script>

<style scoped>
</style>
