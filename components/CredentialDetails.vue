<template>
  <q-card
    flat
    class="details-dialog">
    <!-- Close button -->
    <q-btn
      v-if="!nfcSharing"
      v-close-popup
      flat
      round
      color="dark"
      icon="fa fa-times"
      class="absolute-top-right q-ma-sm"
      style="font-size: 0.75em; z-index: 1;" />

    <!-- Desktop: sidebar + tabs side by side, unchanged from the original
      layout (only the card-banner styling below is shared/new). NFC
      sharing is NOT its own separate mode/branch — NfcShare must render
      whenever hasNFCPayload is true REGARDLESS of nfcSharing, since its
      own "Tap to Share" control is what sets nfcSharing to true in the
      first place. Gating NfcShare itself behind nfcSharing (an earlier
      version of this fix did exactly that, to "unify" the two layouts'
      NFC handling) made it impossible to ever start a share — nfcSharing
      only ever changes value if NfcShare exists to emit it. nfcSharing
      instead only toggles the surrounding text and hides the rest of the
      dialog while a share is actually in progress, matching the original
      per-layout behavior this replaced. -->
    <div
      v-if="!isMobile"
      class="row full-height">
      <div class="col-xs-12 col-md-5 bg-grey-2 column full-height sidebar">
        <q-card
          flat
          class="card-banner"
          :style="cardBackground">
          <credential-switch
            :credential="credential"
            :text-color="cardStyles.textColor"
            :name-override="credentialOverrides.title"
            :image-override="credentialOverrides.image"
            :description-override="credentialOverrides.subtitle">
            <template
              v-if="hasNFCPayload({credential})"
              #image>
              <div class="row justify-between">
                <dynamic-image
                  class="q-mr-auto"
                  :src="credentialOverrides.image || credentialImage"
                  size="md" />
                <!-- eslint-disable vue/no-v-html
                  this is ok to disable only because `contactlessSvg` has
                  been specifically sanitized -->
                <span v-html="contactlessSvg" />
                <!-- eslint-enable -->
              </div>
            </template>
          </credential-switch>
        </q-card>
        <div
          v-if="nfcSharing"
          class="row justify-center items-center text-body2 disabled
            q-mt-md">
          <q-spinner-ios
            size="1em"
            style="height: 24px; margin-right: 7px;" />
          <div>
            Sharing
          </div>
        </div>
        <div
          v-if="nfcSharing"
          class="text-center q-pt-md">
          <div class="text-body1">
            Hold your device near a reader to share your credential.
          </div>
          <div>
            <q-btn
              outline
              rounded
              no-caps
              class="q-mt-sm"
              @click="cancelWrite">
              Cancel
            </q-btn>
          </div>
        </div>
        <q-card-section
          v-if="hasNFCPayload({credential})"
          class="q-px-none q-pb-none flex full-width justify-center">
          <NfcShare
            ref="nfcShareComponent"
            :credential="credential"
            @sharing="nfcSharing = $event" />
        </q-card-section>
        <div
          v-if="!nfcSharing"
          class="col row justify-center q-pt-md q-pb-md q-px-xl
            sidebar-body">
          <q-card-section class="q-pa-none text-body1 text-left">
            <div>
              <div class="text-grey q-mt-lg text-body2">
                Description
              </div>
              <div class="text-body1">
                {{description}}
              </div>
              <div class="text-grey q-mt-md text-body2">
                Issued for
              </div>
              <div class="text-body1">
                {{credentialHolderName}}
              </div>
            </div>
          </q-card-section>
        </div>
      </div>
      <CredentialDetailsViews
        v-if="!nfcSharing"
        :credential="credential"
        :credential-overrides="credentialOverrides"
        :credential-highlights="credentialHighlights"
        show-remove
        @remove="toggleDeleteWindow" />
    </div>

    <!-- Mobile: card as its own element on the dialog's transparent
      background, 3rem gap, then a single bounded sheet with the tabs as
      its own sticky header — see .mobile-layout/.card-banner/.detail-sheet
      below. Purpose-built markup rather than reusing the desktop DOM
      under media queries: every previous attempt at sharing one DOM tree
      between the two layouts fought Quasar's own utility classes (`col`,
      `full-height`) and/or its JS-managed component sizing (q-scroll-area),
      neither of which a same-specificity or even `!important` CSS override
      reliably won against. Separate markup means neither layout inherits
      classes the other layout needs different behavior from. -->
    <div
      v-else
      class="mobile-layout">
      <div class="mobile-card-wrap">
        <q-card
          flat
          class="card-banner mobile-card"
          :style="cardBackground">
          <credential-switch
            :credential="credential"
            :text-color="cardStyles.textColor"
            :name-override="credentialOverrides.title"
            :image-override="credentialOverrides.image"
            :description-override="credentialOverrides.subtitle">
            <template
              v-if="hasNFCPayload({credential})"
              #image>
              <div class="row justify-between">
                <dynamic-image
                  class="q-mr-auto"
                  :src="credentialOverrides.image || credentialImage"
                  size="md" />
                <!-- eslint-disable vue/no-v-html
                  this is ok to disable only because `contactlessSvg` has
                  been specifically sanitized -->
                <span v-html="contactlessSvg" />
                <!-- eslint-enable -->
              </div>
            </template>
          </credential-switch>
        </q-card>
        <div
          v-if="nfcSharing"
          class="row justify-center items-center text-body2 disabled
            q-mt-md">
          <q-spinner-ios
            size="1em"
            style="height: 24px; margin-right: 7px;" />
          <div>
            Sharing
          </div>
        </div>
        <div
          v-if="nfcSharing"
          class="text-center q-pt-md">
          <div class="text-body1">
            Hold your device near a reader to share your credential.
          </div>
          <div>
            <q-btn
              outline
              rounded
              no-caps
              class="q-mt-sm"
              @click="cancelWrite">
              Cancel
            </q-btn>
          </div>
        </div>
        <q-card-section
          v-if="hasNFCPayload({credential})"
          class="q-px-none q-pb-none flex full-width justify-center">
          <NfcShare
            ref="nfcShareComponent"
            :credential="credential"
            @sharing="nfcSharing = $event" />
        </q-card-section>
      </div>
      <div
        v-if="!nfcSharing"
        class="detail-sheet">
        <CredentialDetailsViews
          :credential="credential"
          :credential-overrides="credentialOverrides"
          :credential-highlights="credentialHighlights"
          :credential-holder-name="credentialHolderName"
          show-remove
          @remove="toggleDeleteWindow" />
      </div>
    </div>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {
  CredentialSwitch, DynamicImage, useCredentialCommon
} from '@bedrock/vue-vc';
import {svg as contactlessSvg} from './contactless.js';
import CredentialDetailsViews from './CredentialDetailsViews.vue';
import {helpers} from '@bedrock/web-wallet';
import NfcShare from './NfcShare.vue';

const {hasNFCPayload} = helpers;

// Matches the Quasar grid breakpoint the sidebar's `col-md-5` class
// switches on (1024px) — the point where the layout actually needs to be
// structurally different, not the unrelated 767px used for the dialog's
// own box sizing.
const MOBILE_QUERY = '(max-width: 1023px)';

export default {
  name: 'CredentialDetails',
  components: {
    CredentialSwitch,
    CredentialDetailsViews,
    DynamicImage,
    NfcShare
  },
  props: {
    toggleDeleteWindow: {
      type: Function,
      required: true
    },
    credential: {
      type: Object,
      required: true
    },
    credentialHolderName: {
      type: String,
      required: true
    },
    cardStyles: {
      type: Object,
      required: true
    },
    cardBackground: {
      type: String,
      default: ''
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
    const showDelete = ref(false);
    const nfcSharing = ref(false);
    const nfcShareComponent = ref(null);
    console.log('Credential details', props.credential);

    // Reactive breakpoint check via matchMedia rather than Quasar's own
    // `$q.screen` — confirmed by direct testing that `$q.screen.lt.sm`
    // (used by CredentialCardBundle.vue's `:maximized` prop) does not
    // reliably reflect real viewport width changes (e.g. under DevTools
    // device emulation without a full reload). matchMedia is the
    // browser's own primitive and does not depend on Quasar's internal
    // state syncing.
    const isMobile = ref(false);
    let mql;
    function updateIsMobile(event) {
      isMobile.value = event.matches;
    }
    onMounted(() => {
      mql = window.matchMedia(MOBILE_QUERY);
      isMobile.value = mql.matches;
      mql.addEventListener('change', updateIsMobile);
    });
    onBeforeUnmount(() => {
      mql?.removeEventListener('change', updateIsMobile);
    });

    // Credential description
    const description = computed(() => {
      if(props.credentialOverrides.description) {
        return props.credentialOverrides.description;
      } else {
        return props.credential?.description?.length ?
          props.credential.description : 'Description not available.';
      }
    });

    function cancelWrite() {
      nfcShareComponent.value.cancelWrite();
    }

    const {credentialImage} = useCredentialCommon({
      credential: props.credential
    });

    return {
      cancelWrite,
      contactlessSvg,
      credentialImage,
      showDelete,
      description,
      hasNFCPayload,
      isMobile,
      nfcSharing,
      nfcShareComponent
    };
  }
};
</script>

<style lang="scss" scoped>
$breakpoint-sm: 767px;
.details-dialog {
  /* Never let the outer dialog itself become a scroll owner — only the
    regions designed below to scroll (the tab panel's own internal
    q-scroll-area at desktop, or .detail-sheet at mobile) should ever show
    a scrollbar. */
  overflow: hidden;

  /* Apply styles when dialog is not full screen */
  @media (min-width: #{$breakpoint-sm}) {
    border-radius: 12px;
    width: 850px;
    height: 600px;
    max-width: 80vw;
    max-height: 80vh;
  }

  /* Below 767px this component assumed CredentialCardBundle.vue's
    `:maximized="$q.screen.lt.sm"` would give the dialog a real 100vh
    height for free. Confirmed by direct testing that assumption doesn't
    reliably hold — without an explicit height here, .mobile-layout below
    (height:100%) has nothing to actually fill. Setting height directly
    here makes this component self-sufficient regardless of whether the
    parent's maximized prop actually engages. */
  @media (max-width: 1023px) {
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    max-height: 100dvh;
  }
}

.card-banner {
  /* Credit card ratio 2.125 H by 3.375 W (1.588:1 — not exactly 3:2,
    inherited from the original card's own comment). Capped at max-width
    so the fixed ratio doesn't balloon its height when its container is
    much wider than the original ~275px card — width alone scaling up
    (with height following via aspect-ratio) produced a mostly-empty card
    that barely read as a bounded card at all. */
  width: 100%;
  max-width: 340px;
  /* 16px top/left to match CredentialDetailsViews.vue's own q-pa-md
    (Quasar padding-all-medium = 16px) on its root — that's what puts the
    "Highlights" tab label 16px from the row's top on the right side, so
    the card's own top/left edges need the same offset to align with it.
    No longer horizontally centered (right stays auto, not also 16px). */
  margin: 16px auto 0 16px;
  border-radius: 16px;
  padding: 16px;
  aspect-ratio: 3.375 / 2.125;
  background-color: #FFFFFF;
  /* The <q-card flat> prop applies Quasar's `no-shadow` class
    (box-shadow: none !important) — `!important` here is required just to
    beat that, not a style choice. */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;

  /* CredentialField.vue (@bedrock/vue-vc, shared elsewhere at the old
    small fixed card width) hardcodes `max-width: 225px` plus a 1-line
    ellipsis clamp via an inline style attribute, tuned for the previous
    ~275px card. Now that this card is wider, that same cap truncates
    text (e.g. issuer name) that would otherwise fit. `!important` is
    required to beat the inline style from here; scoped only to
    card-banner so other, still-small consumers of CredentialField
    elsewhere in the wallet are unaffected. */
  :deep(.cf-value),
  :deep(.cf-title) {
    max-width: none !important;
  }
}

.mobile-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* Card sits against the dialog's own background, not a colored panel of
    its own — this is what "transparent" differentiation means here: no
    background-color competing with the card's own. */
  background: transparent;
}

.mobile-card-wrap {
  flex: none;
  display: flex;
  justify-content: center;
  padding: 3rem 1rem 1.5rem;

  /* .card-banner's own margin (16px top/left, to align with the desktop
    tabs row) leaked into mobile through the shared class — this wrap's
    own padding already provides mobile's top gap (3rem) and centering
    (justify-content), so the card needs its margin reset back to
    symmetric auto here, or it renders off-center and the mismatched
    left/right spacing can crowd the shadow against one edge. */
  .mobile-card {
    margin: 0 auto !important;
  }
}

.detail-sheet {
  /* The single bounded, single-scrolling region at mobile. flex:1 to
    consume the remaining height below the (fixed-size) card-wrap;
    min-height:0 is what actually allows it to be smaller than its
    content and scroll internally, instead of growing to fit content and
    pushing the whole page taller — the same flex rule that DB-732's
    original fix depended on, just on purpose-built markup this time
    instead of fighting Quasar's `col` utility class for it. */
  flex: 1;
  min-height: 0;
  margin: 0 1rem 1.5rem;
  border-radius: 16px;
  overflow: hidden;
  background-color: #F5F5F5;
  display: flex;
  flex-direction: column;

  :deep(.details-panel-root) {
    /* CredentialDetailsViews' own root no longer needs to fight for
      height here — .detail-sheet above is the bounded/scrolling
      container; this just needs to lay out its own children (tabs,
      then content) naturally within whatever height that gives it. */
    height: 100%;
    overflow-y: auto;
  }

  :deep(.q-tabs) {
    /* Sticky *within `.details-panel-root`'s own scroll* (the nearest
      scrolling ancestor), so the tabs stay visible as the info block and
      tab-panel content scroll beneath them. */
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: #F5F5F5;
  }
}
</style>
