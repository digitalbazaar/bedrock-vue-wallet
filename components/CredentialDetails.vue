<template>
  <q-card flat class="details-dialog">
    <div class="row full-height">
      <!-- Close button -->
      <q-btn
        v-close-popup
        flat
        round
        color="dark"
        icon="fa fa-times" 
        class="absolute-top-right q-ma-sm"/>
      <!-- Left side details -->
      <div class="col-5 bg-white q-pt-xl q-pb-md q-px-xl">
        <div class="row justify-center items-start full-height" >
          <q-card-section class="q-pa-none text-body1 text-left">
            <q-card class="card q-mx-auto">
              <credential-switch :credential="credential" />
            </q-card>
            <div class="text-grey q-mt-lg">
              Description
            </div>
            <div class="text-body1">
              {{credential?.description?.length ?
              credential.description : 'Description not available.'}}
            </div>
            <div class="text-grey q-mt-md">
              Issued for
            </div>
            <div class="text-body1">{{credentialHolderName}}</div>
          </q-card-section>
          <q-btn
            flat
            no-caps
            label="Remove"
            color="negative"
            icon="far fa-trash-alt"
            class="q-mt-auto q-mx-auto"
            @click="toggleDeleteWindow" />
        </div>
      </div>
      <!-- Right side details -->
      <div class="col bg-grey-2 q-pa-xl">
        <div class="row justify-start items-start full-height">
          <q-card-section class="q-pa-none text-body1 text-left">
            <div
              v-for="(value, key) in credentialDetails"
              :key="key"
              class="q-mt-sm">
              <div class="text-grey text-caption">{{key}}</div>
              <div class="text-body1">{{value}}</div>
            </div>
          </q-card-section>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CredentialSwitch} from '@bedrock/vue-vc';

export default {
  name: 'CredentialDetails',
  components: {
    CredentialSwitch
  },
  props: {
    toggleDetailsWindow: {
      type: Function,
      required: true
    },
    toggleDeleteWindow: {
      type: Function,
      required: true
    },
    showDetails: {
      type: Boolean,
      required: true
    },
    credential: {
      type: Object,
      required: true
    },
    credentialHolderName: {
      type: String,
      required: true
    }
  },
  mounted() {
    this.getCredentialDetails();
    console.log('credential details', this.credential);
  },
  data() {
    return {
      showDelete: false,
      qrUrl: '',
      credentialDetails: {},
    };
  },
  methods: {
    getCredentialDetails() {
      if(this.credential.issuer.name) {
        this.credentialDetails['Issuer Name'] = this.credential.issuer.name;
      }
      if(this.credential.issuanceDate) {
        const yearMonthDay = this.credential.issuanceDate.slice(0, 10);
        this.credentialDetails['Date Issued'] = yearMonthDay;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
$breakpoint-sm: 767px;
$breakpoint-xs: 360px;

@mixin mobile {
  @media (min-width: #{$breakpoint-xs}) and (max-width: #{$breakpoint-sm}) {
    @content;
  }
}

.details-dialog {
  border-radius: 12px;
  width: 800px; 
  max-width: 80vw;
  height: 500px;
  max-height: 80vh;
}

.card {
  /* Credit card ratio 2.125 H by 3.375 W */
  width: 275px;
  padding: 24px;
  border-radius: 16px;
  aspect-ratio: 3.375 / 2.125;
  background-color: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.1);
  /* Fill screen when using smaller device */
  @media (max-width: #{$breakpoint-sm}) {
    width: 340px;
  }
  /* Fill screen when using smaller device */
  @media (max-width: #{$breakpoint-xs}) {
    width: 275px;
  }
}
</style>
