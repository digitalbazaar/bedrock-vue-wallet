<template>
  <div class="payment-methods-list">
    <!-- Section Card -->
    <q-card
      flat
      bordered
      class="rounded-borders">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-xs">
          Payment methods
        </div>
        <div class="text-body2 text-grey-7">
          Add and manage your payment methods using our secure payment system.
        </div>
      </q-card-section>

      <q-separator />

      <!-- Loading state -->
      <q-card-section v-if="loading">
        <div class="text-center q-pa-md">
          <q-spinner-tail
            color="primary"
            size="2em" />
          <div class="q-mt-sm text-grey">
            Loading payment methods...
          </div>
        </div>
      </q-card-section>

      <!-- Payment methods list -->
      <q-list
        v-else
        separator>
        <!-- Empty state -->
        <q-item v-if="paymentMethods.length === 0">
          <q-item-section class="text-center q-pa-lg">
            <q-icon
              name="fa fa-wallet"
              size="3em"
              color="grey-4"
              class="q-mb-md" />
            <div class="text-body1 text-grey-7">
              No payment methods
            </div>
            <div class="text-caption text-grey-6">
              Add a payment method to get started.
            </div>
          </q-item-section>
        </q-item>

        <!-- Payment method cards -->
        <payment-method-card
          v-for="method in paymentMethods"
          :key="method.id"
          :payment-method="method"
          @view-details="onViewDetails(method)"
          @remove="onRemove(method)" />
      </q-list>

      <q-separator />

      <!-- Add payment method button -->
      <q-card-section>
        <q-btn
          no-caps
          unelevated
          color="dark"
          icon="fa fa-plus"
          label="Add payment method"
          @click="showAddDialog = true" />
      </q-card-section>
    </q-card>

    <!-- Add Payment Method Dialog -->
    <q-dialog v-model="showAddDialog">
      <add-payment-method-modal
        @select="onSelectPaymentType"
        @close="showAddDialog = false" />
    </q-dialog>

    <!-- USBC Wallet Setup Dialog -->
    <q-dialog v-model="showUsbcSetup">
      <usbc-wallet-setup-modal
        :profile-id="profileId"
        @complete="onWalletSetupComplete"
        @cancel="showUsbcSetup = false" />
    </q-dialog>

    <!-- USBC Wallet Details Dialog -->
    <q-dialog v-model="showUsbcDetails">
      <usbc-wallet-details-modal
        v-if="selectedMethod"
        :profile-id="profileId"
        :address="selectedMethod.address"
        :rpc-url="rpcUrl"
        @close="showUsbcDetails = false"
        @deleted="onWalletDeleted" />
    </q-dialog>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {nextTick, onMounted, ref, watch} from 'vue';
import AddPaymentMethodModal from './AddPaymentMethodModal.vue';
import {ethereum} from '@bedrock/web-wallet';
import PaymentMethodCard from './PaymentMethodCard.vue';
import UsbcWalletDetailsModal from './UsbcWalletDetailsModal.vue';
import UsbcWalletSetupModal from './UsbcWalletSetupModal.vue';
import {useQuasar} from 'quasar';

export default {
  name: 'PaymentMethodsList',
  components: {
    AddPaymentMethodModal,
    PaymentMethodCard,
    UsbcWalletDetailsModal,
    UsbcWalletSetupModal
  },
  props: {
    profileId: {
      type: String,
      required: true
    },
    rpcUrl: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const $q = useQuasar();

    // State
    const loading = ref(false);
    const paymentMethods = ref([]);
    const showAddDialog = ref(false);
    const showUsbcSetup = ref(false);
    const showUsbcDetails = ref(false);
    const selectedMethod = ref(null);

    // Load all payment methods
    async function loadPaymentMethods() {
      if(!props.profileId) {
        return;
      }

      loading.value = true;
      try {
        // Load USBC wallets
        const {edvClient} =
          await ethereum.getEthereumEdv({profileId: props.profileId});
        // console.log('PML: edvClient - ', edvClient);
        // Log the EDV details
        console.log('EDV ID:', edvClient.id);

        const docs = await ethereum.listKeys({edvClient});
        console.log('Documents found:', docs.length);
        console.log('Documents:', JSON.stringify(docs, null, 2));

        const usbcWallets = docs.map(doc => ({
          id: doc.id,
          type: 'usbc-wallet',
          typeLabel: 'USBC Wallet',
          icon: 'fa fa-wallet',
          iconColor: 'primary',
          displayValue: shortenAddress(doc.content.address),
          address: doc.content.address,
          ...doc.content
        }));

        // TODO: Load other payment types here in the future.
        // const creditCards = await loadCreditCards();

        paymentMethods.value = [
          ...usbcWallets
        ];
      } catch(e) {
        console.error('Failed to load payment methods:', e);
        paymentMethods.value = [];
      } finally {
        loading.value = false;
      }
    }

    function shortenAddress(address) {
      if(!address) {
        return '';
      }
      return `${address.slice(0, 6)}... ${address.slice(-4)}`;
    }

    async function onSelectPaymentType(type) {
      showAddDialog.value = false;

      await nextTick();

      if(type === 'usbc-wallet') {
        showUsbcSetup.value = true;
      } else {
        $q.notify({
          type: 'info',
          message: 'This payment method is coming soon!'
        });
      }
    }

    function onWalletSetupComplete() {
      showUsbcSetup.value = false;
      loadPaymentMethods();
    }

    function onViewDetails(method) {
      selectedMethod.value = method;

      if(method.type === 'usbc-wallet') {
        showUsbcDetails.value = true;
      }
    }

    function onRemove(method) {
      onViewDetails(method);
    }

    function onWalletDeleted() {
      showUsbcDetails.value = false;
      selectedMethod.value = null;
      loadPaymentMethods();
    }

    watch(() => props.profileId, () => {
      loadPaymentMethods();
    });

    onMounted(() => {
      loadPaymentMethods();
    });

    return {
      loading,
      paymentMethods,
      showAddDialog,
      showUsbcSetup,
      showUsbcDetails,
      selectedMethod,
      onSelectPaymentType,
      onWalletSetupComplete,
      onViewDetails,
      onRemove,
      onWalletDeleted
    };

  }
};
</script>

<style lang="scss" scoped>
.payment-methods-list {
  max-width: 600px;
}
</style>
