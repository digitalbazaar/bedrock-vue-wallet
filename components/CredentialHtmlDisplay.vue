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
          if(height && mount.value) {
            mount.value.style.height = `${height}px`;
          }
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
