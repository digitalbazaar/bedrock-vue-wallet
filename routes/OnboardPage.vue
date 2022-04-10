<template>
  <q-page>
    <div
      v-show="!pageLoading"
      class="column">
      <div class="col-10">
        <div
          class="row justify-center q-px-md q-pt-md q-mx-auto"
          style="max-width: 500px">
          <br-q-title-card
            title="Onboard"
            class="full-width">
            <div
              slot="body"
              class="column q-pa-md">
              <div
                class="row justify-left">
                <span class="text-left">
                  <strong>{{profileName}}</strong> has invited you to join as
                  <strong>{{email}}</strong>. Please login to complete the
                  onboarding process. If your wallet account uses an email
                  address that is different from the invite, you may enter
                  it below.
                </span>
              </div>
            </div>
          </br-q-title-card>
        </div>
      </div>
      <div class="col-10">
        <div
          class="row justify-center q-pa-md q-mx-auto"
          style="max-width: 500px">
          <login @login="$event.waitUntil(claim())" />
        </div>
      </div>
    </div>
    <q-inner-loading :showing="pageLoading">
      <q-spinner
        size="75px"
        :thickness="2"
        color="primary" />
    </q-inner-loading>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQTitleCard} from '@bedrock/quasar-components';
import Login from '../components/Login.vue';
import {ProfileService} from '@bedrock/web-profile';
import {session} from '@bedrock/web-session';

export default {
  name: 'OnboardPage',
  components: {Login, BrQTitleCard},
  data() {
    return {
      email: '',
      loginModal: false,
      pageLoading: false,
      profileName: '',
      profileAgent: ''
    };
  },
  async mounted() {
    try {
      this.pageLoading = true;

      const {profileName, profileAgent, email} = this.$route.query;
      this.profileName = profileName;
      this.profileAgent = profileAgent;
      this.email = email;

      // always log user out to prevent erroneous onboarding
      await session.end();
    } finally {
      this.pageLoading = false;
    }
  },
  methods: {
    async claim() {
      this.loginModal = false;

      try {
        // TODO: bedrock-web-profile.claimProfileAgent({account, profileAgent})
        const profileService = new ProfileService();
        const {account: {id: account}} = session.data;
        const {profileAgent} = this;
        await profileService.claimAgent({account, profileAgent});

        // TODO: consider adding successfully onboarded modal before
        // redirecting to profiles page

        this.$router.push({name: 'profiles'});
      } catch(e) {
        // FIXME: address unhappy path
        console.error(e);
      }
    }
  }
};
</script>

<style>
</style>
