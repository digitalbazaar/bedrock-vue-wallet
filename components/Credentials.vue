<template>
  <q-page
    class="row justify-center q-pa-md">
    <div class="col-md-9 col-xs-12">
      <br-q-title-card
        title="Credentials"
        class="full-width">
        <div
          slot="body">
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
            :error-text="errorText" />
        </div>
      </br-q-title-card>
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQTitleCard} from '@bedrock/quasar-components';
import {computed, ref, toRef} from 'vue';
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
  emits: ['filtered-credentials-loading', 'filtered-profiles'],
  setup(props, {emit}) {
    console.log('setting up Credentials component');

    const credentials = toRef(props, 'credentials');
    const search = ref('');

    const filteredCredentials = computed(() => {
      console.log('XXXXXXXXXXXx computing filtered credentials',
        'credentials are', credentials.value);
      emit('filtered-credentials-loading', true);
      const filteredCredentials = credentials.value.filter(({credential}) => {
        if(credential) {
          const credentialName = credential.name || credential.type[1];
          return credentialName.toLowerCase().includes(
            search.value.toLowerCase());
        }
      });
      emit('filtered-credentials-loading', false);
      console.log('filtered credentials', filteredCredentials);
      return filteredCredentials;
    });
    console.log('computed filteredCredentials', filteredCredentials.value);

    const noResults = computed(() => filteredCredentials.value.length === 0);
    console.log('computed noResults', noResults.value);

    return {
      filteredCredentials,
      noResults,
      search
    };
  },
  data() {
    return {
      sortIcon: 'fas fa-sort-down',
      filteredProfiles: [],
      loadingFilteredCredentials: true
    };
  },
  watch: {
    filteredProfiles() {
      this.$emit('filtered-profiles', this.filteredProfiles);
    }
  },
  created() {
    this.$emit('filtered-profiles', this.filteredProfiles);
  }
};
</script>

<style lang="scss" scoped>
</style>
