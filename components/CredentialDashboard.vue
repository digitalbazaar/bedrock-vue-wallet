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
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref, toRef, watch} from 'vue';
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
    const credentials = toRef(props, 'credentials');
    const search = ref('');
    const filteredCredentials = computed(() => {
      emit('filtered-credentials-loading', true);
      const filteredCredentials = credentials.value.filter(({credential}) => {
        if(credential) {
          const credentialName = credential.name || credential.type[1] || '';
          return credentialName.toLowerCase().includes(
            search.value.toLowerCase());
        }
      });
      emit('filtered-credentials-loading', false);
      return filteredCredentials;
    });
    const noResults = computed(() => filteredCredentials.value.length === 0);

    const emitExtendable = createEmitExtendable();

    const deleteCredential = async ({profileId, credentialId}) => {
      // pass event up component chain
      return emitExtendable('delete-credential', {profileId, credentialId});
    };

    function refresh() {
      emit('refresh');
    }

    const filteredProfiles = ref([]);
    watch(
      () => filteredProfiles,
      () => emit('filtered-profiles', filteredProfiles),
      {immediate: true});

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
