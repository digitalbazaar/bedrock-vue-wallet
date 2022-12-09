<template>
  <div>
    <div
      v-for="(credential, index) in filteredCredentials"
      :key="index"
      style="width: 100%;"
      class="q-my-sm q-gutter-y-sm column">
      <credential-switch
        class="q-ma-xs col"
        :expandable="true"
        :credential="credential" />
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {computedAsync} from '@vueuse/core';
import {CredentialSwitch} from '@bedrock/vue-vc';
import {toRef} from 'vue';

export default {
  name: 'CredentialsList',
  components: {
    CredentialSwitch,
  },
  props: {
    // FIXME: ideally the full credential record would be passed to this
    // component in the future to enable access to `meta.id` for credentials
    // that do not have a direct `id` property
    credentials: {
      default: () => [],
      type: Array,
      required: false
    },
    schemaMap: {
      type: Object,
      required: true
    },
    store: {
      type: Boolean,
      required: true
    }
  },
  setup(props) {
    const credentials = toRef(props, 'credentials');
    const store = toRef(props, 'store');
    const filteredCredentials = computedAsync(async () => {
      if(!store.value) {
        return credentials.value;
      }
      return createCompactBundledCredentials({credentials: credentials.value});
    }, []);
    return {
      filteredCredentials
    };
  }
};

// FIXME: refactor and use config
const hiddenCredentialTypes = new Map([
  ['PersonalPhotoCredential', true],
  ['OverAgeTokenCredential', true],
  ['AgeVerificationCredential', true]
]);
const bundleCredentialTypes = new Map([
  ['AgeVerificationContainerCredential', true]
]);

// FIXME: refactor and move elsewhere
async function createCompactBundledCredentials({credentials}) {
  const credentialsList = [];
  const visibleCredentials = JSON.parse(JSON.stringify(credentials))
    .filter(credential => {
      return !_hasTypeIn({credential, typeMap: hiddenCredentialTypes});
    });
  for(const credential of visibleCredentials) {
    if(credential.type.includes('AgeVerificationContainerCredential')) {
      credential.credentialSubject = await createAgeCredential({
        bundledCredentials: credentials
      });
    }
    credentialsList.push(credential);
  }
  return credentialsList;
}

// FIXME: move elsewhere and refactor to make code avoid doing extra work
async function createAgeCredential({bundledCredentials}) {
  const newCredentialSubject = {};
  let tokenCount = 0;
  for(const credential of bundledCredentials) {
    if(credential.type.includes('OverAgeTokenCredential')) {
      tokenCount += 1;
      continue;
    }
    if(credential.type.includes('PersonalPhotoCredential')) {
      newCredentialSubject.image = credential.credentialSubject.image;
      continue;
    }
    if(credential.type.includes('AgeVerificationCredential')) {
      newCredentialSubject.overAge = credential.credentialSubject
        .overAge;
      continue;
    }
  }
  newCredentialSubject.concealedIdTokenCount = tokenCount;
  return newCredentialSubject;
}

function _hasTypeIn({credential, typeMap}) {
  return credential.type.find(credType => typeMap.has(credType));
}
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
</style>
