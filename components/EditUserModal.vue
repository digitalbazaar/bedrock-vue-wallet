<template>
  <br-q-modal
    v-model="show"
    :persistent="persistent"
    title="Edit Access"
    accept-label="Save"
    :disable-accept-button="disableAcceptButton"
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
import {email, required} from '@vuelidate/validators';
import {BrQModal} from '@bedrock/quasar-components';
import {computed} from 'vue';
import UserForm from './UserForm.vue';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'EditUserModal',
  components: {BrQModal, UserForm},
  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    persistent: {
      type: Boolean,
      default: false,
      required: false
    },
    user: {
      type: Object,
      required: true
    },
  },
  emits: ['update', 'update:modelValue'],
  setup(props, {emit}) {
    const show = computed({
      get: () => props.modelValue,
      set: value => emit('update:modelValue', value)
    });
    return {
      show,
      vuelidate: useVuelidate()
    };
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
