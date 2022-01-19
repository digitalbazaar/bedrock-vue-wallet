<template>
  <br-q-modal
    title="Add Profile"
    accept-label="Create"
    :value="value"
    :persistent="persistent"
    :disable-accept-button="disableAcceptButton"
    @accept="$event.waitUntil($emitExtendable('create', {form}))"
    @input="$emit('input', $event)">
    <profile-form
      v-model="form"
      :profile-options="profileOptions"
      @invalid="disableAcceptButton = $event" />
  </br-q-modal>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQModal} from 'bedrock-quasar-components';
import ProfileForm from './ProfileForm.vue';
import {randomColor} from 'randomcolor';

export default {
  name: 'AddProfileModal',
  components: {BrQModal, ProfileForm},
  props: {
    value: {
      type: Boolean,
      required: true
    },
    persistent: {
      type: Boolean,
      default: false,
      required: false
    },
    profileOptions: {
      type: Array,
      default: () => [],
      required: true
    }
  },
  data() {
    return {
      form: {
        managingProfile: null,
        profile: {
          color: randomColor(),
          name: '',
          shared: false,
          didMethod: ''
        }
      },
      disableAcceptButton: true
    };
  }
};
</script>
<style>
</style>
