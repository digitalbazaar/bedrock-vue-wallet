<template>
  <q-card
    flat
    class="details-dialog">
    <div class="row full-height">
      <!-- Close button -->
      <q-btn
        v-close-popup
        flat
        round
        color="dark"
        icon="fa fa-times"
        class="absolute-top-right q-ma-sm" />
      <!-- Left side details -->
      <div class="col-xs-12 col-md-5 bg-white q-pt-xl q-pb-md q-px-xl">
        <div class="row justify-center items-start full-height">
          <q-card-section class="q-pa-none text-body1 text-left">
            <q-card class="card q-mx-auto">
              <credential-switch :credential="credential" />
            </q-card>
            <div class="text-grey q-mt-lg text-caption">
              Description
            </div>
            <div class="text-body1">
              {{credential?.description?.length ?
                credential.description : 'Description not available.'}}
            </div>
            <div class="text-grey q-mt-md text-caption">
              Issued for
            </div>
            <div class="text-body1">
              {{credentialHolderName}}
            </div>
          </q-card-section>
          <q-card-section class="flex full-width q-mt-auto">
            <q-btn
              flat
              no-caps
              label="Remove"
              color="negative"
              class="q-mx-auto"
              icon="far fa-trash-alt"
              @click="toggleDeleteWindow" />
          </q-card-section>
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
              <div class="text-grey text-caption">
                {{key}}
              </div>
              <div class="text-body1">
                {{value}}
              </div>
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
import {onMounted, reactive, ref} from 'vue';
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
  setup(props) {
    // Local state
    const qrUrl = ref('');
    const showDelete = ref(false);
    const credentialDetails = reactive({});

    // Fetch credential details on load
    onMounted(() => {
      getCredentialDetails();
    });

    // Get details from credential
    function getCredentialDetails() {
      const name = props.credential?.issuer?.name;
      const issuanceDate = props.credential?.issuanceDate;
      if(name) {
        credentialDetails['Issuer Name'] = name;
      }
      if(issuanceDate) {
        const yearMonthDay = issuanceDate.slice(0, 10);
        credentialDetails['Date Issued'] = yearMonthDay;
      }
    }

    return {
      qrUrl,
      showDelete,
      credentialDetails
    };
  }
};
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
  /* Apply styles when dialog is not full screen */
  @media (min-width: #{$breakpoint-sm}) {
    border-radius: 12px;
    width: 800px;
    height: 500px;
    max-width: 80vw;
    max-height: 80vh;
  }
}

.card {
  /* Credit card ratio 2.125 H by 3.375 W */
  width: 275px;
  padding: 24px;
  border-radius: 16px;
  aspect-ratio: 3.375 / 2.125;
  background-color: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
