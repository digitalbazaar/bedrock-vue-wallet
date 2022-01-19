<template>
  <div class="q-mb-none q-mt-sm row">
    <q-select
      v-model="selectedProfile"
      dense
      filled
      :options="profiles"
      :disable="loading"
      :label="loading ? 'Loading...' : 'Select a profile'"
      class="s-profile-select text-subtitle1"
      @input="selectProfile">
      <template #prepend>
        <q-icon
          v-if="loading"
          name="fas fa-circle-notch fa-spin" />
      </template>
      <template #option="scope">
        <q-item
          class="row items-center"
          v-bind="scope.itemProps"
          v-on="scope.itemEvents"
          @click.native="selectProfile(scope.opt)">
          <q-icon
            :name="getIcon(scope.opt)"
            size="16px"
            class="q-mr-md" />
          <q-item-label>{{scope.opt.name}}</q-item-label>
        </q-item>
      </template>
      <template
        v-if="selectedProfile"
        #selected>
        <q-item
          class="q-pl-none q-pt-sm q-pb-xs q-pr-sm row"
          style="min-height: 24px">
          <q-icon
            :name="getIcon(selectedProfile)"
            size="18px"
            class="q-mr-md s-selected-icon" />
          <q-item-label>{{selectedProfile.name}}</q-item-label>
        </q-item>
      </template>
    </q-select>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'ProfileChooser',
  props: {
    loading: {
      type: Boolean,
      default: true,
      required: true
    },
    profiles: {
      type: Array,
      default: () => [],
      required: true
    },
    selected: {
      type: Object,
      default: () => null,
      required: false
    }
  },
  data() {
    return {
      slide: 1
    };
  },
  computed: {
    selectedProfile: {
      get() {
        return this.selected ? {...this.selected} : null;
      },
      set() {
        // no-op
        // we must provide the set function, but we update via emitting the
        // 'select' event with the `profile.id`
      }
    }
  },
  methods: {
    async selectProfile(profile) {
      await this.$emitExtendable('select', {profile: profile.id});
    },
    getIcon(profile) {
      let {type} = profile;
      if(type === null) {
        return 'fas fa-circle-notch fa-spin';
      }
      if(!Array.isArray(type)) {
        type = [type];
      }
      if(type.includes('Person')) {
        return 'fas fa-user-circle';
      }
      if(type.includes('Organization')) {
        return 'fas fa-building';
      }
      return 'fas fa-question';
    }
  }
};
</script>

<style scoped>
.s-profile-select {
  height: 46px;
  min-width: 250px;
  width: 100%;
}
</style>
