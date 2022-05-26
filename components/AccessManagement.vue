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
          label="Add Access"
          color="primary"
          class="full-width"
          style="height: 40px"
          @click="showAddModal = true" />
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
          @click="showAddModal = true" />
      </div>
    </div>
    <q-separator />
    <!-- FIXME: Update `handleButton` event on br-q-table with a better name -->
    <br-q-table
      row-key="id"
      :columns="columns"
      :rows="searchFilter"
      :loading="loading"
      @handleButton="handleButton($event)" />
    <!-- Modals -->
    <add-user-modal
      v-if="showAddModal"
      v-model="showAddModal"
      @create="$event.waitUntil(addAccess($event.form))" />
    <edit-user-modal
      v-if="showEditModal"
      v-model="showEditModal"
      :user="user"
      @update="$event.waitUntil(editAccess($event.user))" />
    <remove-item-modal
      v-if="showRemoveModal"
      v-model="showRemoveModal"
      name="access"
      message-align="text-left"
      :message="removeAccessMessage"
      :item="user"
      @remove="$event.waitUntil(removeAccess($event.item))" />
  </div>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref, toRef} from 'vue';
import {computedAsync} from '@vueuse/core';
import AddUserModal from './AddUserModal.vue';
import {BrQTable} from '@bedrock/quasar-components';
import EditUserModal from './EditUserModal.vue';
import {format, utils} from 'quasar';
import {profileManager, users} from '@bedrock/web-wallet';
import RemoveItemModal from './RemoveItemModal.vue';
import SearchBox from './SearchBox.vue';

const {
  addUser, updateUser, removeUser, createOnboardLink
} = users;

const columns = [
  {
    name: 'name',
    align: 'left',
    label: 'Name',
    field: 'name',
    sortable: true
  },
  {
    name: 'email',
    align: 'left',
    label: 'Email',
    field: 'email',
    sortable: true
  },
  {
    name: 'authorizedDate',
    align: 'center',
    label: 'Authorized',
    field: 'authorizedDate',
    sortable: true
  },
  {
    name: 'access',
    align: 'center',
    label: 'Access',
    field: 'access',
    // TODO: br-quasar-table has a bug and does not respect format
    format: val => format.capitalize(val),
    sortable: true
  },
  {
    name: 'edit',
    align: 'center',
    label: 'Edit Access',
    field: 'edit',
    type: 'button',
    buttonLabel: 'Edit',
    buttonColor: 'primary',
    sortable: false,
  },
  {
    name: 'remove',
    align: 'center',
    label: 'Remove Access',
    field: 'remove',
    type: 'button',
    buttonLabel: 'Remove',
    buttonColor: 'negative',
    sortable: false,
  }
];

export default {
  name: 'AccessManagement',
  components: {
    BrQTable,
    AddUserModal,
    EditUserModal,
    RemoveItemModal,
    SearchBox
  },
  props: {
    profileId: {
      type: String,
      default: '',
      required: true
    }
  },
  setup(props) {
    const profileId = toRef(props, 'profileId');

    const accessManagerLoading = ref(true);
    const accessManager = computedAsync(async () => {
      const {accessManager} = await profileManager.getAccessManager(
        {profileId: profileId.value});
      return accessManager;
    });

    const profileLoading = ref(true);
    const profile = computedAsync(
      async () => profileManager.getProfile({id: profileId.value}));

    const usersLoading = ref(true);
    const users = computedAsync(async () => {
      if(!accessManager.value) {
        return [];
      }
      return accessManager.value.getUsers();
    }, []);

    const loading = computed(() =>
      accessManagerLoading.value ||
      profileLoading.value ||
      usersLoading.value);

    return {
      accessManager,
      loading,
      profile,
      users
    };
  },
  data() {
    return {
      columns,
      tableData: [],
      search: '',
      showAddModal: false,
      showEditModal: false,
      showRemoveModal: false,
      user: {}
    };
  },
  computed: {
    removeAccessMessage() {
      const {name, email} = this.user;
      const username = `${name} (${email})`;
      const message = `Are you sure you want to remove access for ` +
        `${username}? They will lose all access to anything related to this` +
        ` profile.`;
      return name ? message : '';
    },
    searchFilter() {
      const fields = this.columns.map(c => c.field);
      return this.tableData.filter(data => fields
        .map(f => data[f])
        // remove any undefined field data
        .filter(d => d)
        // search across all field data
        .join(' ').toLowerCase()
        .includes(this.search.toLowerCase()))
        .map(row => {
        // FIXME: Remove map call once br-q-table is updated to support format
          return {
            ...row,
            authorizedDate: this.getDate(row.authorizedDate),
            access: format.capitalize(row.access)
          };
        });
    }
  },
  watch: {
    users(newUsers) {
      // FIXME: this is only until query is fixed in web-profile-manager
      this.tableData = newUsers.filter(u => !u.type.includes('Profile'));
    },
    // ensure table data is set to empty when loading data
    loading(isLoading) {
      if(isLoading) {
        this.tableData = [];
      }
    }
  },
  methods: {
    getDate(dateString) {
      return utils.date.formatDate(dateString, 'YYYY-MM-DD');
    },
    handleButton(data) {
      this.user = {...data.row};
      const {user, profile} = this;
      this.user.onboardLink = createOnboardLink({user, profile});
      if(data.field === 'edit') {
        this.showEditModal = true;
      } else if(data.field === 'remove') {
        this.showRemoveModal = true;
      }
    },
    async addAccess(form) {
      const {accessManager} = this;
      const user = await addUser({accessManager, options: form});
      this.tableData.push(user);
    },
    async editAccess(updatedUser) {
      const [oldUser] = this.tableData.filter(({id}) => {
        return updatedUser.id === id;
      });
      const {accessManager} = this;
      const user = await updateUser(
        {accessManager, updatedUser, oldUser});
      const index = this.tableData.findIndex(x => x.id === user.id);
      this.tableData.splice(index, 1, user);
    },
    async removeAccess(user) {
      const {accessManager} = this;
      await removeUser({accessManager, user});
      const index = this.tableData.findIndex(x => x.id === user.id);
      this.tableData.splice(index, 1);
    }
  }
};
</script>

<style>
</style>
