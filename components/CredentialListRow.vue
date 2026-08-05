<template>
  <div
    class="credential-list-row row items-center q-px-md q-py-sm"
    @click="$emit('select', credentialRecord)">
    <q-avatar
      v-if="rowImage"
      square
      size="40px"
      class="q-mr-md">
      <img :src="rowImage">
    </q-avatar>
    <q-icon
      v-else
      name="fas fa-id-card"
      size="40px"
      class="q-mr-md text-grey-6" />
    <div class="col">
      <div class="text-subtitle2 text-weight-medium">
        {{rowTitle}}
      </div>
      <div
        v-for="h in rowHighlights"
        :key="h.field"
        class="text-caption text-grey-7">
        {{h.field}}: {{h.value}}
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {
  getCredentialConfig, getHighlights
} from '../lib/useCredentialCardConfig.js';
import {computed} from 'vue';
import {config} from '@bedrock/web';
import {getValueFromPointer} from '../lib/helpers.js';

// a readable field value on a compact row; anything longer is almost certainly
// encoded data (base64 image bytes, a long barcode payload) rather than text
const MAX_HIGHLIGHT_LENGTH = 60;

export default {
  name: 'CredentialListRow',
  props: {
    credentialRecord: {
      type: Object,
      required: true
    }
  },
  emits: ['select'],
  setup(props) {
    const vcConfig = computed(() => {
      const {credential} = props.credentialRecord;
      const cardDesigns = config?.vueWallet?.cardDesigns || [];
      return getCredentialConfig({credential, cardDesigns});
    });

    const rowImage = computed(() => {
      const {credential} = props.credentialRecord;
      const imagePointer = vcConfig.value?.overrides?.imagePointer;
      const value = imagePointer ?
        getValueFromPointer(credential, imagePointer) :
        credential.image;
      // `image` is sometimes an object (`{id, type}`) rather than a string;
      // binding that to `src` renders "[object Object]", so fall through to
      // its `id` and otherwise show no image at all
      if(typeof value === 'string') {
        return value;
      }
      return typeof value?.id === 'string' ? value.id : '';
    });

    const rowTitle = computed(() => {
      const {credential} = props.credentialRecord;
      // Fall all the way through rather than rendering a title-less row: a
      // configured `title.pointer` often resolves to nothing (the field is
      // absent on this particular credential), and the row is unidentifiable
      // without any text at all
      const pointer = vcConfig.value?.overrides?.title?.pointer;
      const candidates = [
        pointer ? getValueFromPointer(credential, pointer) : '',
        credential.name,
        // the human-readable name of the matched card design, e.g.
        // 'Movie Ticket'
        vcConfig.value?.title,
        // last resort: the credential's own specific type, if it has one
        // beyond the base `VerifiableCredential`
        credential.type?.[1]
      ];
      const title = candidates.find(
        c => typeof c === 'string' && c.trim().length > 0);
      return title?.trim() ?? 'Verifiable Credential';
    });

    const rowHighlights = computed(() => {
      const {credential} = props.credentialRecord;
      // Several `cardDesigns` entries carry a highlight whose pointer resolves
      // to image data rather than a readable field (e.g. `/issuer/image`).
      // Those are meant for the card's image slot, so drop any value that
      // isn't short readable text before taking the first two.
      const all = getHighlights({
        credential,
        highlights: vcConfig.value?.highlights
      });
      return all.filter(({value}) => typeof value === 'string' &&
        value.length > 0 && value.length <= MAX_HIGHLIGHT_LENGTH &&
        !value.startsWith('data:')).slice(0, 2);
    });

    return {rowImage, rowTitle, rowHighlights};
  }
};
</script>

<style lang="scss" scoped>
.credential-list-row {
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  &:active {
    background-color: rgba(0, 0, 0, 0.04);
  }
}
</style>
