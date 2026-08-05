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
        v-if="isMobile && credentialTypes.length > 1"
        class="col-xs-12 s-type-band">
        <div class="s-type-chips">
          <q-chip
            :outline="activeType !== null"
            clickable
            color="primary"
            text-color="white"
            @click="activeType = null">
            All
          </q-chip>
          <q-chip
            v-for="type in credentialTypes"
            :key="type"
            :outline="activeType !== type"
            clickable
            color="primary"
            text-color="white"
            @click="activeType = type">
            {{type}}
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
        @dragstart.prevent
        @pointerdown="onDetailsPointerDown"
        @pointermove="onDetailsPointerMove"
        @pointerup="onDetailsPointerUp"
        @pointercancel="onDetailsPointerUp">
        <q-btn
          v-if="isMobile"
          flat
          round
          dense
          color="dark"
          icon="fas fa-arrow-left"
          class="s-details-back"
          @click="showDetails = false" />
        <q-btn
          flat
          round
          dense
          color="dark"
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
          :card-styles="{}"
          :card-background="''"
          :credential-overrides="{}"
          :credential-highlights="{}"
          :credential-holder-name="''"
          :hide-close="true"
          :hide-remove="true"
          :hide-views="true"
          :toggle-delete-window="toggleDeleteWindow"
          :toggle-details-window="() => showDetails = false">
          <template #under-card>
            <div
              v-if="credentialQrValue"
              class="row justify-center q-mt-lg">
              <qr-code
                :url="credentialQrValue"
                width="180px"
                height="180px"
                :border="false" />
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
import {config} from '@bedrock/web';
import {createEmitExtendable} from '@digitalbazaar/vue-extendable-event';
import CredentialDetails from './CredentialDetails.vue';
import CredentialsList from './CredentialsList.vue';
import {getCredentialTypeLabel} from '../lib/useCredentialCardConfig.js';
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
    const activeType = ref(null);
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

    function credentialType(credential) {
      return getCredentialTypeLabel({
        credential, cardDesigns: config?.vueWallet?.cardDesigns
      });
    }

    // Credential kinds actually held, ordered by their `cardDesigns` position
    // so chips keep a stable order as credentials come and go; kinds with no
    // configured design follow, alphabetically
    const credentialTypes = computed(() => {
      const designs = config?.vueWallet?.cardDesigns ?? [];
      const designOrder = new Map(
        designs.map((design, index) => [design.title, index]));
      const present = [...new Set(
        credentials.value
          .map(({credential}) => credentialType(credential))
          .filter(label => label !== undefined)
      )];
      return present.sort((a, b) => {
        const [ia, ib] = [designOrder.get(a), designOrder.get(b)];
        if(ia !== undefined && ib !== undefined) {
          return ia - ib;
        }
        if(ia !== undefined) {
          return -1;
        }
        if(ib !== undefined) {
          return 1;
        }
        return a.localeCompare(b);
      });
    });

    // Credentials filtered by category (AND) search term
    const filteredCredentials = computed(() => {
      emit('filtered-credentials-loading', true);
      const type = activeType.value;
      const result = credentials.value.filter(({credential}) => {
        if(!credential) {
          return false;
        }
        if(type && credentialType(credential) !== type) {
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
      activeType,
      credentialQrValue,
      credentialTypes,
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
// a single non-wrapping row that scrolls sideways: the band must never grow a
// second line and push the list down, and a chip clipped at the right edge is
// what tells someone there is more to scroll to
.s-type-band {
  flex: 0 0 auto;
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
