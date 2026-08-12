<template>
  <q-page
    class="row justify-center"
    style="min-height: 0px;">
    <!-- on mobile the whole view is one pull target: the search field and the
    category chips travel with the list, so there is a single gesture zone
    instead of a dead one above the rows -->
    <component
      :is="isMobile ? 'pull-to-refresh' : 'div'"
      :class="isMobile ?
        'col-xs-12 column s-pull-area' :
        'row justify-center full-width'"
      @refresh="onPullRefresh">
      <div
        class="row justify-center items-center full-width q-mb-sm s-search-row">
        <!-- pulling to refresh is unreachable by keyboard, and with a screen
        reader running touch is intercepted before the gesture ever starts -->
        <q-btn
          v-if="isMobile"
          flat
          dense
          class="s-visually-hidden"
          label="Refresh credentials"
          @click="refresh" />
        <div class="col-md-4 col-sm-6 col-xs-9">
          <search-box
            class="col-grow"
            placeholder="Search credentials"
            @search="search=$event.text" />
        </div>
        <div class="q-ml-md">
          <q-btn
            round
            outline
            color="primary"
            class="s-row-action"
            icon="fas fa-barcode"
            aria-label="Scan a barcode"
            @click="openBarcodeDialog" />
          <q-btn
            v-if="!isMobile"
            round
            outline
            color="primary"
            class="s-row-action q-ml-sm"
            icon="fas fa-sync-alt"
            @click="refresh" />
        </div>
      </div>
      <div
        v-if="isMobile && credentialCategories.length > 1"
        class="col-xs-12 s-type-band">
        <div class="s-type-chips">
          <q-chip
            :outline="activeCategory !== null"
            clickable
            color="primary"
            text-color="white"
            @click="activeCategory = null">
            All
          </q-chip>
          <q-chip
            v-for="category in credentialCategories"
            :key="category"
            :outline="activeCategory !== category"
            clickable
            color="primary"
            text-color="white"
            @click="activeCategory = category">
            {{category}}
          </q-chip>
        </div>
      </div>
      <div :class="isMobile ? 'col-xs-12' : 'col-xs-12 col-md-11 col-lg-10'">
        <credentials-list
          :credentials="filteredCredentials"
          :profile-options="profiles"
          :no-results="noResults"
          :search="search"
          :loading="loading"
          :error-text="errorText"
          @select="onSelect"
          @delete-credential="$event.waitUntil(deleteCredential($event))" />
      </div>
    </component>
    <ShowScannerModal v-model="showBarcodeDialog" />
    <!-- `position` is deliberately not set: Quasar applies both
    `q-dialog__inner--maximized` and `--right`, and `--right` caps the width, so
    the panel stopped filling the screen. The slide transitions still enter from
    the right the moment a non-zero duration is wanted. -->
    <q-dialog
      v-model="showDetails"
      :maximized="isMobile"
      transition-show="slide-left"
      transition-hide="slide-right"
      :transition-duration="0">
      <credential-details-mobile
        v-if="selectedRecord"
        :record="selectedRecord"
        :delete-credential="deleteCredential"
        @close="showDetails = false" />
    </q-dialog>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2026 Digital Bazaar, Inc.
 */
import {computed, onMounted, onUnmounted, ref, toRef, watch} from 'vue';
import {formatString, getValueFromPointer} from '../lib/helpers.js';
import {config} from '@bedrock/web';
import {createEmitExtendable} from '@digitalbazaar/vue-extendable-event';
import CredentialDetailsMobile from './CredentialDetailsMobile.vue';
import CredentialsList from './CredentialsList.vue';
import {getCredentialCategory} from '../lib/useCredentialCardConfig.js';
import PullToRefresh from './PullToRefresh.vue';
import SearchBox from './SearchBox.vue';
import ShowScannerModal from './ShowScannerModal.vue';

const MOBILE_BREAKPOINT = '(max-width: 767px)';

// shown for credentials no configured rule claims
const UNCATEGORISED = 'Other';

export default {
  name: 'CredentialDashboard',
  components: {
    CredentialDetailsMobile,
    CredentialsList,
    PullToRefresh,
    SearchBox,
    ShowScannerModal
  },
  props: {
    credentials: {
      type: Array,
      required: true
    },
    profiles: {
      default: () => [],
      type: Array,
      required: false
    },
    loading: {
      type: Boolean,
      required: false
    },
    errorText: {
      type: String,
      required: true
    }
  },
  emits: [
    'refresh',
    'delete-credential',
    'filtered-credentials-loading',
    'filtered-profiles'
  ],
  setup(props, {emit}) {
    // Constants
    const emitExtendable = createEmitExtendable({emit});

    // Refs
    const search = ref('');
    const filteredProfiles = ref([]);
    const showBarcodeDialog = ref(false);
    const showDetails = ref(false);
    const selectedRecord = ref(null);
    const credentials = toRef(props, 'credentials');
    const activeCategory = ref(null);
    // resolved before the first render, not in `onMounted`: mounting later
    // would paint the desktop layout once and then re-center it, which reads
    // as the search field jumping sideways as the page loads
    const isMobile = ref(window.matchMedia(MOBILE_BREAKPOINT).matches);

    let _mq = null;
    const _onMqChange = e => {
      isMobile.value = e.matches;
    };
    onMounted(() => {
      _mq = window.matchMedia(MOBILE_BREAKPOINT);
      isMobile.value = _mq.matches;
      _mq.addEventListener('change', _onMqChange);
    });
    onUnmounted(() => {
      _mq?.removeEventListener('change', _onMqChange);
    });

    function credentialCategory(credential) {
      return getCredentialCategory({
        credential, categories: config?.vueWallet?.credentialCategories
      }) ?? UNCATEGORISED;
    }

    // Categories actually held, in the order the rules declare them, so chips
    // keep a stable position as credentials come and go
    const credentialCategories = computed(() => {
      const rules = config?.vueWallet?.credentialCategories ?? [];
      const order = [];
      for(const {category} of rules) {
        if(!order.includes(category)) {
          order.push(category);
        }
      }
      order.push(UNCATEGORISED);
      const present = new Set(credentials.value.map(
        ({credential}) => credentialCategory(credential)));
      return order.filter(category => present.has(category));
    });

    // Credentials filtered by category (AND) search term
    const filteredCredentials = computed(() => {
      emit('filtered-credentials-loading', true);
      const category = activeCategory.value;
      const result = credentials.value.filter(({credential}) => {
        if(!credential) {
          return false;
        }
        if(category && credentialCategory(credential) !== category) {
          return false;
        }
        const searchTerm = search.value.toLowerCase();
        if(searchTerm) {
          const credentialName = credential.name || credential.type?.[1] || '';
          const {
            titleOverride, subtitleOverride
          } = credentialOverrides(credential);
          const searchableFields = [
            titleOverride, subtitleOverride, credentialName
          ];
          if(!searchableFields.some(
            field => field.toLowerCase().includes(searchTerm))) {
            return false;
          }
        }
        return true;
      });
      emit('filtered-credentials-loading', false);
      return result;
    });

    // Boolean for no filtered results
    const noResults = computed(() => filteredCredentials.value.length === 0);

    // Events
    const refresh = () => {
      emit('refresh');
    };

    const onPullRefresh = async done => {
      try {
        // extendable, so a parent that awaits its fetch keeps the spinner up
        // until the list has actually been refreshed
        await emitExtendable('refresh');
      } finally {
        done?.();
      }
    };

    const openBarcodeDialog = () => {
      showBarcodeDialog.value = true;
    };

    const onSelect = credentialRecord => {
      selectedRecord.value = credentialRecord;
      showDetails.value = true;
    };

    // a chip disappears once its last credential is gone; leaving it active
    // filtered the list to nothing with no way back but a reload
    watch(credentialCategories, categories => {
      if(activeCategory.value && !categories.includes(activeCategory.value)) {
        activeCategory.value = null;
      }
    });

    // Pass delete-credential event up component chain
    const deleteCredential = async ({profileId, credentialId}) => {
      return emitExtendable('delete-credential', {profileId, credentialId});
    };

    // Watchers
    watch(() => filteredProfiles, () => {
      return emit('filtered-profiles', filteredProfiles.value);
    }, {immediate: true});

    // `formatString` indexes into the value, so an unresolved pointer would
    // throw rather than render nothing
    function _format(value, format) {
      return typeof value === 'string' && value.length > 0 ?
        formatString(value, format) : '';
    }

    // Get each credential title and subtitle overrides
    function credentialOverrides(credential) {
      let titleOverride = '';
      let subtitleOverride = '';
      // Get credential override config
      const vcConfig = config?.vueWallet?.cardDesigns?.find(config => {
        const pointers = Object.keys(config.matches);
        return pointers.every(pointer => {
          const value = getValueFromPointer(credential, pointer);
          return Array.isArray(value) ?
            value.includes(config.matches[pointer]) :
            value === config.matches[pointer];
        });
      });
      if(vcConfig?.overrides?.title) {
        const {title} = vcConfig.overrides;
        const titleValue = getValueFromPointer(credential, title.pointer);
        titleOverride = _format(titleValue, title.format);
      }
      if(vcConfig?.overrides?.subtitle) {
        const {subtitle} = vcConfig.overrides;
        const stValue = getValueFromPointer(credential, subtitle.pointer);
        subtitleOverride = _format(stValue, subtitle.format);
      }
      return {
        titleOverride,
        subtitleOverride
      };
    }

    return {
      activeCategory,
      credentialCategories,
      deleteCredential,
      filteredCredentials,
      filteredProfiles,
      isMobile,
      noResults,
      onPullRefresh,
      onSelect,
      refresh,
      search,
      openBarcodeDialog,
      selectedRecord,
      showBarcodeDialog,
      showDetails
    };
  }
};
</script>

<style lang="scss" scoped>
// matches the dense outlined search field beside it, so the two read as one
// control row rather than a field with a smaller satellite button
.s-row-action {
  width: 40px;
  min-width: 40px;
  height: 40px;
  min-height: 40px;
  padding: 0;
}

// a single non-wrapping row that scrolls sideways: the band must never grow a
// second line and push the list down, and a chip clipped at the right edge is
// what tells someone there is more to scroll to
// the search field sits 21px from the edge and a chip carries its own 4px
// margin, so the band's padding makes up the difference and the first chip
// lines up with the field above it
$content-inset: 21px;
$chip-margin: 4px;

// the same gap the chip band leaves above the first row, so the view breathes
// evenly between the header, the controls and the list
$section-gap: 26px;

.s-search-row {
  margin-top: $section-gap;
}

.s-type-band {
  flex: 0 0 auto;
  // breathing room between the filter band and the first row
  margin-bottom: 10px;
  padding-left: $content-inset - $chip-margin;
  // the band must be exactly as wide as the view and scroll its content
  // internally; without the cap its un-wrappable chips size the box instead
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-right: 8px;
  padding-bottom: 4px;

  // a visible scrollbar under the chips reads as a stray horizontal rule
  scrollbar-width: none; // Firefox
  -ms-overflow-style: none; // legacy Edge/IE

  &::-webkit-scrollbar {
    display: none; // Chrome/Safari
  }
}

// reachable by keyboard and screen reader, absent from the visual design
.s-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;

  &:focus-visible {
    position: static;
    width: auto;
    height: auto;
    clip: auto;
  }
}

.s-type-chips {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 4px;
}

// the pull-to-refresh target must cover the whole remaining viewport, not just
// the rows -- otherwise dragging anywhere in the empty space below a short list
// does nothing. `align-self: stretch` overrides the flex parent's default
// `align-items` so this still fills the row when the list is short.
.s-pull-area {
  flex: 1 1 auto;
  align-self: stretch;
  // flex items default to `min-width: auto`, so this would otherwise stretch to
  // the chip band's full un-scrolled width and drag the page sideways with it
  min-width: 0;
  min-height: 60vh;
  // nothing in this view pans sideways. `clip` rather than `hidden`: `hidden`
  // would force `overflow-y` to `auto` (per spec, `hidden` + `visible` is
  // invalid), making this a second vertical scroll container that fights both
  // the page scroll and the pull gesture. `clip` creates no scroll box, so the
  // chip band inside keeps its own horizontal scrolling.
  overflow-x: clip;

  :deep(.s-pull-content) {
    min-height: inherit;
  }
}
</style>
