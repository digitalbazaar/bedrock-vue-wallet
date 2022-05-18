<template>
  <div>
    <credentials
      :credentials="credentials"
      :profiles="profiles"
      :loading="loading"
      :error-text="errorText"
      @filtered-profiles="filteredProfiles = $event"
      @filtered-credentials-loading="loadingFilteredCredentials = $event" />
  </div>
</template>

<script>
import Credentials from '../components/Credentials.vue';
import {
  ageCredentialHelpers,
  getCredentialStore,
  profileManager
} from '@bedrock/web-wallet';
import {rootData} from '../lib/rootData.js';

export default {
  name: 'HomePage',
  components: {
    Credentials
  },
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {
      rootData: undefined,
      loadingFilteredCredentials: true,
      errorText: '',
      filteredProfiles: [],
      credentials: [],
      loadingCredentials: true
    };
  },
  computed: {
    loading() {
      return this.loadingFilteredCredentials ||
        this.loadingCredentials ||
        this.$asyncComputed.profiles.updating;
    }
  },
  watch: {
    profiles() {
      if(this.profiles && this.profiles.length > 0) {
        this.getCredentials();
      }
    },
    filteredProfiles() {
      this.getCredentials();
    },
    'rootData.updateCredentials': {
      handler(val) {
        if(val) {
          this.getCredentials();
        }
      },
      deep: true
    }
  },
  created() {
    this.rootData = rootData;
    this.rootData.updateCredentials = false;
  },
  asyncComputed: {
    profiles: {
      async get() {
        const {account: accountId} = this;
        if(accountId) {
          try {
            const profiles = await profileManager.getProfiles({useCache: true});
            this.errorText = '';
            return profiles;
          } catch(e) {
            console.log('Error: ', e);
            this.errorText = 'Could not retrieve your profile. Please ' +
              'refresh the page to try again.';
          }
          return [];
        }
      },
      default() {
        return [];
      },
      watch: ['$route']
    }
  },
  methods: {
    async getCredentials() {
      try {
        this.loadingCredentials = true;
        const profiles = this.filteredProfiles.length === 0 ?
          this.profiles : this.filteredProfiles;
        // FIXME: do not get ALL of a user's credentials when they load
        // their home page; figure out how to simplify this and not pull down
        // unnecessary data (this behavior was preserved during refactoring
        // but it should be changed)
        const credentials = [];
        for(const {id: profileId} of profiles) {
          // FIXME: determine how password will be provided / set; currently
          // set to `profileId`
          const credentialStore = await getCredentialStore({
            profileId, password: profileId
          });
          const [localResults, remoteResults] = await Promise.all([
            credentialStore.local.find({query: {displayable: true}}),
            credentialStore.remote.find({query: {displayable: true}}),
            ageCredentialHelpers.ensureLocalCredentials({credentialStore})
          ]);
          for(const doc of localResults.documents) {
            credentials.push({credential: doc.content, meta: doc.meta});
          }
          for(const doc of remoteResults.documents) {
            credentials.push({credential: doc.content, meta: doc.meta});
          }
        }
        this.credentials = credentials;
        this.errorText = '';
      } catch(e) {
        console.log('Error: ', e);
        this.errorText = 'Could not retrieve your credentials. Please ' +
          'refresh the page to try again.';
      } finally {
        this.loadingCredentials = false;
        this.rootData.updateCredentials = false;
      }
    }
  }
};
</script>

<style scoped>
</style>
