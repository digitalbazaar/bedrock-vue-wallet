<template>
  <q-page
    class="row justify-center q-pa-md">
    <div class="col-md-9 col-xs-12">
      <br-q-title-card
        title="Profiles"
        class="full-width">
        <template #body>
          <profile-dashboard />
        </template>
      </br-q-title-card>
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {BrQTitleCard} from '@bedrock/quasar-components';
import ProfileDashboard from '../components/ProfileDashboard.vue';

export default {
  name: 'ProfilesPage',
  components: {
    ProfileDashboard,
    BrQTitleCard
  }
};
</script>

<style lang="scss" scoped>
</style>
