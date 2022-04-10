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
  data() {
    return {
      sortIcon: 'fas fa-sort-down',
      search: '',
      filteredProfiles: [],
      loadingFilteredCredentials: true
    };
  },
  computed: {
    filteredCredentials() {
      this.$emit('filtered-credentials-loading', true);
      const {search, credentials} = this;
      const filteredCredentials = credentials.filter(({credential}) => {
        if(credential) {
          const credentialName = credential.name || credential.type[1];
          return credentialName.toLowerCase()
            .includes(search.toLowerCase());
        }
      });
      this.$emit('filtered-credentials-loading', false);
      return filteredCredentials;
    },
    noResults() {
      return (this.filteredCredentials || []).length === 0;
    }
  },
  watch: {
    filteredProfiles() {
      this.$emit('filtered-profiles', this.filteredProfiles);
    }
  },
  created() {
    this.$emit('filtered-profiles', this.filteredProfiles);
  },
  methods: {}
};
</script>

<style lang="scss" scoped>
</style>
