<template>
  <q-page
    class="row justify-center q-pa-md">
    <div class="col-md-9 col-xs-12">
      <br-q-title-card
        title="Profiles"
        class="full-width">
        <div
          slot="body">
          <profiles />
        </div>
      </br-q-title-card>
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQTitleCard} from '@bedrock/quasar-components';
import Profiles from '../components/Profiles.vue';

export default {
  name: 'ProfilesPage',
  components: {
    Profiles,
    BrQTitleCard
  }
};
</script>

<style lang="scss" scoped>
</style>
