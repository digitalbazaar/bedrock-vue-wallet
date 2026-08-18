<template>
  <div class="credential-html-display">
    <q-spinner
      v-if="loading"
      size="48px"
      color="primary"
      style="margin-top: 90px" />
    <q-banner
      v-if="error"
      dense
      rounded
      class="bg-red-5 text-white q-ma-md">
      {{error}}
    </q-banner>
    <div
      ref="mount"
      class="html-render-mount" />
  </div>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {onMounted, onUnmounted, ref} from 'vue';
import {HtmlRenderer} from '@digitalbazaar/vc-html-render-method';

// a height change smaller than this is rounding, not layout
const HEIGHT_EPSILON = 2;

export default {
  name: 'CredentialHtmlDisplay',
  props: {
    credential: {
      type: Object,
      required: true
    },
    // the specific HTML render method to render; if omitted, the library
    // renders the first HTML render method found on the credential
    renderMethod: {
      type: Object,
      default: undefined
    },
    // the render method's `outputPreference.style`, which states the size the
    // issuer designed for. Used only to reserve space until the frame reports
    // its own height, so the card does not open at zero and jump.
    styleHint: {
      type: Object,
      default: undefined
    }
  },
  setup(props) {
    // Constants
    let handle = null;
    // the last height written to the mount, so a report that only differs by
    // rounding can be recognised and dropped
    let appliedHeight = 0;
    // the rendering's own size, as the issuer's template laid it out
    let reported = null;
    let observer = null;

    // Refs
    const mount = ref(null);
    const loading = ref(true);
    const error = ref('');

    /**
     * Fits the rendering into whatever width the mount currently has.
     *
     * An issuer lays out at the width it designed for and a phone is narrower
     * than most of them, so the rendering is scaled down to fit rather than
     * clipped. It is never scaled up: an issuer that designed narrow did so
     * deliberately.
     */
    function applyFit() {
      if(!reported || !mount.value) {
        return;
      }
      const {width, height} = reported;
      // looked up each time: the library appends the frame asynchronously, so
      // a reference taken at setup is null
      const frame = mount.value.querySelector('iframe');
      const available = mount.value.clientWidth;
      const scale = width > 0 && available > 0 ?
        Math.min(1, available / width) : 1;
      if(frame) {
        if(scale < 1) {
          // Taken out of the layout flow, not merely clipped. `transform`
          // shrinks a frame visually while leaving its layout box at full
          // width, and Quasar's scroll-area content is absolutely positioned,
          // so it shrink-wraps to that width and the details view gains a
          // horizontal scrollbar.
          frame.style.position = 'absolute';
          frame.style.top = '0';
          frame.style.left = '0';
          frame.style.width = `${width}px`;
          frame.style.transformOrigin = 'top left';
          frame.style.transform = `scale(${scale})`;
        } else {
          // Cleared, not just skipped. A frame scaled while the window was
          // narrow otherwise keeps all of this when the window widens, so it
          // stays out of flow at a stale size and clips -- broken at a width
          // where it fits easily.
          frame.style.position = '';
          frame.style.top = '';
          frame.style.left = '';
          frame.style.width = '';
          frame.style.transformOrigin = '';
          frame.style.transform = '';
        }
      }
      const scaled = Math.round(height * scale);
      // Writing the height re-lays-out the frame, which reports again, which
      // writes again. Against a real credential this settled into 324, 325,
      // 326, 325, 326: a sub-pixel rounding difference oscillating rather
      // than converging. Ignore a change too small to see.
      if(Math.abs(scaled - appliedHeight) > HEIGHT_EPSILON) {
        appliedHeight = scaled;
        mount.value.style.height = `${scaled}px`;
      }
    }

    // Lifecycle hooks
    onMounted(async () => {
      if(props.styleHint?.height && mount.value) {
        mount.value.style.height = props.styleHint.height;
      }
      try {
        // render the issuer template into a nested, sandboxed iframe; the
        // library owns the host-frame CSP (`frame-src 'none'`) and selective
        // disclosure, so nothing here weakens the wallet's own security
        handle = new HtmlRenderer().render({
          mount: mount.value,
          credential: props.credential,
          renderMethod: props.renderMethod
        });

        // relay the frame's auto-size up to the mount container so tall cards
        // are not clipped inside the carousel/scroll area
        // The library reports the rendering's own size, which changes only
        // when the template re-lays-out -- never when the window widens. So
        // the fit is recomputed from two independent triggers: a new report,
        // and the mount changing size underneath it.
        handle.on('resize', payload => {
          const detail = payload?.detail ?? payload;
          if(!(detail?.height > 0)) {
            return;
          }
          reported = {width: detail.width, height: detail.height};
          applyFit();
        });

        observer = new ResizeObserver(() => applyFit());
        observer.observe(mount.value);

        // resolves on `renderMethodReady()`; rejects on error/timeout
        await handle.ready;
      } catch(e) {
        error.value = e?.message ?? 'Unable to render this credential.';
      } finally {
        loading.value = false;
      }
    });

    onUnmounted(() => {
      observer?.disconnect();
      observer = null;
      handle?.destroy();
      handle = null;
    });

    return {mount, loading, error};
  }
};
</script>

<style lang="scss" scoped>
.credential-html-display {
  width: 100%;
  text-align: center;
}
.html-render-mount {
  width: 100%;
  // the scaled frame is positioned against this
  position: relative;
  // `transform: scale()` shrinks a frame visually but leaves its layout box
  // at full size, so a rendering scaled down to fit still pushes the page
  // sideways without this. The mount's own height is set to the scaled
  // height, so clipping here removes the overflow rather than hiding
  // content.
  overflow: hidden;
}
// the library appends the host iframe into the mount element
.html-render-mount :deep(iframe) {
  display: block;
  width: 100%;
  border: 0;
}
</style>
