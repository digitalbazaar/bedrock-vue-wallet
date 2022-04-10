<template>
  <br-q-modal
    :value="value"
    title="Add Access"
    accept-label="Create"
    :disable-accept-button="disableAcceptButton"
    @input="$emit('input', $event)"
    @accept="$event.waitUntil($emitExtendable('create', {form}))">
    <user-form
      v-model="form"
      @invalid="handleInvalid($event)" />
  </br-q-modal>
</template>

<script>
/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQModal} from '@bedrock/quasar-components';
import UserForm from './UserForm.vue';

export default {
  name: 'AddUserModal',
  components: {BrQModal, UserForm},
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      form: {
        name: '',
        email: '',
        access: '',
        authorizedDate: '',
        onboardLink: ''
      },
      disableAcceptButton: true
    };
  },
  methods: {
    handleInvalid(invalid) {
      this.disableAcceptButton = invalid;
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
