<template>
  <div
    class="credential-list-row row items-center q-px-md q-py-sm"
    @click="$emit('select', credentialRecord)">
    <q-avatar
      v-if="rowImage"
      square
      size="40px"
      class="q-mr-md">
      <img :src="rowImage" />
    </q-avatar>
    <q-icon
      v-else
      name="fas fa-id-card"
      size="40px"
      class="q-mr-md text-grey-6" />
    <div class="col">
      <div class="text-subtitle2 text-weight-medium">
        {{ rowTitle }}
      </div>
      <div
        v-for="h in rowHighlights"
        :key="h.field"
        class="text-caption text-grey-7">
        {{ h.field }}: {{ h.value }}
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {computed} from 'vue';
import {config} from '@bedrock/web';
import {getCredentialConfig, getHighlights} from '../lib/useCredentialCardConfig.js';
import {getValueFromPointer} from '../lib/helpers.js';

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
      if(imagePointer) {
        return getValueFromPointer(credential, imagePointer);
      }
      return credential.image || '';
    });

    const rowTitle = computed(() => {
      const {credential} = props.credentialRecord;
      const titleConfig = vcConfig.value?.overrides?.title;
      if(titleConfig?.pointer) {
        return getValueFromPointer(credential, titleConfig.pointer) || '';
      }
      return credential.name || '';
    });

    const rowHighlights = computed(() => {
      const {credential} = props.credentialRecord;
      return getHighlights({
        credential,
        highlights: vcConfig.value?.highlights
      });
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
