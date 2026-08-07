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
            v-if="showDisplays && !displays.length"
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
import {onBeforeMount, onMounted, reactive, ref} from 'vue';
import CredentialDetailsTree from './CredentialDetailsTree.vue';
import CredentialHtmlDisplay from './CredentialHtmlDisplay.vue';
import {date} from 'quasar';
import Mustache from 'mustache';

const {formatDate} = date;

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
    const showHighlights = ref(false);
    // unified display list
    // {kind: 'image', content} | {kind: 'html', renderMethod}
    const displays = reactive([]);

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
      const renderMethods = props.credential?.renderMethod;
      if(!renderMethods?.length) {
        return;
      }
      // `forEach` does not await an async callback, so a fetched template
      // could be pushed after a render method declared later; resolve them
      // all first and push in the order the credential declares them
      const resolved = await Promise.all(renderMethods.map(async rm => {
        try {
          if(rm.type === 'SvgRenderingTemplate2023') {
            // the id is itself the image
            return rm.id ? {kind: 'image', content: rm.id} : null;
          }
          if(rm.type === 'SvgRenderingTemplate2024') {
            const {template, url} = rm;
            const values = props.credential;
            return await useRenderTemplate2024(template, url, values);
          }
          if(rm.type === 'TemplateRenderMethod' && rm.renderSuite === 'html') {
            return {kind: 'html', renderMethod: rm};
          }
        } catch(e) {
          // one template that cannot be fetched or rendered must not take the
          // whole displays tab down with it
          console.error(
            'Failed to render credential render method', rm.type, e);
        }
        return null;
      }));
      displays.push(...resolved.filter(display => display !== null));
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
     *
     * @returns {Promise<object>} An image display holding an SVG data URI.
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
      // the inline template travels inside the signed credential and a fetched
      // one does not, so an inline template wins when both are present
      if(!template) {
        if(typeof url !== 'string' || !/^https:\/\//.test(url)) {
          // `fetch(undefined)` requested the wallet's own origin and rendered
          // its markup as the credential's artwork
          throw new Error(`Unusable render method template url "${url}".`);
        }
        const resp = await fetch(url, {credentials: 'omit'});
        if(!resp.ok) {
          // an error page would otherwise become the credential's artwork
          throw new Error(
            `Render method template fetch failed with ${resp.status}.`);
        }
        template = await resp.text();
      }

      const rv = Mustache.render(template, {...values, ...formattingFunctions});
      // not `btoa`: it is Latin-1 only, so a credential holding any character
      // above U+00FF (a name in Chinese, Japanese, Korean, Arabic...) threw
      // and lost its artwork entirely
      const image =
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rv)}`;
      return {kind: 'image', content: image};
    }

    return {
      tab,
      fullscreen,
      slideNumber,
      showDetails,
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
