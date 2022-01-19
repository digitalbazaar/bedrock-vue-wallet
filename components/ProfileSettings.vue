<template>
  <form
    class="readonly"
    @submit.prevent="save">
    <q-input
      v-model="form.name"
      readonly
      outlined
      stack-label
      type="text"
      label="Profile Name"
      hint="Update your profile name."
      class="q-mb-md" />
    <q-field
      label="Profile Color"
      readonly
      stack-label
      outlined
      class="q-mb-md">
      <template #control>
        <div
          class="self-center full-width no-outline"
          tabindex="0">
          <div class="justify-end q-mt-sm">
            <q-btn
              outline
              disable
              color="grey-10"
              icon="fas fa-eye-dropper"
              size="10px"
              style="height: 34px">
              <q-menu
                anchor="center middle"
                self="center middle">
                <q-color v-model="form.color" />
              </q-menu>
            </q-btn>
            <q-chip
              v-if="form.name"
              square
              :style="{'background-color': form.color}"
              text-color="white"
              class="q-my-none q-ml-sm"
              style="height: 34px">
              {{form.name}}
            </q-chip>
          </div>
        </div>
      </template>
    </q-field>
    <q-input
      v-model="form.didMethod"
      readonly
      outlined
      stack-label
      type="text"
      label="Profile Type"
      class="q-mb-md readonly" />
    <q-input
      v-model="form.id"
      readonly
      outlined
      stack-label
      type="text"
      label="DID"
      class="q-mb-md" />
    <q-separator class="q-mt-md" />
    <div class="row items-center q-py-md">
      <q-checkbox
        v-model="form.shared"
        disable
        val="true" />
      <div class="q-ml-sm">
        <q-item-label>Shared</q-item-label>
        <q-item-label caption>
          Allow other profiles to manage.
        </q-item-label>
      </div>
    </div>
    <q-separator class="q-mb-md" />
    <!-- <q-btn
      type="submit"
      label="Save"
      color="primary"
      class="full-width"
      style="max-width: 250px" /> -->
  </form>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'ProfileSettings',
  props: {
    activeProfile: {
      type: Object,
      required: true
    },
  },
  data() {
    return {
      form: {}
    };
  },
  watch: {
    activeProfile() {
      // TODO: Data model for profiles needs to include "shared"
      this.form = {...this.activeProfile};
    }
  },
  async created() {
    // TODO: Data model for profiles needs to include "shared"
    this.form = {...this.activeProfile};
  },
  methods: {
    save() {
      // TODO: Need to send form data to backend
      console.log('Form', this.form);
    }
  }
};
</script>

<style scoped>
.readonly >>> .q-field--outlined.q-field--readonly .q-field__control:before {
  border-style: solid;
}
</style>
