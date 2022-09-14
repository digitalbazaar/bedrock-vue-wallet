<template>
  <div v-if="!loading">
    <div v-if="capabilities.length > 0">
      <div class="q-mt-md">
        Capabilities
      </div>
      <q-separator class="s-separator" />
      <div>
        <capabilities-list
          :capabilities="capabilities" />
      </div>
    </div>
    <div v-if="credentials.length > 0">
      <div class="q-mt-sm">
        Credentials
      </div>
      <q-separator class="s-separator" />
      <div>
        <credentials-list
          :compact="true"
          :credentials="credentials" />
      </div>
    </div>
    <div v-else>
      <q-card
        v-if="type !== 'DIDAuthenticate'"
        class="my-card"
        flat>
        <q-card-section horizontal>
          <q-card-section class="q-pt-xs">
            <div class="text-h5 q-mt-sm q-mb-xs">
              Sorry, we can't seem to find any credentials.
            </div>
            <div class="text-caption text-grey">
              We were unable to find the credentials that
              <strong>{{requestOrigin}}</strong> is requesting. Please try
              again when the credentials are in your wallet.
            </div>
          </q-card-section>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import CapabilitiesList from './CapabilitiesList.vue';
import CredentialsList from './CredentialsList.vue';

export default {
  name: 'ShareReview',
  components: {
    CapabilitiesList,
    CredentialsList
  },
  props: {
    capabilities: {
      type: Array,
      required: true,
      default: () => []
    },
    credentials: {
      type: Array,
      required: true,
      default: () => []
    },
    loading: {
      type: Boolean,
      required: true,
      default: true
    },
    requestOrigin: {
      type: String,
      required: true,
      default: ''
    },
    type: {
      type: String,
      required: true,
      default: ''
    }
  }
};
</script>

<style lang="scss" scoped>
$breakpoint-sm: 502px;
$breakpoint-xs: 320px;

@mixin mobile {
  @media (min-width: #{$breakpoint-xs}) and (max-width: #{$breakpoint-sm}) {
    @content;
  }
}

.s-separator {
  background: rgba(157, 157, 157, 0.75);
}
</style>
