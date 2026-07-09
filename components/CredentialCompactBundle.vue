<template>
  <div>
    <div
      v-for="(record, index) in filteredCredentialRecords"
      :key="index"
      class="q-my-sm q-gutter-y-sm column">
      <slot
        name="credential-switch"
        :record="record"
        :credential="getCredential(record)">
        <credential-switch
          class="q-ma-xs col"
          :expandable="true"
          :credential="getCredential(record)" />
      </slot>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2026 Digital Bazaar, Inc.
 */
import {computedAsync} from '@vueuse/core';
import {CredentialSwitch} from '@bedrock/vue-vc';
import {toRef} from 'vue';

export default {
  name: 'CredentialCompactBundle',
  components: {
    CredentialSwitch
  },
  props: {
    // FIXME: this can receive an array of credentials or an array of
    // credential records; the API should be cleaned up in the future with
    // names to match / whatever other refactoring is needed
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
    const filteredCredentialRecords = computedAsync(async () => {
      // map to credential records, creating false `meta.id` as needed
      const records = credentials.value.map(
        maybeRecord => _isCredentialRecord(maybeRecord) ?
          maybeRecord : {credential: maybeRecord, meta: {id: maybeRecord.id}});
      if(!store.value) {
        return records;
      }
      return createCompactBundledCredentials({records});
    }, []);
    return {filteredCredentialRecords, getCredential: _getCredential};
  }
};

// a "record" pairs a VC with storage metadata; recognize either known
// record shape (`{content, meta}` or `{credential, meta}`) vs. a plain VC
function _isCredentialRecord(maybeRecord) {
  return !!(maybeRecord?.meta &&
    (maybeRecord?.content || maybeRecord?.credential));
}

// extract the VC from a record of either recognized shape
function _getCredential(record) {
  return record.content ?? record.credential;
}

// FIXME: refactor and use config
const hiddenCredentialTypes = new Map([
  ['PersonalPhotoCredential', true],
  ['OverAgeTokenCredential', true],
  ['AgeVerificationCredential', true]
]);

/*
// FIXME unused currently
const bundleCredentialTypes = new Map([
  ['AgeVerificationContainerCredential', true]
]);
*/

// FIXME: refactor and move elsewhere
async function createCompactBundledCredentials({records}) {
  const recordsList = [];
  const visibleRecords = JSON.parse(JSON.stringify(records))
    .filter(record => {
      return !_hasTypeIn({
        credential: _getCredential(record), typeMap: hiddenCredentialTypes
      });
    });
  for(const record of visibleRecords) {
    const credential = _getCredential(record);
    if(credential.type.includes('AgeVerificationContainerCredential')) {
      credential.credentialSubject = await createAgeCredential({
        bundledCredentials: records.map(r => _getCredential(r))
      });
    }
    recordsList.push(record);
  }
  return recordsList;
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
