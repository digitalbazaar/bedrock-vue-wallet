<template>
  <q-page
    class="row justify-center q-pa-md">
    <div
      class="full-width"
      style="max-width: 500px">
      <login
        @login="$event.waitUntil(login())"
        @register="$event.waitUntil(register())" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {installHandler} from 'web-credential-handler';
import Login from '../components/Login.vue';
import {Notify} from 'quasar';

export default {
  name: 'LoginPage',
  components: {Login},
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {};
  },
  async created() {
    if(this.account) {
      this.login();
    }
  },
  methods: {
    async login() {
      // redirect home
      this.$router.push({name: 'home'});
      this.$q.notify({
        message: 'Allow Wallet',
        color: 'secondary',
        // show the message for 15 seconds
        timeout: 15000,
        actions: [{
          label: 'Allow',
          color: 'white',
          async handler() {
            try {
              // install credential handler
              await installHandler({url: '/credential-handler'});
            } catch(e) {
              // eslint-disable-line no-console
              console.error('CHAPI register error:', e);
              Notify.create({
                type: 'negative',
                message:
                  'Your wallet will not be shown to you as an option for using ' +
                  'credentials on other websites. Please click the button and ' +
                  'select "Allow" to change this.',
                actions: [{icon: 'fa fa-times'}]
              });
            }
          }
        }, {
          label: 'Dismiss',
          color: 'white',
          handler() {
            console.log('dismiss');
          }
        }]
      });
    },
    async register() {
      // redirect to register
      this.$router.push({name: 'register'});
    }
  }
};
</script>

<style scoped>
</style>
