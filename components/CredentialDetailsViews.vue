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
        name="displays"
        label="Displays" />
      <q-tab
        no-caps
        name="details"
        label="Details" />
    </q-tabs>

    <!-- Highlights -->
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

      <!-- Image carousel -->
      <q-tab-panel
        name="displays"
        class="bg-grey-2 q-px-none text-center">
        <div
          class="details-view">
          <q-carousel
            v-model="slideNumber"
            v-model:fullscreen="fullscreen"
            padding
            infinite
            animated
            swipeable
            navigation
            control-color="dark"
            transition-next="slide-left"
            transition-prev="slide-right"
            class="bg-grey-2 q-mb-none fit"
            navigation-icon="far fa-circle">
            <q-carousel-slide
              v-for="(image, index) in credentialImages"
              :key="image"
              :name="index + 1"
              class="q-pa-none">
              <q-scroll-area class="fit bg-grey-2">
                <div class="flex">
                  <img
                    :src="image"
                    class="q-mx-auto rounded-borders"
                    style="max-width: 100%; pointer-events: none;">
                </div>
              </q-scroll-area>
            </q-carousel-slide>
            <template #control>
              <q-carousel-control
                position="bottom-right"
                :offset="[18, 18]">
                <q-btn
                  round
                  dense
                  color="white"
                  text-color="dark"
                  :icon="fullscreen ? 'fa fa-compress' : 'fa fa-expand'"
                  @click="fullscreen = !fullscreen" />
              </q-carousel-control>
            </template>
          </q-carousel>
        </div>
      </q-tab-panel>

      <!-- Details -->
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
import {onBeforeMount, reactive, ref} from 'vue';

export default {
  name: 'CredentialDetailsViews',
  components: {},
  props: {
    credential: {
      type: Object,
      required: true
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
  setup(props) {
    // Local state
    const slideNumber = ref(1);
    const tab = ref('highlights');
    const fullscreen = ref(false);
    const credentialImages = reactive([]);

    // Constants
    const supportedRenderMethods = ['SvgRenderingTemplate2023'];

    // Scroll area bar style
    const scrollBarStyles = {
      right: '2px',
      width: '3px',
      opacity: '0.4',
      borderRadius: '5px',
      backgroundColor: 'gray',
    };

    // Fetch style, overrides, & highlights before component mounts
    onBeforeMount(() => {
      getDisplaysFromRenderMethod();
    });

    // Extract and parse images from credential's render method property
    async function getDisplaysFromRenderMethod() {
      if(props.credential?.renderMethod?.length) {
        props.credential.renderMethod.forEach(rm => {
          if(supportedRenderMethods.includes(rm.type)) {
            // Uses id for src value in image carousel
            credentialImages.push(rm.id);
          }
        });
      }
    }

    return {
      tab,
      fullscreen,
      slideNumber,
      scrollBarStyles,
      credentialImages
    };
  }
};
</script>

<style lang="scss" scoped>
.details-view {
  width: 100%;
  height: 500px;
}
</style>
