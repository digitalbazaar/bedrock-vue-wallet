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
        description: '',
      })
    },
  },
  setup(props) {
    // Local state
    const slideNumber = ref(1);
    const tab = ref('highlights');
    const fullscreen = ref(false);
    const showDisplays = ref(false);
    const showHighlights = ref(false);
    const credentialImages = reactive([]);
    const showDetails = ref(process.env.NODE_ENV === 'development');

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
      backgroundColor: 'gray',
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
.details-view {
  width: 100%;
  height: 500px;
}
</style>
