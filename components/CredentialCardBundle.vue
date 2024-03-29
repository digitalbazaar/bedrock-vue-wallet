<template>
  <div
    class="card-container q-my-xs q-mx-xs"
    @mouseover="hover=true"
    @mouseleave="hover=false">
    <q-card class="card">
      <credential-switch
        :credential="credentialRecord.credential"
        :clickable="true">
        <template #modalHeader>
          <q-card-section class="q-pa-sm text-center card-title">
            <div class="row">
              <div class="col-2">
                <div class="float-left">
                  <q-btn
                    flat
                    round
                    size="sm"
                    color="negative"
                    icon="far fa-trash-alt"
                    @click="deleteCredential(credentialRecord)" />
                </div>
              </div>
              <div class="col-8 q-my-auto">
                Credential Details
              </div>
              <div class="col-2">
                <div class="float-right">
                  <q-btn
                    v-close-popup
                    flat
                    round
                    size="sm"
                    color="black"
                    icon="fas fa-times" />
                </div>
              </div>
            </div>
          </q-card-section>
          <q-separator />
        </template>
        <template #modalFooter>
          <q-separator />
          <q-card-section class="text-center sticky-bottom q-pa-sm">
            <div class="text-caption text-grey-7">
              Issued for
            </div>
            <div class="text-body2">
              {{getProfile(credentialRecord.meta.holder).name}}
            </div>
          </q-card-section>
        </template>
      </credential-switch>
    </q-card>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
// FIXME: do not import any of these, parameterize / use events instead
import {ageCredentialHelpers, getCredentialStore} from '@bedrock/web-wallet';
import {CredentialSwitch} from '@bedrock/vue-vc';

const {generateQrCodeDataUrl, reissue} = ageCredentialHelpers;

export default {
  name: 'CredentialCardBundle',
  components: {
    CredentialSwitch
  },
  props: {
    credentialRecord: {
      type: Object,
      required: true
    },
    detail: {
      type: Boolean,
      required: false
    },
    schemaMap: {
      type: Object,
      required: true
    },
    profileOptions: {
      default: () => [],
      type: Array,
      required: false
    }
  },
  emits: ['delete'],
  data() {
    return {
      card: false,
      hover: false,
      currentCard: {},
      currentCardProfile: {},
      qrUrl: ''
    };
  },
  methods: {
    async deleteCredential(credentialRecord) {
      this.$q.loading.show({
        delay: 300,
        message: 'Deleting your credential...'
      });
      try {
        this.currentCard = await this.getCardData(credentialRecord);
        this.currentCardProfile = this.getProfile(credentialRecord.meta.holder);
        this.card = true;
      } catch(e) {
        if(e.response.status !== 404) {
          console.error(e); // log unexpected error
        }
      }
      const {id: profileId} = this.currentCardProfile;
      try {
        await this.$emitExtendable('delete', {
          profileId,
          credentialId: credentialRecord.credential.id ??
            credentialRecord.meta.id
        });

        // provide user feedback denoting success
        this.$q.notify({
          type: 'positive',
          message: 'Credential successfully deleted.'
        });

        this.card = false;
      } catch(e) {
        console.error('Delete credential error:', e);
        this.$q.notify({
          type: 'negative',
          message: 'Credential failed to be deleted. ' +
            'Please try again at a later time.'
        });
      } finally {
        this.$q.loading.hide();
      }
    },
    getColor(holder) {
      const DEFAULT_COLOR = '#fff';
      const profile = this.getProfile(holder);
      if(!profile) {
        // could not find the profile associated with the holder, we'll
        // return white as the default color
        return DEFAULT_COLOR;
      }
      return profile.color || DEFAULT_COLOR;
    },
    getProfile(profileId) {
      const [profile] = this.profileOptions.filter(({id}) => id === profileId);
      return profile;
    },
    async expandCredential(credentialRecord) {
      this.$q.loading.show({
        message: 'Loading your credential details.'
      });
      try {
        this.currentCard = await this.getCardData(credentialRecord);
        this.currentCardProfile = this.getProfile(credentialRecord.meta.holder);
        this.card = true;
      } catch(e) {
        if(e.response.status !== 404) {
          console.error(e); // log unexpected error
        }
      } finally {
        this.$q.loading.hide();
      }
    },
    async getCardData(credentialRecord) {
      return {
        credential: await this.displayCredential(credentialRecord),
        schema: this.schemaMap[credentialRecord.credential.type[1]] || {}
      };
    },
    async displayCredential(credentialRecord) {
      let credential = JSON.parse(JSON
        .stringify(credentialRecord.credential));
      // FIXME: generalize
      if(credential.type.includes('AgeVerificationContainerCredential')) {
        credential = await createBundledCredential({credentialRecord});
      }
      return credential;
    }
  }
};

// FIXME: move elsewhere and refactor to make code avoid doing extra work
async function createBundledCredential({credentialRecord}) {
  const credential = JSON.parse(JSON
    .stringify(credentialRecord.credential));
  const profileId = credentialRecord.meta.holder;
  const credentialStore = await getCredentialStore({
    // FIXME: determine how password will be provided / set; currently
    // set to `profileId`
    // FIXME: this code shouldn't be called in a component anyway
    profileId, password: profileId
  });

  if(credential.type.includes('AgeVerificationContainerCredential')) {
    // FIXME: this gets the *entire* bundle, which is likely unnecessary
    // FIXME: it also re-fetches the container credential because its
    // original EDV doc has not been preserved / passed through
    const {allSubDocuments} = await credentialStore.local.getBundle({
      id: credential.id ?? credentialRecord.meta.id
    });
    credential.credentialSubject = await createAgeCredential({
      bundledCredentials: allSubDocuments.map(d => d.content),
      credentialId: credential.id ?? credentialRecord.meta.id,
      credentialStore
    });
  }
  return credential;
}

// FIXME: move elsewhere and refactor to make code avoid doing extra work
async function createAgeCredential({
  bundledCredentials, credentialId, credentialStore
}) {
  const newCredentialSubject = {};
  for(const credential of bundledCredentials) {
    if(credential.type.includes('PersonalPhotoCredential')) {
      newCredentialSubject.image = credential.credentialSubject.image;
      continue;
    }
    if(credential.type.includes('AgeVerificationCredential')) {
      newCredentialSubject.overAge = credential.credentialSubject.overAge;
      continue;
    }
  }
  const localTokenVcs = bundledCredentials.filter(
    vc => vc.type.includes('OverAgeTokenCredential'));
  const tokenCount = localTokenVcs.length;
  const qr = {};
  if(!qr.url) {
    qr.id = localTokenVcs[0].id;
    qr.url = await generateQrCodeDataUrl({credential: localTokenVcs[0]});
    if(tokenCount === 1) {
      await reissue({
        ageVerificationContainerId: credentialId, credentialStore
      });
    }
  }
  newCredentialSubject.qr = qr;
  newCredentialSubject.concealedIdTokenCount = localTokenVcs.length;
  return newCredentialSubject;
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

.card-container {
  transition: filter .08s ease-in-out;
}

.card-container:hover {
  filter: brightness(97%);
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

.card-title {
  /* Anything larger than mobile */
  @media (min-width: #{$breakpoint-sm}) {
    min-width: 450px;
  }
  @include mobile {
    min-width: 300px;
  }
}
</style>
