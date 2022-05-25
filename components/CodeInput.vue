<template>
  <q-input
    v-model="code"
    outlined
    stack-label
    :minlength="minLength"
    :maxlength="maxLength"
    autocomplete="code"
    :hint="hint"
    :error="vuelidate.code.$error"
    :error-message="errorMessage"
    label="Code"
    autofocus
    bottom-slots
    @input="handleInput"
    @blur="vuelidate.code.$touch" />
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {required, minLength, maxLength} from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';

export default {
  name: 'CodeInput',
  components: {},
  props: {
    hint: {
      type: String,
      required: false,
      default: 'Please enter the code.'
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
  setup() {
    return {
      vuelidate: useVuelidate()
    };
  },
  data() {
    return {
      code: ''
    };
  },
  computed: {
    errorMessage() {
      if(!this.vuelidate.code.required) {
        return 'A code is required.';
      }
      if(this.minLength === this.maxLength &&
        (!this.vuelidate.code.minLength || !this.vuelidate.code.maxLength)) {
        return `The code must be ${this.minLength} digits.`;
      }
      if(!this.vuelidate.code.minLength) {
        return `The code must be at least ${this.minLength} digits.`;
      }
      if(!this.vuelidate.code.maxLength) {
        return `The code must be less than ${this.maxLength} digits.`;
      }
      return 'The code you entered is not correct.';
    }
  },
  async created() {
    await this.emitInvalid(this.vuelidate.code.$invalid);
  },
  validations() {
    return {
      code: {
        required,
        minLength: minLength(this.minLength),
        maxLength: maxLength(this.maxLength)
      }
    };
  },
  methods: {
    async handleInput() {
      await this.$emitExtendable('code', {code: this.code});
      await this.emitInvalid(this.vuelidate.code.$invalid);
    },
    async emitInvalid(invalid) {
      await this.$emitExtendable('invalid', {invalid});
    }
  }
};
</script>

<style scoped>
</style>
