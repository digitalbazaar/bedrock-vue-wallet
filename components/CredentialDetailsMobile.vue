<template>
  <div
    class="column full-height bg-white s-cdm"
    @dragstart.prevent
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp">
    <!-- chrome: back + overflow menu, fixed above the scrolling body -->
    <q-btn
      flat
      round
      dense
      color="grey-9"
      icon="fas fa-arrow-left"
      aria-label="Back to credentials"
      class="s-cdm-back"
      @click="$emit('close')" />
    <q-btn
      flat
      round
      dense
      color="grey-9"
      icon="fas fa-ellipsis-v"
      aria-label="Credential actions"
      class="s-cdm-menu">
      <q-menu
        auto-close
        anchor="bottom right"
        self="top right">
        <q-list style="min-width: 160px;">
          <q-item
            clickable
            @click="share()">
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
            @click="showDelete = true">
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

    <q-scroll-area class="col">
      <div class="s-cdm-body q-px-lg q-pt-xl q-pb-lg">
        <!-- 1. Name + description -->
        <div class="text-h6 text-weight-bold">
          {{title}}
        </div>
        <div
          v-if="description"
          class="text-body2 text-grey-8 q-mt-xs">
          {{description}}
        </div>

        <!-- 2. Highlights -->
        <div
          v-if="fields.length"
          class="q-mt-lg">
          <div
            v-for="field in fields"
            :key="field.label"
            class="q-mb-md">
            <div class="text-grey-7 text-caption">
              {{field.label}}
            </div>
            <div class="text-body1">
              {{field.value}}
            </div>
          </div>
        </div>

        <!-- 3. Rendering(s): one shows directly; several become a swipeable
        carousel so a credential with multiple render modes can be paged -->
        <div
          v-if="loadingDisplays"
          class="row justify-center q-my-xl">
          <q-spinner
            size="40px"
            color="primary" />
        </div>
        <template v-else-if="displays.length">
          <div class="text-grey-7 text-caption q-mt-lg q-mb-sm">
            {{displays.length > 1 ? 'Renderings' : 'Rendering'}}
          </div>
          <div
            v-if="displays.length === 1"
            class="s-cdm-render">
            <img
              v-if="displays[0].kind === 'image'"
              :src="displays[0].content"
              class="s-cdm-img"
              :alt="`${title} rendering`">
            <credential-html-display
              v-else-if="displays[0].kind === 'html'"
              class="full-width"
              :credential="credential"
              :render-method="displays[0].renderMethod"
              :style-hint="displays[0].style" />
          </div>
          <q-carousel
            v-else
            v-model="slide"
            swipeable
            animated
            navigation
            infinite
            height="auto"
            class="s-cdm-carousel">
            <q-carousel-slide
              v-for="(display, index) in displays"
              :key="index"
              :name="index"
              class="q-pa-none column flex-center">
              <img
                v-if="display.kind === 'image'"
                :src="display.content"
                class="s-cdm-img"
                :alt="`${title} rendering ${index + 1}`">
              <credential-html-display
                v-else-if="display.kind === 'html'"
                class="full-width"
                :credential="credential"
                :render-method="display.renderMethod"
                :style-hint="display.style" />
            </q-carousel-slide>
          </q-carousel>
        </template>
      </div>
    </q-scroll-area>

    <!-- remove confirmation -->
    <q-dialog
      v-model="showDelete"
      persistent>
      <q-card
        flat
        class="q-pa-md"
        style="border-radius: 12px;">
        <q-card-section class="row items-center">
          <div class="text-body1 q-ma-md">
            Permanently remove {{title || 'this credential'}}? This cannot be
            undone, and a credential you cannot request again from its issuer
            is gone for good.
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
            @click="remove()" />
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
  </div>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {computed, ref, watch} from 'vue';
import {config} from '@bedrock/web';
import CredentialHtmlDisplay from './CredentialHtmlDisplay.vue';
import {getCredential} from '../lib/helpers.js';
import {getCredentialSummary} from '../lib/credentialSummary.js';
import {getRenderedDisplays} from '../lib/renderMethod.js';
import {useQuasar} from 'quasar';

// a rightward drag shorter than this is a tap or a scroll, not a swipe back
const SWIPE_BACK_DISTANCE_PX = 60;
// a drag has to move this far before the panel takes ownership of the pointer,
// which keeps short taps on the buttons inside the panel working
const CAPTURE_DISTANCE_PX = 8;

export default {
  name: 'CredentialDetailsMobile',
  components: {CredentialHtmlDisplay},
  props: {
    // the selected `{credential, meta}` record to show
    record: {
      type: Object,
      required: true
    },
    // async ({profileId, credentialId}) => Promise; the dashboard owns the
    // extendable delete-credential event, this component just invokes it
    deleteCredential: {
      type: Function,
      required: true
    }
  },
  emits: ['close'],
  setup(props, {emit}) {
    const $q = useQuasar();

    // through `getCredential`, like every other surface that renders a
    // record: `CredentialsList` accepts `{credential, meta}`,
    // `{content, meta}` and a bare verifiable credential, and the
    // dashboard hands this view whatever the consumer passed, so reading
    // `record.credential` opened a blank panel on two of the three
    const credential = computed(() => getCredential(props.record));
    // the same summary the row reads, so a row and the panel it opens
    // cannot disagree about what the credential is called
    const summary = computed(() => getCredentialSummary({
      credential: credential.value,
      cardDesigns: config?.vueWallet?.cardDesigns
    }));
    const title = computed(() => summary.value.title);
    const description = computed(() => summary.value.description);
    const fields = computed(() => summary.value.fields);

    // the renderings the credential declares for itself; loaded async because
    // an html render is resolved lazily
    const displays = ref([]);
    const loadingDisplays = ref(true);
    const slide = ref(0);
    watch(credential, async c => {
      displays.value = [];
      slide.value = 0;
      loadingDisplays.value = true;
      if(!c) {
        loadingDisplays.value = false;
        return;
      }
      const result = await getRenderedDisplays({credential: c});
      // a slower render must not overwrite a newer selection
      if(credential.value !== c) {
        return;
      }
      displays.value = result;
      loadingDisplays.value = false;
    }, {immediate: true});

    // no silent no-op: `navigator.share` where supported, else the clipboard,
    // and the user is told which happened
    const share = async () => {
      const id = credential.value?.id ?? props.record?.meta?.id;
      const value = typeof id === 'string' ? id : '';
      if(!value) {
        $q.notify({
          type: 'negative',
          message: 'This credential has no identifier to share.'
        });
        return;
      }
      try {
        if(navigator.share) {
          await navigator.share({
            title: credential.value?.name ?? 'Credential', text: value
          });
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

    const showDelete = ref(false);
    const remove = async () => {
      const record = props.record;
      if(!record) {
        return;
      }
      const profileId = record.meta?.holder;
      const credentialId = getCredential(record)?.id ?? record.meta?.id;
      try {
        await props.deleteCredential({profileId, credentialId});
        $q.notify({
          type: 'positive', message: 'Credential successfully deleted.'
        });
        emit('close');
      } catch(e) {
        console.error('Delete credential error:', e);
        $q.notify({
          type: 'negative',
          message: 'Credential failed to be deleted. ' +
            'Please try again at a later time.'
        });
      }
    };

    // swipe-back: a horizontal drag returns to the list, the way the back
    // arrow does. Pointer (not touch) events so a mouse drag and Chrome's
    // device emulation both work; vertical drags are left to scroll.
    let pointerX = 0;
    let pointerY = 0;
    let pointerDown = false;
    let captured = false;
    let swipedBack = false;
    let selectionAtStart = '';
    // what the user has selected, so a drag that creates a selection can be
    // told from one that merely happens while an older selection is on screen
    function selectedText() {
      const selection = globalThis.getSelection?.();
      if(!selection || selection.isCollapsed) {
        return '';
      }
      return selection.toString();
    }

    const onPointerDown = event => {
      // a horizontal swipe inside the carousel pages it, and a drag on a
      // rendering belongs to the rendering; neither may also close the panel
      if(event.target?.closest?.('.s-cdm-carousel, .s-cdm-render')) {
        pointerDown = false;
        return;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      selectionAtStart = selectedText();
      pointerDown = true;
      captured = false;
      swipedBack = false;
    };
    const onPointerMove = event => {
      if(!pointerDown) {
        return;
      }
      const dx = event.clientX - pointerX;
      const dy = event.clientY - pointerY;
      // A drag that grew the selection is the user copying a value, not
      // navigating. The credential's own values are deliberately selectable --
      // an id nobody can copy is an id nobody can use -- and copying one is a
      // horizontal drag across text. Compared against the selection at
      // pointerdown, so a selection already on screen does not disable the
      // gesture for the rest of the panel's life.
      const selection = selectedText();
      if(selection && selection !== selectionAtStart) {
        pointerDown = false;
        swipedBack = false;
        return;
      }
      // Rightward only, for the capture as well as the threshold: `Math.abs`
      // closed the panel on a leftward drag too, and capturing the pointer at
      // 8px in either direction took it from a selection before the swipe
      // threshold was anywhere near.
      if(!captured && dx > CAPTURE_DISTANCE_PX) {
        captured = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      // latched, not recomputed, so a drag that clears the threshold and then
      // drifts still counts as a back-swipe
      if(!swipedBack && dx >= SWIPE_BACK_DISTANCE_PX && dx > Math.abs(dy)) {
        swipedBack = true;
      }
    };
    const onPointerUp = event => {
      pointerDown = false;
      if(captured) {
        event.currentTarget?.releasePointerCapture?.(event.pointerId);
        captured = false;
      }
      if(swipedBack) {
        emit('close');
      }
      swipedBack = false;
    };

    return {
      credential,
      title,
      description,
      fields,
      displays,
      loadingDisplays,
      slide,
      share,
      showDelete,
      remove,
      onPointerDown,
      onPointerMove,
      onPointerUp
    };
  }
};
</script>

<style lang="scss" scoped>
.s-cdm {
  position: relative;
  width: 100%;
  // details scroll vertically; horizontal gestures belong to swipe-back
  touch-action: pan-y;
}

.s-cdm-back {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.s-cdm-menu {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

// long unbroken ids/tokens must wrap rather than widen the panel
.s-cdm-body {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.s-cdm-render,
.s-cdm-carousel {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

// A rendering is display-only here, whether it arrived alone or as one of
// several. Only the carousel used to say so, so the same credential was
// interactive when it declared one render method and inert when it declared
// two -- an issuer's frame ran scripts and took clicks inside a maximized
// dialog on the count of its own renderings. The spec does allow interactive
// renderings, so this is a product stance rather than a security control: the
// frame's sandbox and CSP come from the library and host CSS cannot touch
// them. If one ever needs interaction, make it deliberate for both paths, and
// for the carousel drop this on the non-active slides only, since an
// interactive frame also swallows the paging swipe.
.s-cdm-render,
.s-cdm-carousel {
  :deep(iframe) {
    pointer-events: none;
  }
}

.s-cdm-carousel {
  // no arrows: navigation is swipe + dots, so the render uses the full width
  // and only the bottom padding is kept, to give the dots a home below the card
  padding: 0 0 32px;

  // dots sit below the card; neutral greys read on any card colour
  :deep(.q-carousel__navigation) {
    bottom: 0;
  }
  :deep(.q-carousel__navigation-icon) {
    color: rgba(0, 0, 0, 0.3);
  }
  :deep(.q-carousel__navigation-icon--active) {
    color: #333;
  }
}

.s-cdm-img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
}
</style>
