<template>
  <div>
    <div class="row justify-center">
      <q-list
        separator
        class="full-width">
        <q-item
          v-for="ocap in annotatedCapabilities"
          :key="ocap.id"
          class="">
          <q-item-section>
            <q-item-label>
              <div class="text-subtitle1">
                {{ocap.heading}}
              </div>
            </q-item-label>
            <q-item-label
              v-if="ocap.subheading"
              caption>
              {{ocap.subheading}}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
// FIXME: determine if this is specific to another capability component
// e.g., `CapabilityDescription.vue` -- and it should be created and moved
// there rather than be a lib function
import {capabilities} from 'bedrock-web-wallet';
const {generateDescription}  = capabilities;

export default {
  name: 'CapabilitiesList',
  props: {
    capabilities: {
      default: () => [],
      type: Array,
      required: true
    }
  },
  computed: {
    annotatedCapabilities() {
      // TODO: determine how to best handle displaying duplicate descriptions;
      // e.g., a relying party may ask for access to multiple EDVs -- each of
      // these displaying "Store application data" descriptions to the user;
      // the user will likely find this confusing, so how to resolve?
      if(!this.capabilities) {
        return [];
      }
      return this.capabilities.map(generateDescription);
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
  padding: 7px;
  width: 100%;
  flex-shrink: 0;
  display: inline-flex;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);

  h6 {
    font-size: 16px;
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
  max-width: 1100px;
  width: 100%;

  @include tablet-large {
    max-width: 100%;
    min-width: 100%;
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
