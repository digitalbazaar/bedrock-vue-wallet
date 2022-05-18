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
        <share-header
          :name="name"
          :image="image"
          :type="headerType" />
        <div class="full-width">
          <profile-chooser
            :loading="$asyncComputed.profiles.updating"
            :profiles="profiles"
            :selected="selectedProfile"
            @select="selectedProfileId = $event.profile" />
        </div>
        <share-review
          :capabilities="capabilityQuery"
          :credentials="displayableCredentials"
          :name="name"
          :loading="loading || !selectedProfile"
          :request-origin="requestOrigin"
          :type="query.type"
          :style="$q.screen.lt.sm ?
            'border-bottom: 1px solid rgba(157, 157, 157, 0.75)' : ''" />
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
          :disable="loading || (emptyResponse && query.type !== 'DIDAuth')"
          :loading="loading"
          :label="headerType === 'authentication' ? 'Authenticate' : 'Share'"
          @click="share()" />
      </div>
    </q-page>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {
  ageCredentialHelpers, getCredentialStore, helpers, profileManager
} from '@bedrock/web-wallet';
import ProfileChooser from './ProfileChooser.vue';
import ShareHeader from './ShareHeader.vue';
import ShareReview from './ShareReview.vue';
import {WebAppManifestClient} from '@digitalbazaar/web-app-manifest-utils';

const {createCapabilities} = helpers;
const {ensureLocalCredentials} = ageCredentialHelpers;

const manifestClient = new WebAppManifestClient();

/**
 * This component is generally rendered inside a CHAPI window. It is used
 * to select credentials/capabilities to share with a relying party.
 */
export default {
  name: 'Share',
  components: {
    ProfileChooser,
    ShareHeader,
    ShareReview
  },
  props: {
    query: {
      type: [Object, Array],
      required: true,
      default: () => ({})
    },
    requestOrigin: {
      type: String,
      required: true,
      default: ''
    }
  },
  data() {
    return {
      presentation: null,
      profiles: undefined,
      sharing: false,
      loadingProfiles: true,
      selectedProfileId: undefined,
      displayableCredentials: []
    };
  },
  computed: {
    classObject() {
      return this.selectedProfile ? ['s-page'] : ['s-page-full'];
    },
    credentialQuery() {
      const type = 'QueryByExample';
      if(!this.query) {
        return {};
      }
      if(Array.isArray(this.query)) {
        // FIXME: This does not support multiple credential queries
        const [credentialQuery] = this.query
          .filter(query => query.type === type);
        if(!credentialQuery) {
          return {};
        }
        return credentialQuery;
      }
      if(this.query.type === 'DIDAuth' ||
        this.query.type === 'QueryByExample') {
        return this.query;
      }
      // unrecognized query
      return {};
    },
    // FIXME: This needs to be removed in favor of actually checking a resposne
    // from a vp-request. The current implementation will say we have an empty
    // response in the case of DIDAuth which is okay. There may be other vp-reqs
    // that don't require vcs or zcaps to be successful.
    emptyResponse() {
      const vcs = this.verifiableCredential;
      const zcaps = this.capabilityQuery;
      const response = [...vcs, ...zcaps];
      return response.length === 0;
    },
    favicon() {
      return `${this.requestOrigin}/favicon.ico`;
    },
    headerType() {
      return (this.query && this.query.type === 'DIDAuth') ?
        'authentication' : 'query';
    },
    image() {
      return this.icon || this.favicon;
    },
    name() {
      if(!this.relyingPartyManifest) {
        return this.requestOrigin;
      }
      return this.relyingPartyManifest.name;
    },
    capabilityQuery() {
      return this.ocapQuery.capabilityQuery || [];
    },
    ocapQuery() {
      const type = 'OcapLdQuery';
      if(!this.query) {
        return {};
      }
      if(Array.isArray(this.query)) {
        // FIXME: This does not support multiple ocap-ld queries
        const [ocapQuery] = this.query.filter(query => query.type === type);
        if(!ocapQuery) {
          return {};
        }
        return ocapQuery;
      }
      return this.query.type === type ? this.query : {};
    },
    selectedProfile() {
      if(!this.profiles) {
        return undefined;
      }
      if(this.selectedProfileId === undefined) {
        // default to first profile, ok to be undefined if zero profiles
        return this.profiles[0];
      }
      return this.profiles.find(p => p.id === this.selectedProfileId);
    },
    loading() {
      return this.$asyncComputed.verifiableCredential.updating ||
        this.$asyncComputed.relyingPartyManifest.updating ||
        this.$asyncComputed.profiles.updating ||
        this.sharing;
    }
  },
  asyncComputed: {
    async icon() {
      const manifest = this.relyingPartyManifest;
      const origin = this.requestOrigin;
      if(!(manifest && origin)) {
        return '';
      }
      const icon = await manifestClient.getManifestIcon({
        size: 48, manifest, origin
      });
      return icon ? icon.src : '';
    },
    profiles: {
      async get() {
        try {
          return await profileManager.getProfiles({useCache: true});
        } catch(e) {
          // TODO: Properly handle error. Retry fetching profiles or set a flag
          // that notifies wallet account holder that they cannot continue.
          console.error(e);
        }
      },
      default() {
        return [];
      }
    },
    async relyingPartyManifest() {
      try {
        if(this.requestOrigin) {
          return await manifestClient.getManifest({origin: this.requestOrigin});
        }
      } catch(e) {
        console.error(e);
        return undefined;
      }
    },
    verifiableCredential: {
      async get() {
        if(!(this.query && this.selectedProfile)) {
          return [];
        }
        const query = this.credentialQuery;
        const {id: profileId} = this.selectedProfile;
        if(query.type === 'DIDAuth' || query.type === undefined) {
          return [];
        }

        // FIXME: event should be emitted to deal with the query at the page

        // ensures local credentials are made present on the device
        const credentialStore = await getCredentialStore({
          // FIXME: determine how password will be provided / set; currently
          // set to `profileId`
          // FIXME: this code shouldn't be called in a component anyway
          profileId, password: profileId
        });
        await ensureLocalCredentials({credentialStore});

        const records = await getRecords({query, profileId});
        // creates container credentials for display only
        this.displayableCredentials = await createContainers({records});
        const credentials = records.map(r => r.content);
        return credentials;
      },
      default() {
        return [];
      }
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
    async share() {
      this.sharing = true;
      try {
        // TODO: implement
        const {verifiableCredential} = this;
        const presentation = {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          type: 'VerifiablePresentation',
          holder: this.selectedProfile.id
        };
        if(verifiableCredential.length > 0) {
          presentation.verifiableCredential = verifiableCredential;
        }
        const capabilities = await this.generateCapabilities();
        // Presentations with out capabilities will result
        // in an empty array
        if(capabilities.length > 0) {
          addChapiType({presentation});
          presentation.capability = capabilities;
        }
        await this.$emitExtendable('share', {presentation});
      } catch(e) {
        console.log('Error: ', e);
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

// eslint-disable-next-line no-unused-vars
function filterHackForChapi(credentials, query) {
  const [agentCredential] = credentials.filter(
    credential => credential.type.includes('OrganizationAgentCredential'));
  const credentialQuery = !Array.isArray(query.credentialQuery) ?
    [query.credentialQuery] : query.credentialQuery;
  const [customerQuery] = credentialQuery.filter(
    ({example}) => example.type.includes('CustomerCredential'));
  let customerCredential;
  if(customerQuery) {
    const {role} = customerQuery.example.credentialSubject;
    [customerCredential] = credentials.filter(credential => {
      return credential.type.includes('CustomerCredential') &&
        credential.credentialSubject.role === role;
    });
  }
  const vonName = 'Verified Organization Credential';
  const [vonCredential] = credentials.filter(({name}) => name === vonName);

  let filteredOrganization;
  if(vonCredential) {
    filteredOrganization = vonCredential;
  } else {
    // pick a self issued organiztion credential
    const [credential] = credentials.filter(({name}) => name !== vonName);
    filteredOrganization = credential;
  }
  const result = [];
  if(agentCredential) {
    result.push(agentCredential);
  }
  if(filteredOrganization) {
    result.push(filteredOrganization);
  }
  if(customerCredential) {
    result.push(customerCredential);
  }
  return result;
}

// FIXME: move elsewhere?
async function getRecords({query, profileId}) {
  // Clone is done here to prevent Vue from calling the function multiple times
  // due to "query" being set inside of a computed function.
  const vprQuery = JSON.parse(JSON.stringify(query));

  // convert VPR query into local queries...
  const credentialStore = await getCredentialStore({
    // FIXME: determine how password will be provided / set; currently
    // set to `profileId`
    // FIXME: this code shouldn't be called in a component anyway
    profileId, password: profileId
  });

  // FIXME: all code here assumes a single `credentialQuery`
  const type = vprQuery.credentialQuery.example.type;
  const records = [];
  if(type.includes('OverAgeTokenCredential')) {
    // query for *only* the over age token credential
    vprQuery.credentialQuery.example.type = 'OverAgeTokenCredential';
    const {queries: [q]} = await credentialStore.local.convertVPRQuery({
      vprQuery
    });
    const {documents: results} = await credentialStore.local.find({
      // only return 1 over age token
      query: q, limit: 1
    });
    // adds only the first OverAgeTokenCredential to records array
    records.push(results[0]);

    // remove local credential from type in query and restore its value
    const index = type.indexOf('OverAgeTokenCredential');
    type.splice(index, 1);
    vprQuery.credentialQuery.example.type = type;
  }
  if(vprQuery.credentialQuery.example.type.length === 0) {
    return records;
  }
  const {queries: [q]} = await credentialStore.remote.convertVPRQuery({
    vprQuery
  });
  const {documents: results} = await credentialStore.remote.find({query: q});
  records.push(...results);
  return records;
}

// FIXME: move elsewhere?
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
