<template>
  <q-page
    class="row justify-center"
    style="min-height: 0px;">
    <div class="col-sm-5 col-xs-10 row items-center q-mt-lg q-mb-sm">
      <search-box
        class="col-grow"
        placeholder="Search credentials"
        @search="search=$event.text" />
    </div>
    <div class="col-xs-12">
      <credentials-list
        :credentials="filteredCredentials"
        :profile-options="profiles"
        :no-results="noResults"
        :search="search"
        :loading="loading"
        :error-text="errorText"
        @delete-credential="$event.waitUntil(deleteCredential($event))" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref, toRef, watch} from 'vue';
import {formatString, getValueFromPointer} from '../lib/helpers.js';
import {config} from '@bedrock/web';
import {createEmitExtendable} from '@digitalbazaar/vue-extendable-event';
import CredentialsList from './CredentialsList.vue';
import SearchBox from './SearchBox.vue';

export default {
  name: 'CredentialDashboard',
  components: {
    CredentialsList,
    SearchBox
  },
  props: {
    credentials: {
      default: () => [],
      type: Array,
      required: true
    },
    profiles: {
      default: () => [],
      type: Array,
      required: false
    },
    loading: {
      type: Boolean,
      required: false
    },
    errorText: {
      default: '',
      type: String,
      required: true
    }
  },
  emits: [
    'refresh',
    'delete-credential',
    'filtered-credentials-loading',
    'filtered-profiles'
  ],
  setup(props, {emit}) {
    // Constants
    const emitExtendable = createEmitExtendable({emit});

    // Refs
    const search = ref('');
    const filteredProfiles = ref([]);
    const credentials = toRef(props, 'credentials');

    // Credentials filtered by search term match
    const filteredCredentials = computed(() => {
      emit('filtered-credentials-loading', true);
      const filteredCredentials = credentials.value.filter(({credential}) => {
        if(credential) {
          const searchTerm = search.value.toLowerCase();
          const credentialName = credential.name || credential.type[1] || '';
          const {
            titleOverride, subtitleOverride
          } = credentialOverrides(credential);
          const searchableFields = [
            titleOverride, subtitleOverride, credentialName
          ];
          return searchableFields.some(field =>
            field.toLowerCase().includes(searchTerm)
          );
        }
      });
      emit('filtered-credentials-loading', false);
      return filteredCredentials;
    });

    // Boolean for no filtered results
    const noResults = computed(() => filteredCredentials.value.length === 0);

    // Events
    const refresh = () => {
      emit('refresh');
    };

    // Pass delete-credential event up component chain
    const deleteCredential = async ({profileId, credentialId}) => {
      return emitExtendable('delete-credential', {profileId, credentialId});
    };

    // Watchers
    watch(() => filteredProfiles, () => {
      return emit('filtered-profiles', filteredProfiles);
    }, {immediate: true});

    // Get each credential title and subtitle overrides
    function credentialOverrides(credential) {
      let titleOverride = '';
      let subtitleOverride = '';
      // Get credential override config
      const vcConfig = config?.vueWallet?.cardDesigns?.find(config => {
        const pointers = Object.keys(config.matches);
        return pointers.every(pointer => {
          const value = getValueFromPointer(credential, pointer);
          return Array.isArray(value) ?
            value.includes(config.matches[pointer]) :
            value === config.matches[pointer];
        });
      });
      if(vcConfig?.overrides?.title) {
        const {title} = vcConfig.overrides;
        const titleValue = getValueFromPointer(credential, title.pointer);
        titleOverride = formatString(titleValue, title.format);
      }
      if(vcConfig?.overrides?.subtitle) {
        const {subtitle} = vcConfig.overrides;
        const stValue = getValueFromPointer(credential, subtitle.pointer);
        subtitleOverride = formatString(stValue, subtitle.format);
      }
      return {
        titleOverride,
        subtitleOverride
      };
    }

    return {
      deleteCredential,
      filteredCredentials,
      filteredProfiles,
      noResults,
      refresh,
      search
    };
  }
};
</script>

<style lang="scss" scoped>
</style>
