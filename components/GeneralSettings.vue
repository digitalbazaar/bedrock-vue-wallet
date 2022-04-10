<template>
  <div>
    <form
      @submit.prevent="save">
      <p>
        You may update your account email at any time. When you login, the link
        and code will be sent to the email listed here.
      </p>
      <q-input
        v-model="form.email"
        outlined
        stack-label
        class="q-mb-md"
        type="text"
        label="Email Address"
        hint="Update your email address."
        :error="$v.form.email.$error"
        :error-message="errorMessage"
        @input="handleEmailChange()"
        @blur="$v.form.email.$touch" />
      <!-- <p>
        For extra security, you may enter a PIN which will allow your wallet to
        be locked due to inactivity. This will help prevent unauthorized access
        if someone else uses your device.
      </p>
      <q-input
        v-model="form.pin"
        outlined
        stack-label
        type="text"
        label="PIN (Optional)"
        hint="Update your PIN."
        class="q-mb-md" /> -->
      <q-btn
        type="submit"
        label="Save"
        color="primary"
        class="full-width"
        style="max-width: 250px"
        :loading="loading"
        :disable="loading || $v.form.$invalid || disabled" />
    </form>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {getPrimaryEmail} from '@bedrock/web-wallet';
import {required, email} from 'vuelidate/lib/validators';

export default {
  name: 'GeneralSettings',
  props: {},
  data() {
    return {
      form: {
        email: '',
        pin: ''
      },
      initialEmail: '',
      loading: false,
      disabled: true
    };
  },
  computed: {
    errorMessage() {
      if(!this.$v.form.email.required) {
        return 'An email address is required.';
      }
      if(!this.$v.form.email.email) {
        return 'The email entered is invalid.';
      }
      return 'The value is invalid.';
    }
  },
  async created() {
    const email = await getPrimaryEmail();
    this.form.email = email;
    this.initialEmail = email;
  },
  validations: {
    form: {
      email: {required, email}
    }
  },
  methods: {
    save() {
      this.loading = true;
      try {
        // TODO: Needs to write to backend
        console.log('Form', this.form);
        this.$q.notify({
          message: 'Your account settings have been updated.',
          color: 'green',
          icon: 'fas fa-thumbs-up',
          position: 'bottom'
        });
        this.initialEmail = this.form.email;
        this.disabled = true;
      } catch(e) {
        console.log('Error: ', e);
      } finally {
        this.loading = false;
      }
    },
    handleEmailChange() {
      if(this.form.email !== this.initialEmail) {
        this.disabled = false;
        return;
      }
      this.disabled = true;
    }
  }
};
</script>

<style>
</style>
