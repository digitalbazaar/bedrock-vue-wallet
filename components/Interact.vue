<template>
  <div>
    <div
      v-if="step === 1"
      class="q-pa-md">
      <p class="text-center">
        Show this QR code to start your interaction.
      </p>
      <div
        v-if="requestUrl"
        class="q-mb-md">
        <qr-code
          :url="requestUrl" />
      </div>
      <div v-else>
        <q-spinner
          color="primary"
          size="3em" />
      </div>
    </div>
    <div
      v-if="step === 2"
      class="q-pa-md">
      <div>
        <q-card
          flat
          bordered
          class="my-card">
          <div class="row items-center no-wrap full-width">
            <q-card-section style="width: 80px">
              <img
                :src="siteInfo.logo"
                style="height: 40px; width: 40px">
            </q-card-section>
            <q-card-section class="column q-pl-none">
              <q-item-label
                class="text-left"
                lines="2">
                {{siteInfo.name}}
              </q-item-label>
              <q-item-label
                class="text-left"
                style="overflow-wrap: anywhere"
                caption>
                {{siteInfo.url}}
              </q-item-label>
            </q-card-section>
          </div>
        </q-card>
        <q-btn
          label="Go to website"
          color="primary"
          class="full-width q-mt-md"
          style="height: 40px"
          @click="goToSite(siteInfo.url)" />
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import QrCode from './QrCode.vue';
//import {RsvpClient} from 'rsvp-client';

const payload = {
  ttl: 300000,
  type: 'someType'
};

export default {
  name: 'Interact',
  components: {QrCode},
  props: {},
  data() {
    return {
      step: 1,
      siteInfo: {
        name: '',
        url: '',
        logo: 'https://raw.githubusercontent.com/webpack/media/master/logo/' +
        'icon-square-big.png',
      },
      requestUrl: null
    };
  },
  computed: {},
  created() {
    this.getSiteInfo();
  },
  methods: {
    nextStep() {
      this.step += 1;
    },
    goToSite(url) {
      window.location.href = url;
    },
    async getSiteInfo() {
      throw new Error('Not implemented');
      /*const rsvpClient = new RsvpClient();
      const result = await rsvpClient.createRequest({payload});
      this.requestUrl = result.url;
      const data = await rsvpClient.getResponse({url: this.requestUrl});
      this.siteInfo.name = data.name;
      this.siteInfo.url = data.url;
      this.nextStep();*/
    }
  }
};
</script>

<style scoped>
</style>
