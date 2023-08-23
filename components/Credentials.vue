<template>
  <q-page
    class="row justify-center q-pa-md">
    <div class="col-md-9 col-xs-12">
      <br-q-title-card
        title="Credentials"
        class="full-width">
        <template #head>
          <div style="float: right;">
            <q-btn
              size="sm"
              flat
              icon="fas fa-sync-alt"
              @click="refresh" />
          </div>
        </template>
        <template #body>
          <div class="q-pl-md q-pb-md row">
            <div class="q-pt-md q-pr-md col-md-8 col-xs-12 row items-center">
              <search-box
                class="col-grow"
                placeholder="Search for a credential."
                @search="search = $event.text" />
            </div>
            <div class="q-pt-md q-pr-md col-md-4 col-xs-12">
              <q-select
                v-model="filteredProfiles"
                dense
                outlined
                multiple
                :options="profiles"
                option-value="id"
                option-label="name"
                use-chips
                label="Profile Filters"
                @focus="search = ''" />
            </div>
          </div>
          <q-separator />
          <credentials-list
            :credentials="filteredCredentials"
            :profile-options="profiles"
            :no-results="noResults"
            :search="search"
            :loading="loading"
            :error-text="errorText"
            @delete-credential="$event.waitUntil(deleteCredential($event))" />
        </template>
      </br-q-title-card>
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref, toRef, watch} from 'vue';
import {BrQTitleCard} from '@bedrock/quasar-components';
import {createEmitExtendable} from '@digitalbazaar/vue-extendable-event';
import CredentialsList from './CredentialsList.vue';
import SearchBox from './SearchBox.vue';

export default {
  name: 'Credentials',
  components: {
    BrQTitleCard,
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
          const credentialName = credential.name || credential.type[1];
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
