<template>
  <q-item
    v-ripple
    clickable
    @click="$emit('view-details')">
    <q-item-section avatar>
      <q-avatar
        :color="paymentMethod.iconColor || 'grey-4'"
        text-color="white"
        size="40px">
        <q-icon
          :name="paymentMethod.icon || 'fa fa-credit-card'"
          size="20px" />
      </q-avatar>
    </q-item-section>

    <q-item-section>
      <q-item-label class="text-weight-medium">
        {{paymentMethod.typeLabel}}
      </q-item-label>
      <q-item-label
        caption
        class="display-value">
        {{paymentMethod.displayValue}}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <q-btn
        flat
        round
        dense
        icon="fa fa-ellipsis-h"
        @click.stop="showMenu = true">
        <q-menu
          v-model="showMenu"
          anchor="bottom right"
          self="top right">
          <q-list style="min-width: 150px">
            <q-item
              v-close-popup
              clickable
              @click="$emit('view-details')">
              <q-item-section avatar>
                <q-icon
                  name="fa fa-eye"
                  size="xs" />
              </q-item-section>
              <q-item-section>View details</q-item-section>
            </q-item>
            <q-item
              v-close-popup
              clickable
              @click="$emit('remove')">
              <q-item-section avatar>
                <q-icon
                  name="fa fa-trash"
                  size="xs"
                  color="negative" />
              </q-item-section>
              <q-item-section class="text-negative">
                Remove
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-item-section>
  </q-item>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {ref} from 'vue';

export default {
  name: 'PaymentMethodCard',
  props: {
    paymentMethod: {
      type: Object,
      required: true
    }
  },
  emits: ['view-details', 'remove'],
  setup() {
    const showMenu = ref(false);

    return {
      showMenu
    };
  }
};
</script>

<style lang="scss" scoped>
.display-value {
  font-family: monospace;
  font-size: 12px;
}
</style>
