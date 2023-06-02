<template>
  <form
    @submit.prevent>
    <q-input
      v-model="form.name"
      outlined
      stack-label
      type="text"
      label="Name"
      :error="vuelidate.value.name.$error"
      error-message="A name is required."
      hint="Enter the name of the person you are giving access to."
      class="q-mb-md"
      @update:model-value="vuelidate.value.name.$touch"
      @blur="vuelidate.value.name.$touch" />
    <q-input
      v-model="form.email"
      outlined
      stack-label
      type="text"
      label="Email"
      :error="vuelidate.value.email.$error"
      error-message="You must enter a valid email."
      hint="Enter the email of the person you are giving access to."
      class="q-mb-md"
      @update:model-value="vuelidate.value.name.$touch"
      @blur="vuelidate.value.email.$touch" />
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
              @update:model-value="vuelidate.value.access.$touch" />
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
import {email, required} from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import {watch} from 'vue';

export default {
  name: 'UserForm',
  props: {
    value: {
      type: Object,
      required: true
    }
  },
  emits: ['dirty', 'invalid'],
  setup(props, {emit}) {
    const vuelidate = useVuelidate();

    watch(
      () => vuelidate.value?.value?.$anyDirty,
      anyDirty => emit('dirty', anyDirty),
      {immediate: true});
    watch(
      () => vuelidate.value?.value?.$invalid,
      invalid => emit('invalid', invalid),
      {immediate: true});

    return {
      vuelidate
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
