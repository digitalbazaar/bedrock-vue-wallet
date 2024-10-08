<template>
  <q-card
    flat
    class="details-dialog">
    <div class="row full-height">
      <!-- Close button -->
      <q-btn
        v-if="!nfcSharing"
        v-close-popup
        flat
        round
        color="dark"
        icon="fa fa-times"
        class="absolute-top-right q-ma-sm"
        style="font-size: 0.75em; z-index: 1;" />
      <!-- Left side details -->
      <div class="col-xs-12 col-md-5 bg-white q-pt-xl q-pb-md q-px-xl">
        <div
          class="row justify-center full-height"
          :class="nfcClass">
          <q-card-section class="q-pa-none text-body1 text-left">
            <q-card
              class="card q-mx-auto"
              :style="cardBackground">
              <credential-switch
                :credential="credential"
                :text-color="cardStyles.textColor"
                :name-override="credentialOverrides.title"
                :image-override="credentialOverrides.image"
                :description-override="credentialOverrides.subtitle">
                <template
                  v-if="hasNFCPayload({credential})"
                  #image>
                  <div class="row justify-between">
                    <dynamic-image
                      class="q-mr-auto"
                      :src="credentialOverrides.image"
                      size="md" />
                    <span v-html="contactlessSvg" />
                  </div>
                </template>
              </credential-switch>
            </q-card>
            <div
              v-if="nfcSharing"
              class="row justify-center items-center text-body2 disabled
                q-mt-md">
              <q-spinner-ios
                size="1em"
                style="height: 24px; margin-right: 7px;" />
              <div>
                Sharing
              </div>
            </div>
            <div
              v-if="nfcSharing"
              class="text-center q-pt-md">
              <div class="text-body1">
                Hold your device near a reader to share your credential.
              </div>
              <div>
                <q-btn
                  outline
                  rounded
                  no-caps
                  class="q-mt-sm"
                  @click="cancelWrite">
                  Cancel
                </q-btn>
              </div>
            </div>
            <q-card-section

              v-if="hasNFCPayload({credential})"
              class="q-px-none q-pb-none flex full-width justify-center">
              <NfcShare
                ref="nfcShareComponent"
                :credential="credential"
                @sharing="nfcSharing = $event" />
            </q-card-section>
            <div v-if="!nfcSharing">
              <div>
                <div class="text-grey q-mt-lg text-body2">
                  Description
                </div>
                <div class="text-body1">
                  {{description}}
                </div>
                <div class="text-grey q-mt-md text-body2">
                  Issued for
                </div>
                <div class="text-body1">
                  {{credentialHolderName}}
                </div>
              </div>
            </div>
          </q-card-section>
          <q-card-section
            v-if="!nfcSharing"
            class="flex full-width q-mt-auto">
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
      <CredentialDetailsViews
        v-if="!nfcSharing"
        :credential="credential"
        :credential-overrides="credentialOverrides"
        :credential-highlights="credentialHighlights" />
    </div>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref} from 'vue';
import {CredentialSwitch, DynamicImage} from '@bedrock/vue-vc';
import {svg as contactlessSvg} from './contactless.js';
import CredentialDetailsViews from './CredentialDetailsViews.vue';
import {helpers} from '@bedrock/web-wallet';
import NfcShare from './NfcShare.vue';

const {hasNFCPayload} = helpers;

export default {
  name: 'CredentialDetails',
  components: {
    CredentialSwitch,
    CredentialDetailsViews,
    DynamicImage,
    NfcShare,
  },
  props: {
    toggleDeleteWindow: {
      type: Function,
      required: true
    },
    credential: {
      type: Object,
      required: true
    },
    credentialHolderName: {
      type: String,
      required: true
    },
    cardStyles: {
      type: Object,
      required: true
    },
    cardBackground: {
      type: String,
      default: ''
    },
    credentialHighlights: {
      type: Object,
      required: true
    },
    credentialOverrides: {
      type: Object,
      default: () => ({
        title: '',
        image: '',
        subtitle: '',
        description: '',
      })
    },
  },
  setup(props) {
    // Local state
    const showDelete = ref(false);
    const nfcSharing = ref(false);
    const nfcShareComponent = ref(null);
    console.log('Credential details', props.credential);

    const nfcClass = computed(() => {
      const isNfcSharing = nfcSharing.value;
      if(!isNfcSharing) {
        return ['items-start'];
      }

      return ['items-center', 'nfc-card-position'];
    });
    // Credential description
    const description = computed(() => {
      if(props.credentialOverrides.description) {
        return props.credentialOverrides.description;
      } else {
        return props.credential?.description?.length ?
          props.credential.description : 'Description not available.';
      }
    });

    function cancelWrite() {
      nfcShareComponent.value.cancelWrite();
    }

    return {
      cancelWrite,
      contactlessSvg,
      showDelete,
      description,
      hasNFCPayload,
      nfcSharing,
      nfcClass,
      nfcShareComponent
    };
  }
};
</script>

<style lang="scss" scoped>
$breakpoint-sm: 767px;
.details-dialog {
  /* Apply styles when dialog is not full screen */
  @media (min-width: #{$breakpoint-sm}) {
    border-radius: 12px;
    width: 850px;
    height: 600px;
    max-width: 80vw;
    max-height: 80vh;
  }
}
.card {
  /* Credit card ratio 2.125 H by 3.375 W */
  width: 275px;
  padding: 16px;
  border-radius: 16px;
  aspect-ratio: 3.375 / 2.125;
  background-color: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.nfc-card-position {
  margin-top: -16vh;
}
</style>
