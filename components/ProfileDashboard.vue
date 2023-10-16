<template>
  <div>
    <div class="row q-pa-md items-center">
      <search-box
        class="col-grow"
        placeholder="Search for a profile."
        @search="search = $event.text" />
      <div
        class="q-pl-md gt-sm"
        style="width: 150px">
        <q-btn
          unelevated
          label="Add Profile"
          color="primary"
          class="full-width"
          style="height: 40px"
          @click="showAddProfileModal = true" />
      </div>
      <div
        class="q-pl-md lt-md"
        style="width: 60px">
        <q-btn
          unelevated
          icon="fas fa-plus"
          color="primary"
          class="full-width"
          style="height: 40px"
          @click="showAddProfileModal = true" />
      </div>
    </div>
    <q-separator />
    <br-q-table
      row-key="id"
      :columns="columns"
      :rows="profilesList"
      :loading="loading"
      @handle-button="handleButton($event)" />
    <add-profile-modal
      v-if="showAddProfileModal"
      v-model="showAddProfileModal"
      :profile-options="profileOptions"
      @create="$event.waitUntil(createProfile($event.form))" />
  </div>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {getPrimaryEmail, helpers, profileManager} from '@bedrock/web-wallet';
import AddProfileModal from './AddProfileModal.vue';
import {BrQTable} from '@bedrock/quasar-components';
import {date} from 'quasar';
import SearchBox from './SearchBox.vue';

const {createProfile} = helpers;
const {formatDate} = date;

const columns = [
  {
    name: 'name',
    align: 'left',
    label: 'Name',
    field: 'name',
    sortable: true
  },
  {
    name: 'didMethod',
    align: 'left',
    label: 'Profile Type',
    field: 'didMethod',
    sortable: true
  },
  {
    name: 'created',
    align: 'center',
    label: 'Created',
    field: 'created',
    sortable: true
  },
  {
    name: 'color',
    align: 'center',
    label: 'Color',
    field: 'color',
    type: 'chip',
    sortable: false
  },
  {
    name: 'settings',
    align: 'center',
    label: 'Profile Settings',
    field: 'settings',
    type: 'button',
    buttonLabel: 'Settings',
    buttonColor: 'primary',
    sortable: false,
  }
];

export default {
  name: 'ProfileDashboard',
  components: {
    SearchBox,
    AddProfileModal,
    BrQTable
  },
  props: {
    limit: {
      type: Number,
      required: false,
      default: 0
    }
  },
  data() {
    return {
      showAddProfileModal: false,
      columns,
      tableData: [],
      filteredData: [],
      pagination: {
        sortBy: 'desc',
        descending: false,
        page: 1,
        rowsPerPage: 10
      },
      loading: true,
      search: ''
    };
  },
  computed: {
    profilesList() {
      if(this.limit > 0) {
        return this.searchFilter.slice(0, this.limit);
      }
      return this.searchFilter;
    },
    profileOptions() {
      return this.tableData.map(({name, id}) => ({label: name, value: id}));
    },
    showViewMore() {
      return this.tableData.length > this.limit && this.limit > 0;
    },
    searchFilter() {
      const fields = this.columns.map(c => c.field);
      return this.tableData.filter(data => fields
        .map(f => data[f])
        // remove any undefined field data
        .filter(d => d)
        // search across all field data
        .join(' ').toLowerCase()
        .includes(this.search.toLowerCase()));
    }
  },
  async created() {
    this.tableData = await profileManager.getProfiles({useCache: true});
    this.tableData.forEach(x => {
      x.created = this.getDate(x.created);
      x.didMethod = this.getTypeLabel(x.didMethod);
    });
    this.loading = false;
  },
  methods: {
    // At the end of this process, there will be:
    //  - One new profile (user document)
    //     - this document will have a name of ACRONYM corresponding to the
    //       name the user provided in 'Profile Name'
    //  - One new profile agent (user document)
    //     - This document will have a different name depending on whether or
    //       not the profile is 'shared' or not. The ONLY difference between
    //       these two options is the name that goes into the user doc.
    //         - When it is NOT shared, the document will have a name of `root`
    //         - When it IS shared the name will be specified in the UI.
    //           Currently this is the 'Initial Manager' field in the UI.
    async createProfile(form) {
      try {
        const {color, shared, name, didMethod} = form.profile;
        const didOptions = {};
        if(didMethod === 'v1') {
          didOptions.mode = 'test'; // Only using testnet for now
        }
        const profileContent = {
          color,
          name,
          type: ['User', 'Person'],
          shared: false
        };
        const profileAgentContent = {
          email: await getPrimaryEmail(),
          name: 'root',
          type: ['User', 'Person'],
          access: 'full'
        };
        const profileOptions = {
          didMethod,
          didOptions
        };
        if(shared && form.managingProfile) {
          const {label} = (this.profileOptions || []).find(({value}) => {
            return value === form.managingProfile;
          });
          profileContent.shared = true;
          profileAgentContent.name = label;
        }
        const {profile} = await createProfile(
          {profileContent, profileAgentContent, profileOptions});
        profile.created = this.getDate(profile.created);
        profile.didMethod = this.getTypeLabel(profile.didMethod);
        this.tableData.push(profile);
      } catch(e) {
        console.log('create profile error', e);
      }
    },
    getDate(dateString) {
      return formatDate(dateString, 'YYYY-MM-DD');
    },
    getTypeLabel(type) {
      if(type === 'key') {
        return 'Temporary';
      }
      return 'Permanent';
    },
    async handleButton(data) {
      // FIXME: emit event as this is a component not a page, do not use
      // router directly
      await this.$router.push({
        name: 'settings-profile',
        params: {profileId: data.row.id}
      });
    }
  }
};
</script>

<style>
</style>
