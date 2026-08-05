<template>
  <q-page
    class="row justify-center"
    style="min-height: 0px;">
    <div class="row justify-center full-width q-mt-lg q-mb-sm">
      <div class="col-md-4 col-sm-6 col-xs-9">
        <search-box
          class="col-grow"
          placeholder="Search credentials"
          @search="search=$event.text" />
      </div>
      <div class="q-mx-sm q-mt-xs">
        <q-btn
          round
          outline
          size="sm"
          color="primary"
          class="q-mr-sm"
          icon="fas fa-barcode"
          @click="openBarcodeDialog" />
        <q-btn
          v-if="!isMobile"
          round
          outline
          size="sm"
          color="primary"
          icon="fas fa-sync-alt"
          @click="refresh" />
      </div>
    </div>
    <div
      v-if="isMobile && credentialCategories.length > 1"
      class="col-xs-12 s-category-band">
      <div class="s-category-chips">
        <q-chip
          :outline="activeCategory !== null && activeCategory !== 'all'"
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
    <q-pull-to-refresh
      v-if="isMobile"
      class="col-xs-12 col-md-11 col-lg-10 s-pull-area"
      @refresh="onPullRefresh">
      <credentials-list
        :credentials="filteredCredentials"
        :profile-options="profiles"
        :no-results="noResults"
        :search="search"
        :loading="loading"
        :error-text="errorText"
        @select="onSelect"
        @delete-credential="$event.waitUntil(deleteCredential($event))" />
    </q-pull-to-refresh>
    <div
      v-else
      class="col-xs-12 col-md-11 col-lg-10">
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
    <ShowScannerModal v-model="showBarcodeDialog" />
    <q-dialog
      v-model="showDetails"
      transition-show="slide-up"
      transition-hide="slide-down"
      :maximized="$q.screen.lt.sm">
      <credential-details
        :credential="selectedCredential"
        :card-styles="{}"
        :card-background="''"
        :credential-overrides="{}"
        :credential-highlights="{}"
        :credential-holder-name="''"
        :toggle-delete-window="() => {}"
        :toggle-details-window="() => showDetails = false" />
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
import CredentialDetails from './CredentialDetails.vue';
import CredentialsList from './CredentialsList.vue';
import {getCredentialConfig} from '../lib/useCredentialCardConfig.js';
import SearchBox from './SearchBox.vue';
import ShowScannerModal from './ShowScannerModal.vue';

// catch-all for credentials with no matching `cardDesigns` entry; always sorts
// last in the chip band
const OTHER_CATEGORY = 'Other';

// display order for the category chips, independent of the order credentials
// happen to load in
const CATEGORY_ORDER = [
  'IDs',
  'Certifications',
  'Payment & Loyalty',
  'Tickets',
  'Insurance',
  OTHER_CATEGORY
];

export default {
  name: 'CredentialDashboard',
  components: {
    CredentialDetails,
    CredentialsList,
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
    const selectedCredential = ref(null);
    const credentials = toRef(props, 'credentials');
    const activeCategory = ref(null);
    const isMobile = ref(false);

    // Mobile breakpoint using matchMedia (max-width: 767px)
    let _mq = null;
    const _onMqChange = e => {
      isMobile.value = e.matches;
    };
    onMounted(() => {
      _mq = window.matchMedia('(max-width: 767px)');
      isMobile.value = _mq.matches;
      _mq.addEventListener('change', _onMqChange);
    });
    onUnmounted(() => {
      _mq?.removeEventListener('change', _onMqChange);
    });

    // Human-facing category for a credential, from its `cardDesigns` entry;
    // credentials with no matching entry group under `Other`
    function credentialCategory(credential) {
      if(!credential) {
        return undefined;
      }
      const cardDesigns = config?.vueWallet?.cardDesigns;
      const vcConfig = getCredentialConfig({credential, cardDesigns});
      return vcConfig?.category ?? OTHER_CATEGORY;
    }

    // Categories actually present, in a stable display order so chips do not
    // reorder as credentials are added or removed
    const credentialCategories = computed(() => {
      const present = new Set(
        credentials.value
          .map(({credential}) => credentialCategory(credential))
          .filter(category => category !== undefined)
      );
      const ordered = CATEGORY_ORDER.filter(category => present.has(category));
      // any category not in the known order (e.g. one added to cardDesigns
      // later) still shows, after the known ones and before `Other`
      const unknown = [...present].filter(
        category => !CATEGORY_ORDER.includes(category));
      return [...ordered.filter(c => c !== OTHER_CATEGORY), ...unknown,
        ...(present.has(OTHER_CATEGORY) ? [OTHER_CATEGORY] : [])];
    });

    // Credentials filtered by category (AND) search term
    const filteredCredentials = computed(() => {
      emit('filtered-credentials-loading', true);
      const category = activeCategory.value;
      const result = credentials.value.filter(({credential}) => {
        if(!credential) {
          return false;
        }
        if(category && category !== 'all' &&
          credentialCategory(credential) !== category) {
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

    const onPullRefresh = done => {
      refresh();
      done?.();
    };

    const openBarcodeDialog = () => {
      showBarcodeDialog.value = true;
    };

    const onSelect = credential => {
      selectedCredential.value = credential;
      showDetails.value = true;
    };

    // Pass delete-credential event up component chain
    const deleteCredential = async ({profileId, credentialId}) => {
      return emitExtendable('delete-credential', {profileId, credentialId});
    };

    // Watchers
    watch(() => filteredProfiles, () => {
      return emit('filtered-profiles', filteredProfiles.value);
    }, {immediate: true});

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
        titleOverride = formatString(titleValue, title.format) ?? '';
      }
      if(vcConfig?.overrides?.subtitle) {
        const {subtitle} = vcConfig.overrides;
        const stValue = getValueFromPointer(credential, subtitle.pointer);
        subtitleOverride = formatString(stValue, subtitle.format) ?? '';
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
      selectedCredential,
      showBarcodeDialog,
      showDetails
    };
  }
};
</script>

<style lang="scss" scoped>
.s-category-band {
  overflow-x: auto;
  white-space: nowrap;
  padding: 0 8px 4px;

  // the band stays swipeable; the scrollbar itself is hidden, since a visible
  // one reads as a stray horizontal rule under the chips
  scrollbar-width: none; // Firefox
  -ms-overflow-style: none; // legacy Edge/IE

  &::-webkit-scrollbar {
    display: none; // Chrome/Safari
  }
}

.s-category-chips {
  display: inline-flex;
  gap: 4px;
}

// the pull-to-refresh target must cover the whole remaining viewport, not just
// the rows -- otherwise dragging anywhere in the empty space below a short list
// does nothing. `align-self: stretch` overrides the flex parent's default
// `align-items` so this still fills the row when the list is short.
.s-pull-area {
  flex: 1 1 auto;
  align-self: stretch;
  min-height: 60vh;

  :deep(.q-pull-to-refresh__content) {
    min-height: inherit;
  }
}
</style>
