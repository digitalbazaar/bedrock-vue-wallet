<template>
  <br-q-modal
    :value="value"
    :persistent="persistent"
    title="Edit Access"
    accept-label="Save"
    :disable-accept-button="disableAcceptButton"
    @input="$emit('input', $event)"
    @accept="$event.waitUntil($emitExtendable('update', {user: form}))">
    <user-form
      v-model="form"
      @invalid="handleInvalid($event)"
      @dirty="handleDirty($event)" />
  </br-q-modal>
</template>

<script>
/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQModal} from 'bedrock-quasar-components';
import {required, email} from 'vuelidate/lib/validators';
import UserForm from './UserForm.vue';

export default {
  name: 'EditUserModal',
  components: {BrQModal, UserForm},
  props: {
    persistent: {
      type: Boolean,
      default: false,
      required: false
    },
    user: {
      type: Object,
      required: true
    },
    value: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      form: {},
      disableAcceptButton: true
    };
  },
  created() {
    // copy editable properties from user
    this.form = {...this.user};
  },
  methods: {
    handleInvalid(invalid) {
      this.disableAcceptButton = invalid;
    },
    handleDirty(dirty) {
      this.disableAcceptButton = !dirty;
    },
  },
  validations: {
    form: {
      name: {
        required,
      },
      email: {
        required,
        email
      },
      access: {
        required
      }
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
