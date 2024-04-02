<template>
  <div class="col bg-grey-2 q-pa-md">
    <q-tabs
      v-model="tab"
      dense
      align="justify"
      narrow-indicator
      active-color="primary"
      class="text-grey q-px-xl"
      indicator-color="primary">
      <q-tab
        no-caps
        name="highlights"
        label="Highlights" />
      <q-tab
        no-caps
        name="images"
        label="Images" />
      <q-tab
        no-caps
        name="details"
        label="Details" />
    </q-tabs>

    <q-separator />

    <q-tab-panels
      v-model="tab"
      animated>
      <q-tab-panel
        name="highlights"
        class="bg-grey-2">
        <div class="row justify-start items-start">
          <q-scroll-area
            visible
            :thumb-style="scrollBarStyles"
            class="details-view rounded-borders">
            <q-card-section class="q-py-none text-body1 fit">
              <div
                v-for="(value, key, index) in credentialHighlights"
                :key="key"
                :class="[index !== 0 && 'q-mt-md']">
                <img
                  v-if="key.includes('image')"
                  :src="value"
                  style="width: 130px;"
                  class="rounded-borders">
                <div v-else>
                  <div class="text-grey text-body2">
                    {{key}}
                  </div>
                  <div class="text-body1">
                    {{value}}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-scroll-area>
        </div>
      </q-tab-panel>

      <q-tab-panel
        name="images"
        class="bg-grey-2">
        <div class="details-view">
          Credential images are not currently available.
        </div>
      </q-tab-panel>

      <q-tab-panel
        name="details"
        class="bg-grey-2">
        <div class="details-view">
          Details view is not currently available.
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {ref} from 'vue';

export default {
  name: 'CredentialDetailsViews',
  components: {},
  props: {
    credential: {
      type: Object,
      required: true
    },
    images: {
      type: Array,
      default: () => []
    },
    credentialHighlights: {
      type: Object,
      required: true
    },
    credentialOverrides: {
      type: Object,
      default: () => ({
        title: '',
        image: '',
        subtitle: '',
        description: '',
      })
    },
  },
  setup() {
    // Local state
    const tab = ref('highlights');

    // Scroll area bar style
    const scrollBarStyles = {
      right: '2px',
      width: '3px',
      opacity: '0.4',
      borderRadius: '5px',
      backgroundColor: 'gray',
    };

    return {
      tab,
      scrollBarStyles
    };
  }
};
</script>

<style lang="scss" scoped>
.details-view {
  width: 100%;
  height: 390px;
}
</style>
