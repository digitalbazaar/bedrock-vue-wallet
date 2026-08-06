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
      <div class="row justify-center items-center full-width q-mt-lg q-mb-sm">
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
      <div
        class="column full-height bg-white s-details-panel"
        :style="detailSurfaceStyle"
        @dragstart.prevent
        @pointerdown="onDetailsPointerDown"
        @pointermove="onDetailsPointerMove"
        @pointerup="onDetailsPointerUp"
        @pointercancel="onDetailsPointerUp">
        <div
          class="s-details-band"
          :style="{backgroundColor: detailSurface.band}" />
        <q-btn
          v-if="isMobile"
          flat
          round
          dense
          :color="detailBandIsLight ? 'dark' : 'white'"
          icon="fas fa-arrow-left"
          class="s-details-back"
          @click="showDetails = false" />
        <q-btn
          flat
          round
          dense
          :color="detailBandIsLight ? 'dark' : 'white'"
          icon="fas fa-ellipsis-v"
          class="s-details-menu">
          <q-menu
            auto-close
            anchor="bottom right"
            self="top right">
            <q-list style="min-width: 160px;">
              <q-item
                clickable
                @click="shareSelectedCredential()">
                <q-item-section avatar>
                  <q-icon
                    color="primary"
                    name="fas fa-share-alt"
                    size="xs" />
                </q-item-section>
                <q-item-section>
                  Share
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item
                clickable
                @click="toggleDeleteWindow()">
                <q-item-section avatar>
                  <q-icon
                    color="negative"
                    name="far fa-trash-alt"
                    size="xs" />
                </q-item-section>
                <q-item-section class="text-negative">
                  Remove
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <credential-details
          v-if="selectedRecord"
          :credential="selectedRecord.credential"
          :card-styles="detailCardStyles"
          :card-background="detailCardBackground"
          :credential-overrides="detailCardOverrides"
          :credential-highlights="detailCardHighlights"
          :credential-holder-name="detailHolderName"
          :hide-card="detailHeroImage !== ''"
          :hide-close="true"
          :hide-remove="true"
          :hide-views="true"
          :transparent-surface="true"
          :toggle-delete-window="toggleDeleteWindow"
          :toggle-details-window="() => showDetails = false">
          <template #under-card>
            <div
              v-if="detailHeroImage"
              class="column items-center">
              <div
                class="s-details-hero"
                :style="{
                  borderColor: detailSurface.ring,
                  boxShadow: detailSurface.shadow
                }">
                <img :src="detailHeroImage">
              </div>
            </div>
            <div
              v-if="credentialQrValue"
              class="column items-center s-details-qr">
              <qr-code
                :url="credentialQrValue"
                width="180px"
                height="180px"
                :border="false" />
              <div class="q-mt-sm text-subtitle1 text-weight-medium">
                {{detailTitle}}
              </div>
            </div>
            <div
              v-if="detailFields.length"
              class="q-mt-lg s-details-fields">
              <div
                v-for="field in detailFields"
                :key="field.label"
                class="q-mb-md">
                <div class="text-grey text-body2">
                  {{field.label}}
                </div>
                <div class="text-body1">
                  {{field.value}}
                </div>
              </div>
            </div>
          </template>
        </credential-details>
      </div>
    </q-dialog>
    <q-dialog
      v-model="showDelete"
      persistent>
      <q-card
        flat
        class="q-pa-md"
        style="border-radius: 12px;">
        <q-card-section class="row items-center">
          <div class="text-body1 q-ma-md">
            Permanently remove this credential?
          </div>
        </q-card-section>
        <q-card-actions align="between">
          <q-btn
            v-close-popup
            flat
            no-caps
            label="Remove"
            color="negative"
            class="text-body1"
            icon="far fa-trash-alt"
            @click="removeSelectedCredential()" />
          <q-btn
            v-close-popup
            flat
            no-caps
            label="Cancel"
            color="primary"
            class="text-body1" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2026 Digital Bazaar, Inc.
 */
import {computed, onMounted, onUnmounted, ref, toRef, watch} from 'vue';
import {formatString, getValueFromPointer} from '../lib/helpers.js';
import {getCardSurface, getLuminance} from '../lib/cardSurface.js';
import {
  getCredentialCategory, getCredentialConfig, getCredentialTypeLabel
} from '../lib/useCredentialCardConfig.js';
import {analyzeArtwork} from '../lib/imageColor.js';
import {config} from '@bedrock/web';
import {createEmitExtendable} from '@digitalbazaar/vue-extendable-event';
import CredentialDetails from './CredentialDetails.vue';
import CredentialsList from './CredentialsList.vue';
import {getRenderedImages} from '../lib/renderMethod.js';
import PullToRefresh from './PullToRefresh.vue';
import QrCode from './QrCode.vue';
import SearchBox from './SearchBox.vue';
import ShowScannerModal from './ShowScannerModal.vue';
import {useQuasar} from 'quasar';

const MOBILE_BREAKPOINT = '(max-width: 767px)';

// a horizontal drag shorter than this is a tap or a scroll, not a swipe back
const SWIPE_BACK_DISTANCE = 60;

// a drag has to move this far before the panel takes ownership of the pointer,
// which keeps short taps on the buttons inside the panel working
const CAPTURE_DISTANCE = 8;

// used when neither the card design nor the app's branding names a colour
const DEFAULT_BAND_COLOR = '#3498DB';

// at or above this luminance a configured colour is indistinguishable from the
// card's own white surface
const WHITE_ISH_LUMINANCE = 0.85;

// shown for credentials no configured rule claims
const UNCATEGORISED = 'Other';

export default {
  name: 'CredentialDashboard',
  components: {
    CredentialDetails,
    CredentialsList,
    PullToRefresh,
    QrCode,
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
    const filteredProfiles = ref([]);
    const showBarcodeDialog = ref(false);
    const showDetails = ref(false);
    const selectedRecord = ref(null);
    const showDelete = ref(false);
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

    const onPullRefresh = done => {
      refresh();
      done?.();
    };

    const openBarcodeDialog = () => {
      showBarcodeDialog.value = true;
    };

    const onSelect = credentialRecord => {
      selectedRecord.value = credentialRecord;
      showDetails.value = true;
    };

    // The band behind the card breaks the page up, but a card configured the
    // same colour as the band would wash into it. `getCardSurface` moves the
    // band in lightness until it clears a minimum luminance delta, then picks a
    // ring and shadow that contrast with whatever it settled on -- a dark
    // shadow is invisible on a dark band, a light glow on a light one.
    // the matched card design drives the card's own look; without one the card
    // stays plain, which is the existing behaviour
    const detailDesign = computed(() => {
      const credential = selectedRecord.value?.credential;
      if(!credential) {
        return undefined;
      }
      return getCredentialConfig({
        credential, cardDesigns: config?.vueWallet?.cardDesigns
      });
    });

    // `formatString` indexes into the value, so an unresolved pointer would
    // throw rather than render nothing
    function _format(value, format) {
      return typeof value === 'string' && value.length > 0 ?
        formatString(value, format) : '';
    }

    const detailCardStyles = computed(() => ({
      textColor: detailDesign.value?.styles?.textColor || '',
      backgroundColor: detailDesign.value?.styles?.backgroundColor || ''
    }));

    // same gradient the card bundle paints, so a credential looks the same in
    // the mobile details view as it does on its card
    const detailCardBackground = computed(() => {
      const start = detailCardStyles.value.backgroundColor;
      if(!start) {
        return 'background-color: #FFF';
      }
      return `background: linear-gradient(
        140deg, ${start} 1%, ${start}DF 50%, ${start} 100%)`;
    });

    const detailCardOverrides = computed(() => {
      const credential = selectedRecord.value?.credential;
      const overrides = detailDesign.value?.overrides;
      if(!credential || !overrides) {
        return {};
      }
      const resolved = {};
      if(overrides.imagePointer) {
        const image = getValueFromPointer(credential, overrides.imagePointer);
        resolved.image = typeof image === 'string' ?
          image : (image?.id ?? '');
      }
      if(overrides.title) {
        resolved.title = _format(
          getValueFromPointer(credential, overrides.title.pointer),
          overrides.title.format);
      }
      if(overrides.subtitle) {
        resolved.subtitle = _format(
          getValueFromPointer(credential, overrides.subtitle.pointer),
          overrides.subtitle.format);
      }
      return resolved;
    });

    // the credential's own artwork, shown at card scale in the top section;
    // without one the plain card renders as before
    // a credential that renders itself (`renderMethod`) shows that rendering;
    // it is the credential's own artwork, not a logo on a white card
    const detailRenderedImages = ref([]);
    // a rendered credential carries its colours inside the image, where no
    // config can describe them, so the band is derived from the artwork
    const detailArtworkColor = ref('');
    watch(selectedRecord, async record => {
      detailRenderedImages.value = [];
      detailArtworkColor.value = '';
      if(!record?.credential) {
        return;
      }
      const credential = record.credential;
      const images = await getRenderedImages({credential});
      // a slower render must not overwrite a newer selection
      if(selectedRecord.value?.credential !== credential) {
        return;
      }
      detailRenderedImages.value = images;
      if(images.length === 0) {
        return;
      }
      // some render methods draw their own frame around the card; showing that
      // inside our own card reads as a card within a card
      const {src, color} = await analyzeArtwork({src: images[0]});
      if(selectedRecord.value?.credential !== credential) {
        return;
      }
      detailRenderedImages.value = [src, ...images.slice(1)];
      if(color) {
        detailArtworkColor.value = color;
      }
    }, {immediate: true});

    const detailHeroImage = computed(
      () => detailRenderedImages.value[0] ?? '');

    // the fields a credential actually carries. Configured `highlights` win,
    // since they name and order what matters; a credential with no design falls
    // back to its own subject fields, which is better than showing nothing.
    const detailFields = computed(() => {
      const credential = selectedRecord.value?.credential;
      if(!credential) {
        return [];
      }
      const highlights = detailDesign.value?.highlights;
      if(Array.isArray(highlights) && highlights.length > 0) {
        return highlights
          .map(({field, pointer, format, joinWith}) => ({
            label: field,
            value: _format(
              getValueFromPointer(credential, pointer, joinWith), format)
          }))
          .filter(({label, value}) => value.length > 0 &&
            // `CredentialDetails` renders the description itself, and several
            // designs also list it as a highlight
            label.toLowerCase() !== 'description' &&
            !label.toLowerCase().includes('image') &&
            !value.startsWith('data:'));
      }
      const subject = credential.credentialSubject ?? {};
      return Object.entries(subject)
        .filter(([key, value]) => typeof value === 'string' &&
          value.length > 0 && !key.toLowerCase().includes('image') &&
          !value.startsWith('data:'))
        .filter(([key]) => key.toLowerCase() !== 'description')
        .map(([key, value]) => ({
          label: formatString(key, 'capitalizeAndSeparate'), value
        }));
    });

    const detailCardHighlights = computed(() => Object.fromEntries(
      detailFields.value.map(({label, value}) => [label, value])));

    const detailHolderName = computed(() => {
      const holder = selectedRecord.value?.meta?.holder;
      const profile = props.profiles.find(({id}) => id === holder);
      return profile?.name ?? '';
    });

    const detailTitle = computed(() => {
      const credential = selectedRecord.value?.credential;
      if(!credential) {
        return '';
      }
      const candidates = [
        detailCardOverrides.value.title,
        credential.name,
        getCredentialTypeLabel({
          credential, cardDesigns: config?.vueWallet?.cardDesigns
        })
      ];
      return candidates.find(
        c => typeof c === 'string' && c.trim().length > 0)?.trim() ?? '';
    });

    const detailSurface = computed(() => {
      const branding = config?.vueWallet?.branding;
      const designColor = detailCardStyles.value.backgroundColor;
      // a design declaring white is declaring "no colour" (several do), and
      // deriving a band from it only yields grey
      const configuredColor =
        designColor && getLuminance(designColor) <= WHITE_ISH_LUMINANCE ?
          designColor : '';
      // the artwork's own colour first, then the design's, then the brand
      const surfaceColor = detailArtworkColor.value || configuredColor ||
        '#FFFFFF';
      const bandColor = detailArtworkColor.value || configuredColor ||
        branding?.brand?.primary || DEFAULT_BAND_COLOR;
      // measured against the card itself, so a card the same colour as the
      // band still separates from it
      return getCardSurface({bandColor, surfaceColor});
    });

    const detailBandIsLight = computed(
      () => getLuminance(detailSurface.value.band) > 0.5);

    const detailSurfaceStyle = computed(() => ({
      '--s-card-ring': detailSurface.value.ring,
      '--s-card-shadow': detailSurface.value.shadow
    }));

    // the QR encodes the credential's own identifier -- the only stable,
    // real value available here. What it should resolve to for a verifier is
    // still an open product question.
    const credentialQrValue = computed(() => {
      const record = selectedRecord.value;
      const id = record?.credential?.id ?? record?.meta?.id;
      return typeof id === 'string' ? id : '';
    });

    // no silent no-op: `navigator.share` where the browser supports it,
    // otherwise the clipboard, and the user is told which happened
    const shareSelectedCredential = async () => {
      const value = credentialQrValue.value;
      if(!value) {
        $q.notify({
          type: 'negative',
          message: 'This credential has no identifier to share.'
        });
        return;
      }
      const title = selectedRecord.value?.credential?.name ?? 'Credential';
      try {
        if(navigator.share) {
          await navigator.share({title, text: value});
          return;
        }
        await navigator.clipboard.writeText(value);
        $q.notify({
          type: 'positive',
          message: 'Credential identifier copied to the clipboard.'
        });
      } catch(e) {
        // an aborted share dialog is a user action, not a failure
        if(e.name === 'AbortError') {
          return;
        }
        console.error('Share credential error:', e);
        $q.notify({type: 'negative', message: 'Unable to share credential.'});
      }
    };

    const toggleDeleteWindow = () => {
      showDelete.value = !showDelete.value;
    };

    // pointer rather than touch events: a mouse drag (and Chrome's device
    // emulation) produces no touch events at all, and the gesture is tracked
    // during the drag because the browser fires `pointercancel` with no
    // usable position once it claims one
    let detailsPointerX = 0;
    let detailsPointerY = 0;
    let detailsPointerDown = false;
    let detailsCaptured = false;
    let detailsSwipedBack = false;
    const onDetailsPointerDown = event => {
      detailsPointerX = event.clientX;
      detailsPointerY = event.clientY;
      detailsPointerDown = true;
      detailsCaptured = false;
      detailsSwipedBack = false;
    };
    const onDetailsPointerMove = event => {
      if(!detailsPointerDown) {
        return;
      }
      const dx = event.clientX - detailsPointerX;
      const dy = event.clientY - detailsPointerY;
      // capture only once the drag is real: capturing on `pointerdown` keeps
      // the stream alive through a drag that starts on the card image, but it
      // also redirects a plain tap away from the button under the finger
      if(!detailsCaptured && Math.abs(dx) > CAPTURE_DISTANCE) {
        detailsCaptured = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      // latched, not recomputed: a drag that clears the threshold and then
      // drifts back or arcs downward before the pointer lifts is still a
      // swipe back, and re-deciding on the last sample made it a coin flip
      // either direction: a real back-swipe measures as a rightward drag (the
      // platform back gesture), and restricting it to leftward-only rejected
      // clean 450-600px horizontal drags outright
      if(!detailsSwipedBack && Math.abs(dx) >= SWIPE_BACK_DISTANCE &&
        Math.abs(dx) > Math.abs(dy)) {
        detailsSwipedBack = true;
      }
    };
    const onDetailsPointerUp = event => {
      detailsPointerDown = false;
      if(detailsCaptured) {
        event.currentTarget?.releasePointerCapture?.(event.pointerId);
        detailsCaptured = false;
      }
      if(detailsSwipedBack) {
        showDetails.value = false;
      }
      detailsSwipedBack = false;
    };

    // Pass delete-credential event up component chain
    const deleteCredential = async ({profileId, credentialId}) => {
      return emitExtendable('delete-credential', {profileId, credentialId});
    };

    // the lifted details dialog owns removal now, so it has to resolve the
    // holder profile and credential id itself, the way the card bundle does
    const removeSelectedCredential = async () => {
      const record = selectedRecord.value;
      if(!record) {
        return;
      }
      const profileId = record.meta?.holder;
      const credentialId = record.credential?.id ?? record.meta?.id;
      try {
        await deleteCredential({profileId, credentialId});
        showDetails.value = false;
        $q.notify({
          type: 'positive',
          message: 'Credential successfully deleted.'
        });
      } catch(e) {
        console.error('Delete credential error:', e);
        $q.notify({
          type: 'negative',
          message: 'Credential failed to be deleted. ' +
            'Please try again at a later time.'
        });
      }
    };

    // swiping left returns to the list, the same way the back arrow does:
    // the list sits to the left of the details in the user's mental model.
    // vertical drags are left alone so the details still scroll

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
      credentialQrValue,
      detailBandIsLight,
      detailCardBackground,
      detailCardOverrides,
      detailCardHighlights,
      detailCardStyles,
      detailFields,
      detailHeroImage,
      detailHolderName,
      detailTitle,
      detailSurface,
      detailSurfaceStyle,
      deleteCredential,
      filteredCredentials,
      filteredProfiles,
      isMobile,
      noResults,
      onDetailsPointerDown,
      onDetailsPointerMove,
      onDetailsPointerUp,
      onPullRefresh,
      onSelect,
      refresh,
      search,
      openBarcodeDialog,
      selectedRecord,
      removeSelectedCredential,
      shareSelectedCredential,
      showBarcodeDialog,
      showDelete,
      showDetails,
      toggleDeleteWindow
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
.s-type-band {
  flex: 0 0 auto;
  // breathing room between the filter band and the first row
  margin-bottom: 10px;
  // the band must be exactly as wide as the view and scroll its content
  // internally; without the cap its un-wrappable chips size the box instead
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 8px 4px;

  // a visible scrollbar under the chips reads as a stray horizontal rule
  scrollbar-width: none; // Firefox
  -ms-overflow-style: none; // legacy Edge/IE

  &::-webkit-scrollbar {
    display: none; // Chrome/Safari
  }
}

.s-details-panel {
  position: relative;
  width: 100%;
  // the details scroll vertically; horizontal gestures belong to swipe-back,
  // not to the browser
  touch-action: pan-y;
  // a drag starting on the credential image would otherwise become a native
  // image drag, which cancels the pointer stream mid-swipe
  user-select: none;

  :deep(img) {
    -webkit-user-drag: none;
  }
}

// sits behind the card so the page reads as two surfaces rather than one long
// white sheet. Deep enough to contain the card's shadow: the card bottoms out
// at ~221px (48px of column padding plus its fixed 3.375:2.125 height) and the
// shadow reaches ~40px past that, which otherwise smudges grey onto the white.
.s-details-band {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 272px;
  z-index: 0;
}

// the credential's artwork occupies the same footprint the plain card would,
// so the band's depth holds either way
.s-details-hero {
  // the artwork is the card: it gets no white frame behind it, only a rounded
  // clip and the ring/shadow that separate it from the band
  width: 275px;
  max-width: 100%;
  aspect-ratio: 3.375 / 2.125;
  border-radius: 16px;
  border: 1px solid;
  overflow: hidden;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

// the QR is a PNG with its own white background, so it has to clear the band
// entirely or it notches into it: the card bottoms out at ~221px and the band
// runs to 272px, so this starts the QR just past the band's edge
.s-details-qr {
  margin-top: 56px;
}

// credential tokens and ids are long unbroken strings; they must break rather
// than set the width of anything that contains them
.s-details-fields,
.s-details-qr,
:deep(.q-card__section) {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.s-details-fields {
  width: 100%;
}

// the card's own edge treatment, resolved against whatever the band settled on
:deep(.card) {
  border: 1px solid var(--s-card-ring);
  box-shadow: var(--s-card-shadow);
}

:deep(.details-dialog) {
  position: relative;
  z-index: 1;
  // as a flex item its automatic minimum size is its longest unbroken string
  // (credential tokens and ids run hundreds of characters), which widened the
  // panel and pushed the page sideways
  min-width: 0;
  max-width: 100%;
}

.s-details-back {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.s-details-menu {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
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
