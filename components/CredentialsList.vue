<template>
  <div v-if="compact">
    <credential-compact-bundle
      :credentials="credentials"
      :schema-map="schemaMap"
      :store="store" />
  </div>
  <div v-else>
    <div
      class="s-credential-list q-py-sm overflow-auto">
      <div class="row justify-center">
        <div
          v-if="loading"
          class="q-py-md">
          <q-spinner
            color="primary"
            size="3em" />
        </div>
        <div
          v-else-if="errorText"
          class="q-pa-md text-center">
          {{errorText}}
        </div>
        <div
          v-else-if="showNoCredentials"
          class="q-pa-md text-center">
          You do not have any credentials yet.
        </div>
        <div
          v-else-if="noResults"
          class="q-pa-md text-center">
          Sorry, we can't seem to find any credentials
          that match your search of "{{search}}".
        </div>
        <div
          v-else
          class="row justify-center">
          <div
            v-for="credentialRecord in credentialsList"
            :key="credentialRecord.credential.id"
            class="row">
            <credential-card-bundle
              :credential-record="credentialRecord"
              :schema-map="schemaMap"
              :profile="profile"
              :profile-options="profileOptions" />
          </div>
        </div>
      </div>
      <q-btn
        v-if="showViewMore"
        flat
        color="primary"
        label="View More"
        class="q-my-sm"
        @click="toHomePage()" />
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import CredentialCardBundle from './CredentialCardBundle.vue';
import CredentialCompactBundle from './CredentialCompactBundle.vue';

export default {
  name: 'CredentialsList',
  components: {
    CredentialCardBundle,
    CredentialCompactBundle
  },
  props: {
    credentials: {
      default: () => [],
      type: Array,
      required: true
    },
    profileOptions: {
      default: () => [],
      type: Array,
      required: false
    },
    profile: {
      default: () => [],
      type: Array,
      required: false
    },
    compact: {
      type: Boolean,
      required: false
    },
    search: {
      type: String,
      required: false,
      default: ''
    },
    noResults: {
      type: Boolean,
      required: false
    },
    limit: {
      type: Number,
      required: false,
      default: 0
    },
    loading: {
      type: Boolean,
      required: false
    },
    store: {
      type: Boolean,
      required: false,
      default: false
    },
    errorText: {
      default: '',
      type: String,
      required: false
    }
  },
  data() {
    return {
      schemaMap: {}
    };
  },
  computed: {
    credentialsList() {
      if(this.limit > 0) {
        return this.credentials.slice(0, this.limit);
      }
      return this.credentials;
    },
    showViewMore() {
      return this.credentials && this.credentials.length > this.limit &&
        this.limit > 0;
    },
    showNoCredentials() {
      return !(this.credentials && this.credentials.length > 0) &&
        !this.loading;
    }
  },
  methods: {
    // FIXME: this should be emitting an event; it should not require
    // knowledge of how the routes are setup -- the top-level page this
    // component appears should handle this event
    toHomePage() {
      this.$router.push({path: '/'});
    }
  }
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

.s-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.s-section-title {
  width: 100%;
  flex-shrink: 0;
  display: inline-flex;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);

  h6 {
    font-size: 16px;
  }
}

.s-selected-icon {
 @include mobile {
   display: none;
 }
}

.s-profile-select {
  height: 30px;

  @include mobile {
    height: 26px;
  }
}

.s-credentials-list {
  flex-grow: 1;
  overflow-y: auto;
}

.s-sort-icon {
  margin-top: -10px;
}

.s-page-section {
  width: 100%;

  @include tablet-large {
    max-width: 100%;
  }

  @include mobile {
    border-radius: 0 !important;
    box-shadow: none;
  }
}

.s-list-svg {
  width: 50px;
  height: 50px;
}

.s-card-svg {
  width: 75px;
  height: 75px;
}

.s-detail-svg {
  width: 150px;
}
</style>
