<template>
  <div class="col bg-grey-2 q-pa-md details-panel-root">
    <div class="row items-center q-px-xl tabs-header">
      <q-tabs
        v-model="tab"
        dense
        align="justify"
        narrow-indicator
        active-color="primary"
        class="text-grey col"
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
    </div>

    <!-- Highlights -->
    <q-tab-panels
      v-model="tab"
      class="bg-grey-2"
      animated>
      <q-tab-panel
        name="highlights"
        class="bg-grey-2">
        <div class="row justify-start items-start details-panel-row">
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
              <!-- Holder name — only passed by CredentialDetails.vue's
                mobile layout; desktop already shows this in its own
                sidebar, so passing it there too would duplicate it. Not
                part of credentialHighlights itself (that's issuer-side
                data: Achievement/Type/Description/Criteria/Issued By) —
                this is holder-side, so it's a separate field here rather
                than injected into that object upstream. -->
              <div
                v-if="credentialHolderName"
                class="q-mt-md">
                <div class="text-grey text-body2">
                  Issued for
                </div>
                <div class="text-body1">
                  {{credentialHolderName}}
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
            v-if="showDisplays && !credentialImages.length"
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
              v-for="(image, index) in credentialImages"
              :key="image"
              :name="index + 1"
              class="q-pa-none">
              <q-scroll-area class="fit bg-grey-2">
                <div class="flex">
                  <q-img
                    :src="image"
                    spinner-color="primary"
                    class="q-mx-auto rounded-borders"
                    style="max-width: 100%; pointer-events: none;" />
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
          <!-- Only rendered when a parent passes `show-remove`
            (CredentialDetails.vue's mobile layout does; desktop keeps its
            own separate Remove button in the sidebar). -->
          <div
            v-if="showRemove"
            class="flex justify-center q-my-md">
            <q-btn
              flat
              no-caps
              label="Remove"
              color="negative"
              icon="far fa-trash-alt"
              @click="$emit('remove')" />
          </div>
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
import {onBeforeMount, onMounted, reactive, ref} from 'vue';
import CredentialDetailsTree from './CredentialDetailsTree.vue';
import {date} from 'quasar';
import Mustache from 'mustache';

const {formatDate} = date;

export default {
  name: 'CredentialDetailsViews',
  components: {CredentialDetailsTree},
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
    },
    // Renders a small Remove icon button alongside the tabs — used by
    // CredentialDetails.vue's mobile layout only; the desktop layout has
    // its own separate Remove button in the sidebar and does not pass
    // this.
    showRemove: {
      type: Boolean,
      default: false
    },
    // Holder name, shown as an extra "Issued for" field in the Highlights
    // panel — only passed by the mobile layout (see showRemove above for
    // why: desktop already shows this elsewhere).
    credentialHolderName: {
      type: String,
      default: ''
    }
  },
  emits: ['remove'],
  setup(props) {
    // Local state
    const slideNumber = ref(1);
    const tab = ref('highlights');
    const fullscreen = ref(false);
    const showDetails = ref(true);
    const showDisplays = ref(false);
    const showHighlights = ref(false);
    const credentialImages = reactive([]);

    // Select initial tab
    onMounted(() => {
      showHighlights.value = !!Object.keys(props.credentialHighlights)?.length;
      showDisplays.value = !!props.credential?.renderMethod?.length;
      if(showHighlights.value) {
        tab.value = 'highlights';
      } else if(showDisplays.value) {
        tab.value = 'displays';
      }
    });

    // Constants
    const supportedRenderMethods = [
      'SvgRenderingTemplate2023', 'SvgRenderingTemplate2024'
    ];

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

    // Extract and parse images from credential's render method property
    async function getDisplaysFromRenderMethod() {
      if(props.credential?.renderMethod?.length) {
        props.credential.renderMethod.forEach(async rm => {
          if(supportedRenderMethods.includes(rm.type)) {
            if(rm.type === 'SvgRenderingTemplate2023') {
              useRenderTemplate2023(rm.id);
            } else if(rm.type === 'SvgRenderingTemplate2024') {
              const {template, url} = rm;
              const values = props.credential;
              await useRenderTemplate2024(template, url, values);
            }
          }
        });
      }
    }

    /**
     * Uses id for src value in image.
     *
     * @param {string} srcValue - Data URI.
     */
    function useRenderTemplate2023(srcValue) {
      credentialImages.push(srcValue);
    }

    /*
     * Functions used to format Mustache template values
     * See: https://github.com/janl/mustache.js#functions
     *
     * Example Mustache template use:
     * {{#formatFnName}}{{valueToFormat}}{{/formatFnName}}
     */
    const formattingFunctions = {
      formatDate: () => (text, render) => {
        const dateString = render(text);
        return formatDate(dateString, 'YYYY-MM-DD');
      }
    };

    /**
     * Load svg from url or template then hydrate with credentialSubject values.
     *
     * @param {string} template - Svg.
     * @param {string} url - Url.
     * @param {object} values - Credential.credentialSubject.
     */
    async function useRenderTemplate2024(template, url, values) {
      // Example credential renderMethod property:
      //  "renderMethod": [
      //    {
      //      "name": "Landscape",
      //      "mediaQuery": "@media (orientation: landscape)",
      //      "type": "SvgRenderingTemplate2024",
      //      "template": "",
      //      "url": "https://credentialTemplates.dev/example.svg",
      //      "mediaType": "image/svg+xml",
      //    }
      //  ]
      //
      if(!template || url) {
        const resp = await fetch(url);
        template = await resp.text();
      }

      const rv = Mustache.render(template, {...values, ...formattingFunctions});
      const image = `data:image/svg+xml;base64,${btoa(rv)}`;
      credentialImages.push(image);
    }

    return {
      tab,
      fullscreen,
      slideNumber,
      showDetails,
      showDisplays,
      showHighlights,
      scrollBarStyles,
      credentialImages
    };
  }
};
</script>

<style lang="scss" scoped>
/*
 * DB-732: .details-view previously had a hardcoded height:500px with no
 * relation to its ancestors' real height, while the outer dialog
 * (CredentialDetails.vue's .details-dialog) has its own separate fixed
 * height/max-height. Neither budget was aware of the other, so either one
 * could independently overflow and show its own scrollbar. Making height
 * flow through the chain as flex instead fixes that: only the actual
 * content's real overflow (if any) triggers a scrollbar, and it does so in
 * one place.
 *
 * At mobile widths, CredentialDetails.vue no longer reuses this same DOM
 * under a media query — it renders this component inside its own
 * purpose-built `.detail-sheet` container instead, which is the bounded/
 * scrolling element there. So this file only needs to handle its one,
 * consistent desktop context now; no internal breakpoint logic here.
 */
.details-panel-root {
  display: flex;
  flex-direction: column;
  height: 100%;

  :deep(.q-tab-panels) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.q-tab-panel) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }
}

.details-panel-row {
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.details-view {
  width: 100%;
  flex: 1;
  min-height: 0;
}
</style>
