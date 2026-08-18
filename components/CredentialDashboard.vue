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
          round
          outline
          size="sm"
          color="primary"
          icon="fas fa-sync-alt"
          @click="refresh" />
      </div>
    </div>
    <div
      class="col-xs-12 col-md-11 col-lg-10 s-content-column">
      <div
        v-if="bandVisible"
        class="col-xs-12 s-category-band">
        <div class="s-category-chips">
          <q-chip
            :outline="activeCategory !== null"
            clickable
            color="primary"
            text-color="white"
            @click="activeCategory = null">
            All
          </q-chip>
          <q-chip
            v-for="category in categoryOrder"
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
      <div
        v-if="isMobile"
        class="col-xs-12">
        <!-- the wide list renders its own error and empty states; the mobile
        branch has to render them too, or a phone shows an empty list and no
        reason for it -->
        <div
          v-if="loading"
          class="text-center q-pa-xl">
          <q-spinner
            color="primary"
            size="3em" />
        </div>
        <q-banner
          v-else-if="errorText"
          dense
          rounded
          class="bg-red-5 text-white q-ma-md">
          {{errorText}}
        </q-banner>
        <!-- an empty wallet and a search that matched nothing are different
        things to be told, as the wide list has always distinguished them -->
        <div
          v-else-if="noResults"
          class="text-center text-grey-7 q-pa-xl">
          {{emptyStateText}}
        </div>
        <credential-list-row
          v-for="(record, index) in filteredCredentials"
          :key="credentialKey(record, index)"
          :credential-record="record"
          @select="openDetails" />
      </div>
      <q-dialog
        v-model="showDetails"
        maximized>
        <credential-details-mobile
          v-if="selectedRecord"
          :record="selectedRecord"
          :delete-credential="deleteSelectedCredential"
          @close="showDetails = false" />
      </q-dialog>
      <credentials-list
        v-if="!isMobile"
        :credentials="filteredCredentials"
        :profile-options="profiles"
        :no-results="noResults"
        :search="search"
        :loading="loading"
        :error-text="errorText"
        @delete-credential="$event.waitUntil(deleteCredential($event))" />
    </div>
    <ShowScannerModal v-model="showBarcodeDialog" />
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2026 Digital Bazaar, Inc.
 */
import {computed, ref, toRef, watch} from 'vue';
import {
  formatString, getCredential, getValueFromPointer
} from '../lib/helpers.js';
import {
  getCategoryOrder, getCredentialCategory
} from '../lib/useCredentialCardConfig.js';
import {QSpinner, useQuasar} from 'quasar';
import {config} from '@bedrock/web';
import {createEmitExtendable} from '@digitalbazaar/vue-extendable-event';
import CredentialDetailsMobile from './CredentialDetailsMobile.vue';
import CredentialListRow from './CredentialListRow.vue';
import CredentialsList from './CredentialsList.vue';
import SearchBox from './SearchBox.vue';
import ShowScannerModal from './ShowScannerModal.vue';

export default {
  name: 'CredentialDashboard',
  components: {
    CredentialDetailsMobile,
    CredentialListRow,
    CredentialsList,
    // registered locally, unlike this file's other Quasar components: the
    // mobile branch is the only place the spinner appears, and a component
    // resolved from the global install is invisible to a component test
    QSpinner,
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
    const $q = useQuasar();
    const emitExtendable = createEmitExtendable({emit});

    // Refs
    const search = ref('');
    const activeCategory = ref(null);
    const showDetails = ref(false);
    const selectedRecord = ref(null);
    const filteredProfiles = ref([]);
    const showBarcodeDialog = ref(false);
    const credentials = toRef(props, 'credentials');

    // a raw verifiable credential has no `meta`, so there is no record id to
    // key on; fall back to the credential's own id and finally to position
    function credentialKey(record, index) {
      return record?.meta?.id ?? getCredential(record)?.id ?? index;
    }

    function openDetails(record) {
      selectedRecord.value = record;
      showDetails.value = true;
    }

    // the dashboard owns the extendable `delete-credential` event; the details
    // view invokes this rather than emitting one of its own, so there is a
    // single path a parent can hook with `waitUntil`
    async function deleteSelectedCredential({profileId, credentialId}) {
      await emitExtendable('delete-credential', {profileId, credentialId});
      showDetails.value = false;
    }

    // one app-level setting moves every surface at once
    const isMobile = computed(() => $q.screen.lt.sm);

    // the ordered list and the membership test both come from the library, so
    // a change to precedence cannot leave chip order disagreeing with what
    // each chip filters to
    const categoryOrder = computed(() => getCategoryOrder({
      // through `getCredential`, like the list this band filters: destructuring
      // `{credential}` categorised none of the `content`-shaped records the
      // list itself accepts, so those users got rows and no band
      credentials: credentials.value.map(record => getCredential(record))
        .filter(credential => credential),
      categories: config?.vueWallet?.credentialCategories
    }));

    // The band is the only control that can clear this, and it renders only
    // on mobile with more than one category. Whenever it is not on screen the
    // filter has to go with it, or the wide list silently shows one category
    // with nothing to explain or undo it -- rotate a phone, or delete
    // credentials until one category remains, and the list quietly narrows.
    const bandVisible = computed(
      () => isMobile.value && categoryOrder.value.length > 1);

    watch(bandVisible, visible => {
      if(!visible) {
        activeCategory.value = null;
      }
    });

    // a category that disappears while selected would otherwise filter the
    // list down to nothing with no chip showing why
    watch(categoryOrder, order => {
      if(activeCategory.value && !order.includes(activeCategory.value)) {
        activeCategory.value = null;
      }
    });

    // Credentials filtered by search term match
    const filteredCredentials = computed(() => {
      emit('filtered-credentials-loading', true);
      const filteredCredentials = credentials.value.filter(record => {
        // destructuring `{credential}` dropped every record shaped
        // `{content, meta}` and every bare verifiable credential, so a
        // consumer passing either saw an empty list and no reason for it --
        // `CredentialsList` accepts all three and never got the chance
        const credential = getCredential(record);
        if(credential) {
          if(activeCategory.value && getCredentialCategory({
            credential, categories: config?.vueWallet?.credentialCategories
          }) !== activeCategory.value) {
            return false;
          }
          const searchTerm = search.value.toLowerCase();
          const credentialName = credential.name || credential.type[1] || '';
          const {
            titleOverride, subtitleOverride
          } = credentialOverrides(credential);
          const searchableFields = [
            titleOverride, subtitleOverride, credentialName
          ];
          return searchableFields.some(
            field => field.toLowerCase().includes(searchTerm));
        }
      });
      emit('filtered-credentials-loading', false);
      return filteredCredentials;
    });

    // Boolean for no filtered results
    const noResults = computed(() => filteredCredentials.value.length === 0);

    // says which of the three reasons the list is empty, and echoes the search
    // back: a user holding twelve credentials who mistypes one was told they
    // had none, with nothing on screen naming what they had typed
    const emptyStateText = computed(() => {
      if(search.value) {
        return `No credentials match "${search.value}".`;
      }
      if(activeCategory.value) {
        return `No ${activeCategory.value} credentials.`;
      }
      return 'No credentials yet.';
    });

    // Events
    const refresh = () => {
      emit('refresh');
    };

    const openBarcodeDialog = () => {
      showBarcodeDialog.value = true;
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
      deleteCredential,
      activeCategory,
      bandVisible,
      categoryOrder,
      credentialKey,
      deleteSelectedCredential,
      openDetails,
      selectedRecord,
      showDetails,
      filteredCredentials,
      isMobile,
      filteredProfiles,
      noResults,
      emptyStateText,
      refresh,
      search,
      openBarcodeDialog,
      showBarcodeDialog
    };
  }
};
</script>

<style lang="scss" scoped>
// a row insets its content by `q-px-md` and a chip carries its own 4px margin,
// so the band makes up the difference and the first chip's left edge lands on
// the same line as the credential names below it
$content-inset: 16px;
$chip-margin: 4px;

// One row that scrolls sideways, never two. Wrapping is the failure mode: a
// second line pushes the list down and moves it again whenever the filter
// changes the chip count, and a deployment naming six categories would push
// the first credential off a phone screen. A chip clipped at the right edge is
// also what tells someone there is more band to scroll to.
.s-category-band {
  flex: 0 0 auto;
  margin-bottom: 10px;
  padding-left: $content-inset - $chip-margin;
  padding-right: 8px;
  padding-bottom: 4px;
  // the band is exactly as wide as the view and scrolls its content inside
  // itself; without the cap its un-wrappable chips size the box instead and
  // take the page sideways with them
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  // a visible scrollbar under the chips reads as a stray horizontal rule
  scrollbar-width: none; // Firefox
  -ms-overflow-style: none; // legacy Edge/IE

  &::-webkit-scrollbar {
    display: none; // Chrome and Safari
  }
}

// sizes to its content rather than to the band, which is what gives the band
// something wider than itself to scroll
.s-category-chips {
  display: inline-flex;
  flex-wrap: nowrap;
}

// A flex item's automatic minimum size is its content, so without this the
// band's un-wrappable chips size this column -- measured at 616px inside a
// 412px viewport -- and the band, capped at `100%` of a column already wider
// than the screen, has nothing to scroll. The chips then run off the right
// edge with no way to reach them.
.s-content-column {
  min-width: 0;
}
</style>
