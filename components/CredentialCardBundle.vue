<template>
  <div>
    <div>
      <credential-card
        class="cursor-pointer"
        :credential="credentialRecord.credential"
        :color="getColor(credentialRecord.meta.holder)"
        :schema="schemaMap[credentialRecord.credential.type[1]] || {}"
        :field-quantity="0"
        :clickable="true"
        @click.native="expandCredential(credentialRecord)" />
    </div>
    <q-dialog
      v-model="card"
      :maximized="$q.screen.lt.sm"
      @before-hide="handleClose({currentCard, currentCardProfile})">
      <q-card>
        <credential-card-detail
          :credential="currentCard.credential"
          :schema="currentCard.schema"
          :profile="currentCardProfile"
          :modal="true"
          @delete="deleteCredential"
          @presentation-view="handlePresentationView({
            currentCard, currentCardProfile})">
          <template #qrcode>
            <div
              v-if="currentCard.credential.credentialSubject.qr.url"
              class="row justify-center q-pb-sm q-px-md">
              <img
                :src="currentCard.credential.credentialSubject.qr.url"
                style="border: 1px solid #222">
            </div>
          </template>
        </credential-card-detail>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
// FIXME: do not import any of these, parameterize them instead
import {config} from 'bedrock-web';
import {
  credentialHelpers,
  getCredentialStore,
  localCredentials
} from 'bedrock-web-wallet';
import {
  CredentialCardDetail,
  CredentialCard
} from 'bedrock-vue-credential-card';
import {store} from 'bedrock-web-store';
const {
  createBundledCredential
} = credentialHelpers;

const {getLocalVcStore} = localCredentials;

export default {
  name: 'CredentialsList',
  components: {
    CredentialCardDetail,
    CredentialCard
  },
  props: {
    credentialRecord: {
      type: Object,
      required: true
    },
    compact: {
      type: Boolean,
      required: false
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
  data() {
    return {
      card: false,
      currentCard: {},
      currentCardProfile: {},
      qrUrl: ''
    };
  },
  methods: {
    async deleteCredential(id) {
      this.$q.loading.show({
        delay: 300,
        message: 'Deleting your credential...'
      });
      const {id: profileId} = this.currentCardProfile;
      // FIXME: this should be parameterized and/or use events, only pages
      // should interact with lower level application code
      const credentialStore = await getCredentialStore({
        // FIXME: temporary password should be replaced -- and this code
        // shouldn't be called in a component anyway
        profileId, password: 'password'
      });
      try {
        // delete credential
        await credentialStore.delete({id});
        // start updating the latest set of credentials on screen
        const rootData = store.get({id: 'rootData'});
        rootData.updateCredentials = true;
        // provide user feedback denoting success
        this.$q.notify({
          type: 'positive',
          message: 'Credential successfully deleted.'
        });
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
    async handleClose({currentCard, currentCardProfile}) {
      if(currentCard.credential.type
        .includes('AgeVerificationContainerCredential')) {
        const credentialId = currentCard.credential.id;
        const profileId = currentCardProfile.id;
        const rootData = store.get({id: 'rootData'});
        try {
          const localVcStore = await getLocalVcStore({profileId});
          await localVcStore.get({id: credentialId});
        } catch(e) {
          // If AgeVerificationContainerCredential was not found in local
          // storage, then a refresh of the credential list is done in the
          // wallet to load the newly created local
          // AgeVerificationContainerCredential for the user.
          if(e.name === 'NotFoundError') {
            rootData.updateCredentials = true;
            return;
          }
        }
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
      const filters = config.credentialStorage.filters;
      const bundle = filters.bundle[credential.type[1]];
      if(bundle) {
        credential = await createBundledCredential({credentialRecord});
      }
      return credential;
    },
    async handlePresentationView({currentCard, currentCardProfile}) {
      // FIXME: should be parameterized and not determined by a component
      if(currentCard.credential.type
        .includes('AgeVerificationContainerCredential')) {
        // handles deletion of tokens for age credential
        const credentialId = currentCard.credential.credentialSubject.qr.id;
        const profileId = currentCardProfile.id;
        const credentialStore = await getCredentialStore({
          // FIXME: temporary password should be replaced -- and this code
          // shouldn't be called in a component anyway
          profileId, password: 'password'
        });
        await credentialStore.local.delete({id: credentialId, force: true});
      }
    }
  }
};
</script>

<style lang="scss" scoped>
$breakpoint-lg: 1216px;
$breakpoint-md: 991px;
$breakpoint-sm: 767px;
$breakpoint-xs: 320px;

@mixin tablet-large {
  @media (min-width: #{$breakpoint-md}) and (max-width: #{$breakpoint-lg}) {
    @content;
  }
}

@mixin tablet {
  @media (min-width: #{$breakpoint-sm}) and (max-width: #{$breakpoint-md}) {
    @content;
  }
}

@mixin mobile {
  @media (min-width: #{$breakpoint-xs}) and (max-width: #{$breakpoint-sm}) {
    @content;
  }
}

.s-card-list {
  width: 100%;
}

.s-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.s-section-title {
  width: 100%;
  flex-shrink: 0;
  display: inline-flex;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);

  h6 {
    font-size: 16px;
  }
}

.s-selected-icon {
 @include mobile {
   display: none;
 }
}

.s-profile-select {
  height: 30px;

  @include mobile {
    height: 26px;
  }
}

.s-credentials-list {
  flex-grow: 1;
  overflow-y: auto;
}

.s-sort-icon {
  margin-top: -10px;
}

.s-page-section {
  width: 100%;

  @include tablet-large {
    max-width: 100%;
  }

  @include mobile {
    border-radius: 0 !important;
    box-shadow: none;
  }
}
</style>
