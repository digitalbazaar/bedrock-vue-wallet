<template>
  <q-page
    class="s-page"
    :class="$q.screen.lt.sm ? 's-page-mobile' : 'q-my-md'"
    style="max-width: 600px; border: 1px solid rgba(157, 157, 157, 0.75)">
    <div
      class="q-px-lg"
      style="overflow: auto"
      :style="$q.screen.lt.sm ? 'max-height: calc(100% - 67px)' :
        'max-height: calc(100vh - 102px)'">
      <div class="column">
        <h6 class="text-center q-my-sm">
          Sorry, we are unable to process your request.
        </h6>
      </div>
      <q-separator class="s-separator" />
      <div class="column q-my-md">
        <div class="text-center">
          <div class="q-mb-md">
            <q-icon
              size="xl"
              color="orange"
              name="fas fa-exclamation-triangle" />
          </div>
          <div class="text-subtitle1 q-my-md">
            {{error.message}}
          </div>
        </div>
        <q-expansion-item
          v-if="error.details"
          v-model="expanded">
          <template #header>
            <q-item-section>
              Details
            </q-item-section>
          </template>
          <q-card>
            <q-card-section>
              <code>
                {{error.details}}
              </code>
            </q-card-section>
          </q-card>
        </q-expansion-item>
        <q-separator />
      </div>
    </div>
    <div
      class="self-end row justify-between q-py-md q-px-lg"
      :style="$q.screen.lt.sm ? 'position: fixed' : 'position: sticky'"
      style="max-width: 600px">
      <q-btn
        class="q-mr-sm full-width bg-white"
        no-caps
        outline
        color="orange"
        label="Cancel"
        :disable="loading"
        @click="cancel()" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'Problem',
  props: {
    account: {
      type: String,
      required: true,
      default: ''
    },
    error: {
      type: Error,
      required: true,
      default: undefined
    },
    loading: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  data() {
    return {
      expanded: false
    };
  },
  methods: {
    async cancel() {
      await this.$emitExtendable('cancel');
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

.self-end {
  width: 100%;
  bottom: 0;
  left: 0;
  background-color: #f9f9f9;
  padding: 16px 48px;
  border-top: 1px solid rgba(157, 157, 157, 0.75);
}

.s-page {
  min-height: auto !important;
  background: #fff !important;

  @include mobile {
    padding: 0;
    height: 100vh;
  }
}

.s-separator {
  background: rgba(157, 157, 157, 0.75);
}
</style>
