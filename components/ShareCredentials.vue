<template>
  <div>
    <q-inner-loading
      :showing="loading">
      <q-spinner-tail
        size="5em"
        color="primary" />
    </q-inner-loading>
    <q-page
      v-if="!loading"
      :class="$q.screen.lt.sm ? classObject :
        classObject + ' q-my-md'"
      style="max-width: 600px; border: 1px solid rgba(157, 157, 157, 0.75)">
      <div
        class="q-px-lg q-pb-md"
        style="overflow: auto"
        :style="$q.screen.lt.sm ? 'max-height: calc(100% - 67px)' :
          'max-height: calc(100vh - 102px)'">
        <div class="full-width">
          <profile-chooser
            :loading="profilesUpdating"
            :profiles="profiles"
            :selected="selectedProfile"
            @select="selectedProfileId = $event.profile" />
        </div>
        <share-review
          :authentication="headerType === 'authentication'"
          :capabilities="capabilityQuery"
          :credentials="displayableCredentials"
          :loading="loading || !selectedProfile"
          :request-origin="requestOrigin"
          :style="$q.screen.lt.sm ?
            'border-bottom: 1px solid rgba(157, 157, 157, 0.75)' : ''">
          <template #credentials-display="displayProps">
            <credentials-list
              :compact="true"
              :selectable="true"
              :selected-credentials="selectedCredentials"
              :credentials="displayProps.credentials"
              @select-credentials="selectCredentials" />
          </template>
        </share-review>
      </div>
      <div
        class="self-end row justify-between q-py-md q-px-lg"
        :style="$q.screen.lt.sm ? 'position: fixed' : 'position: sticky'"
        style="max-width: 600px">
        <q-btn
          class="q-mr-sm g-button bg-white"
          no-caps
          outline
          color="primary"
          label="Cancel"
          :disable="loading"
          @click="cancel()" />
        <q-btn
          class="g-button"
          no-caps
          color="primary"
          :disable="
            loading || (emptyResponse && headerType !== 'authentication')
          "
          :loading="loading"
          :label="headerType === 'authentication' ? 'Authenticate' : 'Share'"
          @click="share()" />
      </div>
    </q-page>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref, toRaw, toRef, unref} from 'vue';
import {
  getCredentialStore, helpers, presentations, profileManager
} from '@bedrock/web-wallet';
import {computedAsync} from '@vueuse/core';
import CredentialsList from './CredentialsList.vue';
import ProfileChooser from './ProfileChooser.vue';
import ShareReview from './ShareReview.vue';

const {createCapabilities} = helpers;

/**
 * This component is generally rendered inside a CHAPI window. It is used
 * to select credentials/capabilities to share with a relying party.
 */
export default {
  name: 'ShareCredentials',
  components: {
    CredentialsList,
    ProfileChooser,
    ShareReview
  },
  props: {
    requestOrigin: {
      type: String,
      required: true,
      default: ''
    },
    verifiablePresentationRequest: {
      type: [Object, Array],
      required: true,
      default: () => ({})
    }
  },
  emits: ['share', 'cancel'],
  setup(props) {
    const profilesUpdating = ref(true);
    const profiles = computedAsync(async () => {
      try {
        // FIXME: `useCache: true` is problematic when user is registered JIT
        return await profileManager.getProfiles({useCache: true});
      } catch(e) {
        // TODO: Properly handle error. Retry fetching profiles or set a flag
        // that notifies wallet account holder that they cannot continue.
        console.error(e);
      }
      return [];
    }, [], profilesUpdating);

    const verifiablePresentationRequest = toRef(
      props, 'verifiablePresentationRequest');

    const selectedProfileId = ref();

    const selectedProfile = computed(() => {
      if(!profiles.value) {
        return undefined;
      }
      if(selectedProfileId.value === undefined) {
        // default to first profile, ok to be undefined if zero profiles
        return profiles.value[0];
      }
      return profiles.value.find(p => p.id === selectedProfileId.value);
    });

    const displayableCredentials = ref([]);
    const selectedCredentials = ref([]);

    const verifiableCredentialUpdating = ref(true);
    const verifiableCredential = computedAsync(async () => {
      if(!(verifiablePresentationRequest.value && selectedProfile.value)) {
        return [];
      }
      const {id: profileId} = selectedProfile.value;

      // FIXME: event should be emitted to deal with the query at the page

      // get credential store for selected profile
      const credentialStore = await getCredentialStore({
        // FIXME: determine how password will be provided / set; currently
        // set to `profileId`
        // FIXME: this code shouldn't be called in a component anyway
        profileId, password: profileId
      });

      // match VPR against credential store
      let records = [];
      try {
        const matches = await presentations.match({
          verifiablePresentationRequest: unref(verifiablePresentationRequest),
          credentialStore
        });
        // FIXME: use matches directly instead of using records, UI
        // should better render full matches
        records = Array.isArray(matches.flat) ?
          matches.flat.map(match => match.derived?.length > 0 ?
          // FIXME: temporary measure to replace content with derived VC,
          // instead UI should support both and prefer derived
            {...match.record, content: match.derived[0].derivedCredential} :
            match.record) : [];
      } catch(error) {
        console.log('Error trying to process query: ', {error});
      }

      // FIXME: handle duplicate VC IDs (multiple derived VCs with the same
      // VC `id` could have been generated based on different queries)

      // creates container credentials for display only
      const displayContainers = await createContainers({records});
      displayableCredentials.value = displayContainers;
      selectedCredentials.value = displayContainers.map(vc => vc.id);
      const credentials = records.map(r => r.content);
      return credentials;
    }, [], verifiableCredentialUpdating);

    const sharing = ref(false);

    const loading = computed(() =>
      verifiableCredentialUpdating.value ||
      profilesUpdating.value ||
      sharing.value);

    return {
      displayableCredentials,
      selectedCredentials,
      loading,
      profiles,
      profilesUpdating,
      selectedProfile,
      selectedProfileId,
      sharing,
      verifiableCredential
    };
  },
  computed: {
    classObject() {
      return this.selectedProfile ? ['s-page'] : ['s-page-full'];
    },
    // FIXME: This needs to be removed in favor of actually checking a resposne
    // from a vp-request. The current implementation will say we have an empty
    // response in the case of DIDAuthentication which is okay. There may be
    // other vp-reqs that don't require vcs or zcaps to be successful.
    emptyResponse() {
      const vcs = this.verifiableCredential;
      const zcaps = this.capabilityQuery;
      const response = [...vcs, ...zcaps];
      return response.length === 0;
    },
    // FIXME: button label determined by headerType; consider moving buttons
    // elsewhere / using `continue` and `finish` language
    headerType() {
      const type = this.verifiablePresentationRequest?.query?.type;
      return (type === 'DIDAuthentication' || type === 'DIDAuth') ?
        'authentication' : 'query';
    },
    capabilityQuery() {
      return this.ocapQuery.capabilityQuery || [];
    },
    ocapQuery() {
      const type = 'OcapLdQuery';
      const query = this.verifiablePresentationRequest?.query;
      if(!query) {
        return {};
      }
      if(Array.isArray(query)) {
        // FIXME: This does not support multiple ocap-ld queries
        const [ocapQuery] = query.filter(q => q.type === type);
        if(!ocapQuery) {
          return {};
        }
        return ocapQuery;
      }
      return query.type === type ? query : {};
    }
  },
  methods: {
    async generateCapabilities() {
      if(!(this.capabilityQuery && this.selectedProfile)) {
        return [];
      }
      const profileId = this.selectedProfile.id;
      return [].concat(...await Promise.all(this.capabilityQuery.map(
        async request => createCapabilities({profileId, request}))));
    },
    selectCredentials({selections}) {
      this.selectedCredentials = [...selections];
    },
    async share() {
      this.sharing = true;
      try {
        // TODO: implement
        const {verifiableCredential} = this;
        const presentation = {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          type: ['VerifiablePresentation'],
          holder: this.selectedProfile.id
        };
        if(verifiableCredential.length > 0) {
          const vcs = toRaw(verifiableCredential);
          const selections = toRaw(this.selectedCredentials);
          // only send the VCs selected
          presentation.verifiableCredential = vcs.filter(
            vc => selections.includes(vc.id));
        }
        const capabilities = await this.generateCapabilities();
        // Presentations with out capabilities will result
        // in an empty array
        if(capabilities.length > 0) {
          addChapiType({presentation});
          presentation.capability = capabilities;
        }
        await this.$emitExtendable('share', {presentation});
      } catch(error) {
        console.log('Error trying to share credentials: ', {error});
      } finally {
        this.sharing = false;
      }
    },
    async cancel() {
      await this.$emitExtendable('cancel');
    }
  }
};

function addChapiType({presentation}) {
  addChapiContext({presentation});
  if(!Array.isArray(presentation.type)) {
    presentation.type = [presentation.type];
  }
  presentation.type.push('ChapiPresentation');
}

function addChapiContext({presentation}) {
  if(!Array.isArray(presentation['@context'])) {
    presentation['@context'] = [presentation['@context']];
  }
  presentation['@context'].push('https://w3id.org/chapi/v1');
}

async function createContainers({credentialStore, records}) {
  // FIXME: change this; it is hacky -- build virtual VCs instead somehow
  const recordsClone = JSON.parse(JSON.stringify(records));
  const credentials = [];
  let containerCredential;
  for(const record of recordsClone) {
    const type = record.content.type;
    if(type.includes('OverAgeTokenCredential')) {
      if(!containerCredential) {
        ({content: containerCredential} = await credentialStore.local.get({
          id: record.meta.bundledBy[0]
        }));
      }
      record.content.name = 'Over Age Token Credential';
      record.content.description =
        'This credential can be used to prove that you are over ' +
        'a particular age.';
      record.content.issuer = containerCredential.issuer;
      credentials.push(record.content);
      continue;
    }
    credentials.push(record.content);
  }
  return credentials;
}
</script>

<style lang="scss" scoped>
$breakpoint-sm: 502px;
$breakpoint-xs: 320px;

@mixin mobile {
  @media (min-width: #{$breakpoint-xs}) and (max-width: #{$breakpoint-sm}) {
    @content;
  }
}

.self-end {
  width: 100%;
  bottom: 0;
  left: 0;
  background-color: #f9f9f9;
  padding: 16px 48px;
  border-top: 1px solid rgba(157, 157, 157, 0.75);
}

.g-button {
  width: calc(50% - 8px)
}

.s-page {
  min-height: auto !important;
  background: #fff !important;

  @include mobile {
    padding: 0;
    height: 100vh;
  }
}

.s-page-full {
  min-height: auto !important;
  background: #fff !important;
  height: 100vh;

  @include mobile {
    padding: 0;
    height: 100vh;
  }
}

.s-separator {
  background: rgba(157, 157, 157, 0.75);
}
</style>
