<template>
  <div>
    <div>
      <div
        v-for="credential in filteredCredentials"
        :key="credential.id"
        class="q-my-none row s-card-list">
        <credential-card-list
          :credential="credential"
          :schema="schemaMap[credential.type[1]] || {}" />
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {CredentialCardList} from 'bedrock-vue-credential-card';
import {credentialHelpers} from 'bedrock-web-wallet';

const {
  createCompactBundledCredentials,
} = credentialHelpers;

export default {
  name: 'CredentialsList',
  components: {
    CredentialCardList,
  },
  props: {
    credentials: {
      default: () => [],
      type: Array,
      required: false
    },
    schemaMap: {
      type: Object,
      required: true
    },
    store: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {};
  },
  asyncComputed: {
    filteredCredentials() {
      const credentials = this.credentials;
      if(this.store) {
        return createCompactBundledCredentials({
          credentials
        });
      }
      return credentials;
    }
  },
  methods: {}
};
</script>

<style lang="scss" scoped>
$breakpoint-lg: 1216px;
$breakpoint-md: 991px;
$breakpoint-sm: 767px;
$breakpoint-xs: 320px;

@mixin tablet-large {
  @media (min-width: #{$breakpoint-md}) and (max-width: #{$breakpoint-lg}) {
    @content;
  }
}

@mixin tablet {
  @media (min-width: #{$breakpoint-sm}) and (max-width: #{$breakpoint-md}) {
    @content;
  }
}

@mixin mobile {
  @media (min-width: #{$breakpoint-xs}) and (max-width: #{$breakpoint-sm}) {
    @content;
  }
}

.s-card-list {
  width: 100%;
}
</style>
