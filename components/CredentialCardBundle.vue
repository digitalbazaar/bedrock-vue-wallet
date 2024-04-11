<template>
  <!-- Credential Card -->
  <div
    class="q-my-xs q-mx-xs"
    @mouseover="hover=true"
    @mouseleave="hover=false">
    <q-card
      class="card"
      :style="cardBackground"
      :class="hover && 'shadow-12'"
      @click="toggleDetailsWindow">
      <credential-switch
        :text-color="cardStyles.textColor"
        :credential="credentialRecord.credential"
        :name-override="credentialOverrides.title"
        :image-override="credentialOverrides.image"
        :description-override="credentialOverrides.subtitle" />
    </q-card>
    <!-- Details dialog -->
    <q-dialog
      v-model="showDetails"
      transition-show="slide-up"
      transition-hide="slide-down"
      :maximized="$q.screen.lt.sm">
      <credential-details
        :card-styles="cardStyles"
        :show-details="showDetails"
        :card-background="cardBackground"
        :credential="credentialRecord.credential"
        :toggle-delete-window="toggleDeleteWindow"
        :credential-overrides="credentialOverrides"
        :toggle-details-window="toggleDetailsWindow"
        :credential-highlights="credentialHighlights"
        :credential-holder-name="credentialHolderName" />
    </q-dialog>
    <!-- Delete dialog -->
    <q-dialog
      v-model="showDelete"
      persistent>
      <q-card
        flat
        class="q-pa-md"
        style="border-radius: 12px;">
        <q-card-section class="row items-center">
          <div class="text-body1 q-ma-md">
            Permanently remove this credential?
          </div>
        </q-card-section>
        <q-card-actions align="between">
          <q-btn
            v-close-popup
            flat
            no-caps
            label="Remove"
            color="negative"
            class="text-body1"
            icon="far fa-trash-alt"
            @click="deleteCredential(credentialRecord)" />
          <q-btn
            v-close-popup
            flat
            no-caps
            label="Cancel"
            padding="sm md"
            color="primary"
            class="q-mr-sm text-body1" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 */
// FIXME: do not import any of these, parameterize / use events instead
import {ageCredentialHelpers, getCredentialStore} from '@bedrock/web-wallet';
import {computed, onBeforeMount, reactive, ref} from 'vue';
import {formatString, getValueFromPointer} from '../lib/helpers.js';
import {config} from '@bedrock/web';
import {createEmitExtendable} from '@digitalbazaar/vue-extendable-event';
import CredentialDetails from './CredentialDetails.vue';
import {CredentialSwitch} from '@bedrock/vue-vc';
import {useQuasar} from 'quasar';

// Constants
const {generateQrCodeDataUrl, reissue} = ageCredentialHelpers;

export default {
  name: 'CredentialCardBundle',
  components: {
    CredentialSwitch,
    CredentialDetails
  },
  props: {
    credentialRecord: {
      type: Object,
      required: true
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
  setup(props, {emit}) {
    // Constants
    const emitExtendable = createEmitExtendable({emit});

    // Hooks
    const $q = useQuasar();

    // Refs
    const qrUrl = ref('');
    const card = ref(false);
    const hover = ref(false);
    const currentCard = ref({});
    const showDelete = ref(false);
    const showDetails = ref(false);
    const currentCardProfile = ref({});
    const credentialHighlights = reactive({});
    const cardStyles = reactive({textColor: '', backgroundColor: ''});
    const credentialOverrides = reactive({
      title: '',
      image: '',
      subtitle: '',
      description: ''
    });

    // Fetch style, overrides, & highlights before component mounts
    onBeforeMount(() => {
      const vcConfig = getCredentialConfig();
      if(vcConfig) {
        const {styles, overrides, highlights} = vcConfig;
        setCardStyles(styles);
        setCardOverrides(overrides);
        getCredentialHighlights(highlights);
      }
    });

    // Get credential config for styles, overrides, and highlights
    function getCredentialConfig() {
      const credential = props.credentialRecord.credential;
      const vcConfig = config?.vueWallet?.cardDesigns?.find(config => {
        const pointers = Object.keys(config.matches);
        return pointers.every(pointer => {
          const value = getValueFromPointer(credential, pointer);
          return Array.isArray(value) ?
            value.includes(config.matches[pointer]) :
            value === config.matches[pointer];
        });
      });
      return vcConfig;
    }

    // Get credential card styles from configuration styles
    function setCardStyles(styles) {
      const {textColor, backgroundColor} = styles;
      cardStyles.textColor = textColor || '';
      cardStyles.backgroundColor = backgroundColor || '';
    }

    // Use overrides from credential configurations
    function setCardOverrides(overrides) {
      const {credential} = props.credentialRecord;
      if(overrides.imagePointer) {
        const {imagePointer} = overrides;
        const image = getValueFromPointer(credential, imagePointer);
        credentialOverrides.image = image;
      }
      if(overrides.title) {
        const {title} = overrides;
        const titleValue = getValueFromPointer(credential, title.pointer);
        credentialOverrides.title = formatString(titleValue, title.format);
      }
      if(overrides.subtitle) {
        const {subtitle} = overrides;
        const stValue = getValueFromPointer(credential, subtitle.pointer);
        credentialOverrides.subtitle = formatString(stValue, subtitle.format);
      }
      if(overrides.descriptionPointer) {
        const {descriptionPointer} = overrides;
        const description = getValueFromPointer(credential, descriptionPointer);
        credentialOverrides.description = description;
      }
    }

    // Get details from credential
    function getCredentialHighlights(highlights = []) {
      highlights.forEach(detail => {
        const {credential} = props.credentialRecord;
        const {pointer, format, joinWith} = detail;
        const value = getValueFromPointer(credential, pointer, joinWith);
        credentialHighlights[detail.field] = formatString(value, format);
      });
    }

    // Add gradient if custom card color is present
    const cardBackground = computed(() => {
      const start = cardStyles.backgroundColor;
      const end = cardStyles.backgroundColor + 'DF';
      const whiteBackground = 'background-color: #FFF';
      const gradient = `background: linear-gradient(
        140deg, ${start} 1%, ${end} 50%, ${start} 100%)`;
      return cardStyles.backgroundColor ? gradient : whiteBackground;
    });

    const credentialHolderName = computed(() => {
      const holder = props.credentialRecord.meta.holder;
      return getProfile(holder).name || '';
    });

    function toggleDetailsWindow() {
      showDetails.value = !showDetails.value;
    }

    function toggleDeleteWindow() {
      showDelete.value = !showDelete.value;
    }

    async function deleteCredential(credentialRecord) {
      $q.loading.show({delay: 300, message: 'Deleting your credential...'});
      try {
        currentCard.value = await getCardData(credentialRecord);
        currentCardProfile.value = getProfile(credentialRecord.meta.holder);
        card.value = true;
      } catch(e) {
        if(e.response.status !== 404) {
          console.error(e); // log unexpected error
        }
      }
      const {id: profileId} = currentCardProfile.value;
      try {
        await emitExtendable('delete', {
          profileId,
          credentialId: credentialRecord.credential.id ??
            credentialRecord.meta.id
        });
        // provide user feedback denoting success
        $q.notify({
          type: 'positive',
          message: 'Credential successfully deleted.'
        });
        card.value = false;
      } catch(e) {
        console.error('Delete credential error:', e);
        $q.notify({
          type: 'negative',
          message: 'Credential failed to be deleted. ' +
            'Please try again at a later time.'
        });
      } finally {
        $q.loading.hide();
      }
    }

    function getProfile(profileId) {
      const [profile] = props.profileOptions.filter(({id}) => id === profileId);
      return profile;
    }

    async function getCardData(credentialRecord) {
      return {
        credential: await displayCredential(credentialRecord),
        schema: props.schemaMap[credentialRecord.credential.type[1]] || {}
      };
    }

    async function displayCredential(credentialRecord) {
      let credential = JSON.parse(JSON
        .stringify(credentialRecord.credential));
      // FIXME: generalize
      if(credential.type.includes('AgeVerificationContainerCredential')) {
        credential = await createBundledCredential({credentialRecord});
      }
      return credential;
    }

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

    return {
      card,
      hover,
      qrUrl,
      showDelete,
      cardStyles,
      showDetails,
      currentCard,
      cardBackground,
      deleteCredential,
      currentCardProfile,
      toggleDeleteWindow,
      credentialOverrides,
      toggleDetailsWindow,
      credentialHighlights,
      credentialHolderName
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

.card {
  /* Credit card ratio 2.125 H by 3.375 W */
  width: 275px;
  padding: 16px;
  border-radius: 16px;
  aspect-ratio: 3.375 / 2.125;
  transition: all 0.15s ease-in-out;
  border: 1px solid rgba(0, 0, 0, 0.1);
  /* Fill screen when using smaller device */
  @media (max-width: #{$breakpoint-sm}) {
    width: 340px;
    padding: 24px;
  }
  /* Fill screen when using smaller device */
  @media (max-width: #{$breakpoint-xs}) {
    width: 275px;
  }
}
</style>
