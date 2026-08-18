<template>
  <div
    class="credential-list-row row items-center q-px-md q-py-sm"
    role="button"
    tabindex="0"
    :aria-label="`Open ${summary.title}`"
    @click="$emit('select', credentialRecord)"
    @keydown.enter.space.prevent="$emit('select', credentialRecord)">
    <q-avatar
      v-if="summary.image"
      square
      size="40px"
      class="q-mr-md">
      <img :src="summary.image">
    </q-avatar>
    <q-icon
      v-else
      name="fas fa-id-card"
      size="40px"
      class="q-mr-md text-grey-6" />
    <div class="col">
      <div class="text-subtitle2 text-weight-medium">
        {{summary.title}}
      </div>
      <div
        v-if="summary.subtitle"
        class="text-caption text-grey-7">
        {{summary.subtitle}}
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
import {getCredential} from '../lib/helpers.js';
import {getCredentialSummary} from '../lib/credentialSummary.js';

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
    // `credentialRecord` may be a record shaped `{credential, meta}`, one
    // shaped `{content, meta}`, or a bare verifiable credential -- the wide
    // list accepts all three, so this has to as well
    const credential = computed(() => getCredential(props.credentialRecord));

    // the same summary the details view reads, so a row and the panel it
    // opens cannot disagree about what the credential is called
    const summary = computed(() => getCredentialSummary({
      credential: credential.value,
      cardDesigns: config?.vueWallet?.cardDesigns
    }));

    return {summary};
  }
};
</script>

<style lang="scss" scoped>
.credential-list-row {
  cursor: pointer;
  position: relative;

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: -2px;
  }

  // an inset rule rather than `border-bottom`: a full-bleed border runs wider
  // than the row's content and reads as a line escaping the list. The insets
  // match the row's own `q-px-md` padding.
  &::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 0;
    height: 1px;
    background-color: rgba(0, 0, 0, 0.08);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.04);
  }
}
</style>
