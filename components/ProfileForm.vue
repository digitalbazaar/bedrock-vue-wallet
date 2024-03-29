<template>
  <form @submit.prevent>
    <q-input
      v-model="form.profile.name"
      outlined
      stack-label
      type="text"
      label="Profile Name"
      :error="vuelidate.modelValue.profile.name.$error"
      error-message="Your profile name must be at least 1 character."
      hint="Example: School, Family, Company Inc., etc."
      class="q-mb-md"
      @blur="vuelidate.modelValue.profile.name.$touch" />
    <q-field
      label="Profile Color"
      stack-label
      outlined>
      <template #control>
        <div
          class="self-center full-width no-outline"
          tabindex="0">
          <div class="justify-end q-mt-sm">
            <q-btn
              outline
              color="grey-10"
              icon="fas fa-eye-dropper"
              size="10px"
              style="height: 34px">
              <q-menu
                anchor="center middle"
                self="center middle">
                <q-color v-model="form.profile.color" />
              </q-menu>
            </q-btn>
            <q-chip
              v-if="form.profile.name"
              square
              :style="{'background-color': form.profile.color}"
              text-color="white"
              class="q-my-none q-ml-sm"
              style="height: 34px">
              {{form.profile.name}}
            </q-chip>
          </div>
        </div>
      </template>
    </q-field>
    <q-separator class="q-my-md" />
    <div>
      <q-radio
        v-model="form.profile.didMethod"
        name="didMethod"
        val="v1"
        class="q-mr-md"
        label="Permanent Profile" />
      <q-radio
        v-model="form.profile.didMethod"
        name="didMethod"
        val="key"
        label="Temporary Profile" />
    </div>
    <q-separator class="q-mt-md" />
    <div class="row items-center q-py-md">
      <q-checkbox
        v-model="form.profile.shared"
        val="true" />
      <div class="q-ml-sm">
        <q-item-label>Shared</q-item-label>
        <q-item-label caption>
          Allow other profiles to manage.
        </q-item-label>
      </div>
    </div>
    <q-select
      v-if="form.profile.shared"
      v-model="form.managingProfile"
      outlined
      stack-label
      label="Initial Manager"
      :options="profileOptions"
      :error="vuelidate.modelValue.managingProfile.$error"
      emit-value
      map-options
      class="q-mb-md" />
    <q-separator class="q-mb-md" />
  </form>
</template>

<script>
/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, toRef} from 'vue';
import {minLength, required, requiredIf} from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'ProfileForm',
  props: {
    modelValue: {
      type: Object,
      required: true
    },
    profileOptions: {
      type: Array,
      default: () => [],
      required: true
    }
  },
  emits: ['invalid'],
  setup(props) {
    const modelValue = toRef(props, 'modelValue');
    const form = computed(() => modelValue.value);
    return {
      form,
      vuelidate: useVuelidate()
    };
  },
  watch: {
    'vuelidate.$invalid'(val) {
      this.$emit('invalid', val);
    }
  },
  created() {
    this.$emit('invalid', this.vuelidate.$invalid);
  },
  validations: {
    modelValue: {
      managingProfile: {
        required: requiredIf(function() {
          return this.modelValue.profile.shared;
        })
      },
      profile: {
        name: {
          required,
          minLength: minLength(1)
        },
        didMethod: {
          required
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
