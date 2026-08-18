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
    }
  },
  setup(props) {
    // Constants
    let handle = null;
    // the last height written to the mount, so a report that only differs by
    // rounding can be recognised and dropped
    let appliedHeight = 0;

    // Refs
    const mount = ref(null);
    const loading = ref(true);
    const error = ref('');

    // Lifecycle hooks
    onMounted(async () => {
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
        handle.on('resize', payload => {
          const height = payload?.height ?? payload?.detail?.height;
          if(!height || !mount.value) {
            return;
          }
          // Setting the mount height re-lays-out the frame, which reports a
          // new size, which sets the height again. Observed live against a
          // real credential: 324, 325, 326, 325, 326, 325... a sub-pixel
          // rounding difference oscillating instead of settling. Ignore a
          // change too small to see, which breaks the loop without capping
          // a genuine resize.
          if(Math.abs(height - appliedHeight) <= HEIGHT_EPSILON) {
            return;
          }
          appliedHeight = height;
          mount.value.style.height = `${height}px`;
        });

        // resolves on `renderMethodReady()`; rejects on error/timeout
        await handle.ready;
      } catch(e) {
        error.value = e?.message ?? 'Unable to render this credential.';
      } finally {
        loading.value = false;
      }
    });

    onUnmounted(() => {
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
}
// the library appends the host iframe into the mount element
.html-render-mount :deep(iframe) {
  display: block;
  width: 100%;
  border: 0;
}
</style>
