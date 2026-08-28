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
        v-if="showHighlights"
        no-caps
        name="highlights"
        label="Highlights" />
      <q-tab
        v-if="showDisplays"
        no-caps
        name="displays"
        label="Displays" />
      <!-- Not yet implemented -->
      <q-tab
        v-if="showDetails"
        no-caps
        name="details"
        label="Details" />
    </q-tabs>

    <!-- Highlights -->
    <q-tab-panels
      v-model="tab"
      class="bg-grey-2"
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
        <div class="details-view">
          <q-spinner
            v-if="resolving"
            size="48px"
            color="primary"
            style="margin-top: 90px" />
          <q-carousel
            v-else
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
              v-for="(display, index) in displays"
              :key="index"
              :name="index + 1"
              class="q-pa-none">
              <q-scroll-area class="fit bg-grey-2">
                <div class="flex">
                  <q-img
                    v-if="display.kind === 'image'"
                    :src="display.content"
                    spinner-color="primary"
                    class="q-mx-auto rounded-borders"
                    style="max-width: 100%; pointer-events: none;" />
                  <credential-html-display
                    v-else-if="display.kind === 'html'"
                    :credential="credential"
                    :render-method="display.renderMethod"
                    class="full-width" />
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
          <q-banner
            dense
            rounded
            class="bg-orange text-white text-center">
            <div class="text-bold text-italic">
              Developer Only
            </div>
          </q-banner>
          <credential-details-tree :credential="credential" />
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {getRenderedDisplays, getRenderMethods} from '../lib/renderMethod.js';
import {onBeforeMount, onMounted, reactive, ref} from 'vue';
import CredentialDetailsTree from './CredentialDetailsTree.vue';
import CredentialHtmlDisplay from './CredentialHtmlDisplay.vue';

export default {
  name: 'CredentialDetailsViews',
  components: {CredentialDetailsTree, CredentialHtmlDisplay},
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
        description: ''
      })
    }
  },
  setup(props) {
    // Local state
    const slideNumber = ref(1);
    const tab = ref('highlights');
    const fullscreen = ref(false);
    const showDetails = ref(true);
    const showDisplays = ref(false);
    // the spinner used to clear only when a display arrived, so a credential
    // whose render methods all failed span forever; it now tracks the
    // resolution itself, which ends either way
    const resolving = ref(false);
    const showHighlights = ref(false);
    // unified display list
    // {kind: 'image', content} | {kind: 'html', renderMethod}
    const displays = reactive([]);

    // Select initial tab
    onMounted(() => {
      // the card config writes a key for every configured highlight whether or
      // not the credential carries the field, so a populated object is not the
      // same as something worth showing
      showHighlights.value = Object.values(props.credentialHighlights ?? {})
        .some(value => value !== '' && value !== null && value !== undefined);
      if(showHighlights.value) {
        tab.value = 'highlights';
      } else if(showDisplays.value) {
        tab.value = 'displays';
      } else {
        // Details is the tab every credential has, and the only one left once
        // the other two are empty; without it the panel opens on a tab that
        // renders nothing and no tab reads as active
        tab.value = 'details';
      }
    });

    // Scroll area bar style
    const scrollBarStyles = {
      right: '2px',
      width: '3px',
      opacity: '0.4',
      borderRadius: '5px',
      backgroundColor: 'gray'
    };

    // Fetch style, overrides, & highlights before component mounts
    onBeforeMount(() => {
      getDisplaysFromRenderMethod();
    });

    // the render methods a credential declares are resolved by the shared
    // library, so every surface that shows a credential resolves them the
    // same way; this one shows all of them, as carousel slides
    async function getDisplaysFromRenderMethod() {
      resolving.value = true;
      // shown while resolving so the tab and its spinner appear together;
      // corrected below, since a render method that resolves to nothing would
      // otherwise leave an empty carousel behind
      showDisplays.value = getRenderMethods({
        credential: props.credential
      }).length > 0;
      try {
        displays.push(...await getRenderedDisplays({
          credential: props.credential
        }));
      } finally {
        resolving.value = false;
        showDisplays.value = displays.length > 0;
        if(tab.value === 'displays' && !showDisplays.value) {
          // the tab was chosen while these were still resolving; landing on
          // one that has just stopped rendering leaves the panel blank
          tab.value = showHighlights.value ? 'highlights' : 'details';
        }
      }
    }

    return {
      tab,
      fullscreen,
      slideNumber,
      showDetails,
      resolving,
      showDisplays,
      showHighlights,
      scrollBarStyles,
      displays
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
