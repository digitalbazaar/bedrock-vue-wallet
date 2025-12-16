<template>
  <q-page class="row justify-center q-pa-md">
    <div class="col-md-8 col-xs-12">
      <!-- Header -->
      <div class="q-mb-lg">
        <div class="text-h5 text-weight-bold q-mb-xs">
          Payments
        </div>
        <div class="text-body2 text-grey-7">
          Manage your payment methods for retail transactions.
        </div>
      </div>

      <!-- Payment Methods Section -->
      <payment-methods-list
        :profile-id="activeProfileId"
        :rpc-url="rpcUrl" />
    </div>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, onMounted, ref} from 'vue';
import {config} from '@bedrock/web';
import PaymentMethodsList from '../components/PaymentMethodsList.vue';
import {profileManager} from '@bedrock/web-wallet';

export default {
  name: 'PaymentPage',
  components: {
    PaymentMethodsList
  },
  props: {
    account: {
      type: String,
      default: undefined
    }
  },
  setup() {
    const activeProfileId = ref('');

    const rpcUrl = computed(() => {
      return config?.vueWallet?.payments?.rpcUrl ||
        config?.vueWallet?.ethereum?.rpcUrl || '';
    });

    onMounted(async () => {
      try {
        const profiles = await profileManager.getProfiles({useCache: true});
        if(profiles.length > 0) {
          activeProfileId.value = profiles[0].id;
        }
      } catch(e) {
        console.error('Failed to get active profile:', e);
      }
    });

    return {
      activeProfileId,
      rpcUrl
    };
  }
};
</script>

<style lang="scss" scoped>
</style>
