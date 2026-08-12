<template>
  <div
    class="credential-list-row row items-center q-px-md q-py-sm"
    role="button"
    tabindex="0"
    :aria-label="`Open ${rowTitle}`"
    @click="$emit('select', credentialRecord)"
    @keydown.enter.prevent="$emit('select', credentialRecord)"
    @keydown.space.prevent="$emit('select', credentialRecord)">
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
        v-if="rowSubtitle"
        class="text-caption text-grey-7">
        {{rowSubtitle}}
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {formatString, getValueFromPointer} from '../lib/helpers.js';
import {
  getCredentialConfig, getCredentialTypeLabel
} from '../lib/useCredentialCardConfig.js';
import {computed} from 'vue';
import {config} from '@bedrock/web';

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
    const credential = computed(() => props.credentialRecord.credential);

    const vcConfig = computed(() => {
      const cardDesigns = config?.vueWallet?.cardDesigns || [];
      return getCredentialConfig({
        credential: credential.value, cardDesigns
      });
    });

    const rowImage = computed(() => {
      const imagePointer = vcConfig.value?.overrides?.imagePointer;
      const {image, issuer} = credential.value;
      // `issuer.image`/`issuer.logo` are the same chain the card view resolves
      // through `useCredentialCommon`, so a row shows the logo its card shows
      const candidates = [
        // a literal logo hardcoded on the matched card design (a URL or a
        // data: URI); wins over credential-derived images so an issuer with
        // no `image`/`logo` field can still show a logo via config alone
        vcConfig.value?.logo,
        imagePointer ?
          getValueFromPointer(credential.value, imagePointer) : '',
        image, issuer?.image, issuer?.logo
      ];
      for(const value of candidates) {
        // an image is sometimes an object (`{id, type}`) rather than a string;
        // binding that to `src` renders "[object Object]", so use its `id`
        const src = typeof value === 'string' ? value : value?.id;
        if(typeof src === 'string' && src.length > 0) {
          return src;
        }
      }
      return '';
    });

    const rowTitle = computed(() => {
      // Fall all the way through rather than rendering a title-less row: a
      // configured `title.pointer` often resolves to nothing (the field is
      // absent on this particular credential), and the row is unidentifiable
      // without any text at all
      const pointer = vcConfig.value?.overrides?.title?.pointer;
      const candidates = [
        pointer ? getValueFromPointer(credential.value, pointer) : '',
        credential.value.name,
        // the human-readable name of the matched card design, e.g.
        // 'Movie Ticket'
        vcConfig.value?.title,
        // separates the most granular type into words, the same way
        // `@bedrock/vue-vc` names an untitled credential -- but guarded, since
        // upstream throws on a credential with an empty `type` array
        getCredentialTypeLabel({
          credential: credential.value,
          cardDesigns: config?.vueWallet?.cardDesigns
        })
      ];
      const title = candidates.find(
        c => typeof c === 'string' && c.trim().length > 0);
      return title?.trim() ?? 'Verifiable Credential';
    });

    // an optional second line, driven by config, so a design can add something
    // that tells otherwise-identical rows apart (e.g. the date on a receipt)
    const rowSubtitle = computed(() => {
      const subtitle = vcConfig.value?.overrides?.rowSubtitle;
      if(!subtitle?.pointer) {
        return '';
      }
      const raw = getValueFromPointer(credential.value, subtitle.pointer);
      if(typeof raw !== 'string' || raw.length === 0) {
        return '';
      }
      return formatString(raw, subtitle.format);
    });

    return {rowImage, rowSubtitle, rowTitle};
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
