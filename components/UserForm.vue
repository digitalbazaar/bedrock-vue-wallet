<template>
  <form
    @submit.prevent>
    <q-input
      v-model="form.name"
      outlined
      stack-label
      type="text"
      label="Name"
      :error="$v.value.name.$error"
      error-message="A name is required."
      hint="Enter the name of the person you are giving access to."
      class="q-mb-md"
      @input="$v.value.name.$touch"
      @blur="$v.value.name.$touch" />
    <q-input
      v-model="form.email"
      outlined
      stack-label
      type="text"
      label="Email"
      :error="$v.value.email.$error"
      error-message="You must enter a valid email."
      hint="Enter the email of the person you are giving access to."
      class="q-mb-md"
      @input="$v.value.name.$touch"
      @blur="$v.value.email.$touch" />
    <q-field
      label="Access"
      class="q-mb-md"
      stack-label
      outlined>
      <template #control>
        <div
          v-for="accessOption in accessOptions"
          :key="accessOption.value"
          class="row items-center q-mt-md full-width no-wrap">
          <div style="width: 40px">
            <q-radio
              v-model="form.access"
              :val="accessOption.value"
              color="primary"
              :size="$q.screen.gt.sm ? 'md' : 'sm'"
              @input="$v.value.access.$touch" />
          </div>
          <div class="col-grow q-pr-lg">
            <q-item-label>{{accessOption.label}}</q-item-label>
            <q-item-label caption>
              {{accessOption.caption}}
            </q-item-label>
          </div>
        </div>
      </template>
    </q-field>
    <q-field
      v-if="form.onboardLink && form.onboardLink.length > 0"
      label="Onboard Link"
      class="q-mb-md"
      stack-label
      outlined>
      <template #control>
        <input
          type="text"
          class="full-width readonly"
          :value="form.onboardLink"
          readonly>
      </template>
    </q-field>
  </form>
</template>

<script>
/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {required, email} from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'UserForm',
  props: {
    value: {
      type: Object,
      required: true
    }
  },
  setup() {
    return {
      $v: useVuelidate()
    };
  },
  data() {
    return {
      form: this.value,
      accessOptions: [
        {
          // TODO: Access value should ne normalized to upper/lowercase
          value: 'Full',
          label: 'Full',
          caption: 'Read/Write to everything related to this profile.'
        },
        {
          // TODO: Access value should ne normalized to upper/lowercase
          value: 'Limited',
          label: 'Limited',
          caption: 'Access capabilities must be explicitly given on an ' +
          'individual basis.'
        }
      ]
    };
  },
  watch: {
    '$v.value.$invalid': {
      handler() {
        this.$emit('invalid', this.$v.value.$invalid);
      },
      immediate: true
    },
    '$v.value.$anyDirty': {
      handler() {
        this.$emit('dirty', this.$v.value.$anyDirty);
      },
      immediate: true
    },
  },
  validations: {
    value: {
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

<style scoped>
.readonly, .readyonly:focus {
  border: none;
  outline: none;
}
</style>
