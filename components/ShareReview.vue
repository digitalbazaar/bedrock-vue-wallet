<template>
  <div v-if="!loading">
    <div v-if="capabilities.length > 0">
      <div class="q-mt-md">
        Capabilities
      </div>
      <q-separator class="s-separator" />
      <div>
        <slot
          name="capabilities-display"
          :capabilities="capabilities">
          <capabilities-list
            :capabilities="capabilities" />
        </slot>
      </div>
    </div>
    <div v-if="credentials.length > 0">
      <div class="q-mt-sm">
        Credentials
      </div>
      <q-separator class="s-separator" />
      <div>
        <slot
          name="credentials-display"
          :credentials="credentials">
          <credentials-list
            :compact="true"
            :credentials="credentials" />
        </slot>
      </div>
    </div>
    <div v-else>
      <q-card
        v-if="!authentication"
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
 * Copyright (c) 2015-2023 Digital Bazaar, Inc. All rights reserved.
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
    authentication: {
      type: Boolean,
      required: true,
      default: () => false
    },
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
