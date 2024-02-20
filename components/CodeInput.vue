<template>
  <q-input
    v-model="code"
    stack-label
    outlined
    color="dark"
    :minlength="minLength"
    :maxlength="maxLength"
    autocomplete="code"
    :hint="hint"
    :error="vuelidate.code.$error"
    :error-message="errorMessage"
    label="Verification Code"
    autofocus
    bottom-slots 
    :input-style="{ fontSize: '16px' }" />
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref, watch} from 'vue';
import {maxLength, minLength, required} from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'CodeInput',
  components: {},
  props: {
    hint: {
      type: String,
      required: false,
      default: ''
    },
    max: {
      type: String,
      required: false,
      default: ''
    },
    minLength: {
      type: Number,
      required: false,
      default: 0
    },
    maxLength: {
      type: Number,
      required: false,
      default: Infinity
    }
  },
  emits: ['code', 'invalid'],
  setup(props, {emit}) {
    const vuelidate = useVuelidate();

    watch(
      () => vuelidate.value?.code?.$invalid,
      invalid => emit('invalid', {invalid}),
      {immediate: true});

    // FIXME: use `v-model` instead
    const code = ref('');
    watch(
      () => code.value,
      code => emit('code', {code}));

    const errorMessage = computed(() => {
      const {value: {code}} = vuelidate;
      if(code.required.$invalid) {
        return 'A code is required.';
      }
      if(code.minLength.$invalid) {
        return `The code must have at least ${props.minLength} digits.`;
      }
      if(code.maxLength.$invalid) {
        return `The code must have fewer than ${props.maxLength} digits.`;
      }
      return 'The code you entered is not correct.';
    });

    return {
      code,
      errorMessage,
      vuelidate
    };
  },
  validations() {
    return {
      code: {
        required,
        minLength: minLength(this.minLength),
        maxLength: maxLength(this.maxLength)
      }
    };
  }
};
</script>

<style scoped>
</style>
