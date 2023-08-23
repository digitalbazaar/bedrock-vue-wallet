<template>
  <div>
    <credentials
      :credentials="credentials"
      :profiles="profiles"
      :loading="loading"
      :error-text="errorText"
      @delete-credential="$event.waitUntil(deleteCredential($event))"
      @filtered-profiles="filteredProfiles = $event"
      @filtered-credentials-loading="loadingFilteredCredentials = $event"
      @refresh="getCredentials" />
    <install-credential-handler />
  </div>
</template>

<script>
import {
  ageCredentialHelpers,
  getCredentialStore,
  profileManager
} from '@bedrock/web-wallet';
import {computed, ref, toRef, watch} from 'vue';
import {computedAsync} from '@vueuse/core';
import Credentials from '../components/Credentials.vue';
import InstallCredentialHandler
  from '../components/InstallCredentialHandler.vue';

export default {
  name: 'HomePage',
  components: {
    Credentials,
    InstallCredentialHandler
  },
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  setup(props) {
    const accountId = toRef(props, 'account');
    const errorText = ref('');

    const loadingProfiles = ref(true);
    const profiles = computedAsync(async () => {
      if(accountId.value) {
        try {
          const profiles = await profileManager.getProfiles({useCache: true});
          errorText.value = '';
          return profiles;
        } catch(e) {
          console.log('Error: ', e);
          errorText.value = 'Could not retrieve your profile. Please ' +
            'refresh the page to try again.';
        }
      }
      return [];
    }, [], loadingProfiles);

    const filteredProfiles = ref([]);
    const loadingFilteredCredentials = ref(true);

    const shownProfiles = computed(() =>
      filteredProfiles.value.length === 0 ?
        profiles.value : filteredProfiles.value);

    const credentials = ref([]);
    const loadingCredentials = ref(true);

    const getCredentials = async () => {
      try {
        loadingCredentials.value = true;
        // FIXME: do not get ALL of a user's credentials when they load
        // their home page; figure out how to simplify this and not pull down
        // unnecessary data (this behavior was preserved during refactoring
        // but it should be changed)
        const vcs = [];
        for(const {id: profileId} of shownProfiles.value) {
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
            vcs.push({credential: doc.content, meta: doc.meta});
          }
          for(const doc of remoteResults.documents) {
            vcs.push({credential: doc.content, meta: doc.meta});
          }
        }
        credentials.value = vcs;
        errorText.value = '';
      } catch(e) {
        console.log('Error: ', e);
        errorText.value =
          'Could not retrieve your credentials. Please refresh the page to ' +
          'try again.';
      } finally {
        loadingCredentials.value = false;
      }
    };

    const deleteCredential = async ({profileId, credentialId}) => {
      const credentialStore = await getCredentialStore({
        // FIXME: determine how password will be provided / set; currently
        // set to `profileId`
        profileId, password: profileId
      });

      // delete credential
      await credentialStore.delete({id: credentialId});

      // success, reload credentials
      await getCredentials();
    };

    watch(
      () => shownProfiles.value,
      () => getCredentials());

    const loading = computed(() =>
      loadingFilteredCredentials.value ||
      loadingCredentials.value ||
      loadingProfiles.value);

    return {
      credentials,
      deleteCredential,
      errorText,
      filteredProfiles,
      getCredentials,
      loading,
      loadingCredentials,
      loadingFilteredCredentials,
      profiles
    };
  }
};
</script>

<style scoped>
</style>
