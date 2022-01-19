<template>
  <br-q-modal
    ref="modal"
    :value="value"
    :title="title"
    accept-label="Remove"
    accept-color="negative"
    cancel-color="primary"
    min-width="350px"
    @input="$emit('input', $event)"
    @accept="$event.waitUntil($emitExtendable('remove', {item}))">
    <form @submit.prevent>
      <div class="q-mb-md">
        <div
          v-if="message"
          :class="messageAlign">
          {{message}}
        </div>
        <div v-else>
          <div class="text-center">
            Are you sure you want to remove this {{name}}?
          </div>
          <div class="text-center">
            You will not be able to recover it.
          </div>
        </div>
      </div>
    </form>
  </br-q-modal>
</template>

<script>
/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQModal} from 'bedrock-quasar-components';
import {format} from 'quasar';

export default {
  name: 'RemoveItemModal',
  components: {BrQModal},
  props: {
    value: {
      type: Boolean,
      required: true
    },
    message: {
      type: String,
      required: false,
      default: ''
    },
    messageAlign: {
      type: String,
      required: false,
      default: 'text-center'
    },
    name: {
      type: String,
      required: true
    },
    item: {
      validator(value) {
        return !!value;
      },
      required: true
    }
  },
  computed: {
    title() {
      return `Remove ${format.capitalize(this.name)}`;
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
