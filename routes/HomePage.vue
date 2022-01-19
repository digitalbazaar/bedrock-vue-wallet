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
import {getProfiles, credentialHelpers} from 'bedrock-web-wallet';
import {store} from 'bedrock-web-store';

const {getAllDisplayableCredentials} = credentialHelpers;

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
    this.rootData = store.get({id: 'rootData'});
    this.rootData.updateCredentials = false;
  },
  asyncComputed: {
    profiles: {
      async get() {
        const {account: accountId} = this;
        if(accountId) {
          try {
            const profiles = await getProfiles();
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
        // get remote, get local, get refresh
        this.credentials = await getAllDisplayableCredentials(profiles);
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
