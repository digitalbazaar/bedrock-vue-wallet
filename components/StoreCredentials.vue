<template>
  <q-page
    class="s-page"
    :class="$q.screen.lt.sm ? 's-page-mobile' : 'q-my-md'"
    style="max-width: 600px; border: 1px solid rgba(157, 157, 157, 0.75)">
    <div
      class="q-px-lg"
      style="overflow: auto"
      :style="$q.screen.lt.sm ? 'max-height: calc(100% - 67px)' :
        'max-height: calc(100vh - 102px)'">
      <div class="column">
        <h6 class="text-center q-my-sm">
          Would you like to store these credentials?
        </h6>
      </div>
      <q-separator class="s-separator" />
      <div class="full-width">
        <profile-chooser
          :loading="profilesUpdating"
          :profiles="profiles"
          :selected="selectedProfile"
          @select="$event.waitUntil(selectProfile($event.profile))" />
      </div>
      <div class="column">
        <div
          :style="$q.screen.lt.sm ?
            'border-bottom: 1px solid rgba(157, 157, 157, 0.75)' : ''">
          <credentials-list
            :compact="true"
            :store="true"
            :loading="loading"
            :credentials="verifiableCredential"
            :selected-profile-id="selectedProfileId" />
        </div>
      </div>
    </div>
    <div
      class="self-end row justify-between q-py-md q-px-lg"
      :style="$q.screen.lt.sm ? 'position: fixed' : 'position: sticky'"
      style="max-width: 600px">
      <q-btn
        class="q-mr-sm g-button bg-white"
        no-caps
        outline
        color="primary"
        label="Cancel"
        :disable="loading"
        @click="cancel()" />
      <q-btn
        class="g-button"
        no-caps
        color="primary"
        :disable="loading || !selectedProfile"
        :loading="loading"
        label="Store"
        @click="store()" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {computedAsync} from '@vueuse/core';
import CredentialsList from './CredentialsList.vue';
import {profileManager} from '@bedrock/web-wallet';
import ProfileChooser from './ProfileChooser.vue';
import {ref} from 'vue';

export default {
  name: 'StoreCredentials',
  components: {CredentialsList, ProfileChooser},
  props: {
    account: {
      type: String,
      required: true,
      default: ''
    },
    verifiableCredential: {
      type: Array,
      default: () => [],
      required: true
    },
    loading: {
      type: Boolean,
      required: true,
      default: true
    },
    holder: {
      type: String,
      required: true,
      default: ''
    }
  },
  emits: ['store', 'cancel'],
  setup() {
    const profilesUpdating = ref(true);
    const profiles = computedAsync(
      async () => profileManager.getProfiles({useCache: true}),
      [], profilesUpdating);
    return {
      profiles,
      profilesUpdating
    };
  },
  data() {
    return {
      selectedProfileId: undefined
    };
  },
  computed: {
    selectedProfile() {
      if(!this.profiles) {
        return undefined;
      }
      const holder = this.selectedProfileId || this.holder;
      const profile = this.profiles.find(p => p.id === holder);
      if(!profile) {
        // TODO: add heuristics for selecting the best profile as a default
        for(const vc of this.verifiableCredential) {
          if(vc.credentialSubject && vc.credentialSubject.id) {
            const match = this.profiles.find(
              p => p.id === vc.credentialSubject.id);
            if(match) {
              console.log('match', match);
              return match;
            }
          }
        }
        // default to first profile
        return this.profiles[0];
      }
      return profile;
    }
  },
  methods: {
    async store() {
      const {verifiableCredential} = this;
      const holder = this.selectedProfile.id;
      await this.$emitExtendable('store', {holder, verifiableCredential});
    },
    async cancel() {
      await this.$emitExtendable('cancel');
    },
    async selectProfile(profileId) {
      this.selectedProfileId = profileId;
    }
  }
};
</script>

<style lang="scss" scoped>
$breakpoint-sm: 502px;
$breakpoint-xs: 320px;

@mixin mobile {
  @media (min-width: #{$breakpoint-xs}) and (max-width: #{$breakpoint-sm}) {
    @content;
  }
}

.self-end {
  width: 100%;
  bottom: 0;
  left: 0;
  background-color: #f9f9f9;
  padding: 16px 48px;
  border-top: 1px solid rgba(157, 157, 157, 0.75);
}

.g-button {
  width: calc(50% - 8px)
}

.s-page {
  min-height: auto !important;
  background: #fff !important;

  @include mobile {
    padding: 0;
    height: 100vh;
  }
}

.s-separator {
  background: rgba(157, 157, 157, 0.75);
}
</style>
