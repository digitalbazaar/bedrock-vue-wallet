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
            :options="settingList" />
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
        <settings-module
          v-if="chapiEnabled"
          title="Wallet Selection"
          class="q-my-md">
          <div>
            <p>
              When other websites request or offer credentials, your browser
              shows a wallet selector. If your wallet is not displayed in the
              selector and you would like it to be, click "Show Wallet" to
              request permission to show it in your browser's wallet selector.
            </p>
            <q-btn
              label="Show Wallet"
              color="primary"
              class="full-width"
              style="max-width: 250px"
              :disable="loading"
              :loading="loading"
              @click="showWallet()" />
          </div>
        </settings-module>
      </div>
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2015-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import AccessManagement from '../components/AccessManagement.vue';
import {addWalletToChapi} from '../lib/helpers.js';
import {config} from '@bedrock/web';
import GeneralSettings from '../components/GeneralSettings.vue';
import {profileManager} from '@bedrock/web-wallet';
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
  setup() {
    const route = useRoute();
    const router = useRouter();

    const settingsPageMode = computed(() => {
      return route && route.name === 'settings-profile' ?
        'profile-settings' : 'account-settings';
    });

    // active profile is set if `profile-settings` is used and the profile ID
    // in the route matches a profile, otherwise it is empty
    const profiles = ref([]);
    const activeProfile = computed(() => {
      if(profiles.value.length === 0 ||
        settingsPageMode.value !== 'profile-settings') {
        return {};
      }
      const {profileId} = route.params;
      return profiles.value.find(p => p.id === profileId);
    });

    // when the active profile changes, update the selection value
    const settingsSelection = ref('');
    watch(
      () => activeProfile.value,
      profile => {
        settingsSelection.value = profile?.id ?? 'account';
        if(!profile) {
          // if no profile is set, change the route to account settings
          router.replace({name: 'settings'});
        }
      },
      {immediate: true});

    // used to navigate to the appropriate settings route
    const navigateTo = async (location, profileId) => {
      if(location === 'account-settings') {
        await router.push({name: 'settings'});
      } else if(location === 'profile-settings') {
        await router.push({name: 'settings-profile', params: {profileId}});
      }
    };

    // when a different selection is made, navigate to the appropriate
    // settings page
    watch(
      () => settingsSelection.value,
      selection => {
        if(selection === 'account') {
          navigateTo('account-settings');
          return;
        }
        navigateTo('profile-settings', selection);
      });

    const label = computed(() => settingsPageMode.value === 'profile-settings' ?
      'Profile Settings' : 'Account Settings');

    const showAccessManagement = computed(() =>
      settingsPageMode.value === 'profile-settings' &&
      activeProfile.value?.shared);

    const chapiEnabled = ref(!config?.vueWallet?.disableChapi);
    const showWallet = async () => addWalletToChapi();

    return {
      activeProfile,
      chapiEnabled,
      label,
      profiles,
      navigateTo,
      settingsPageMode,
      settingsSelection,
      showAccessManagement,
      showWallet
    };
  },
  data() {
    return {
      loading: false,
      settingList: []
    };
  },
  async created() {
    this.loading = true;
    try {
      const profiles = await profileManager.getProfiles({useCache: true});
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
  }
};
</script>

<style scoped>
</style>
