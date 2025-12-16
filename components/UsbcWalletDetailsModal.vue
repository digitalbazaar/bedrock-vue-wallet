<template>
  <q-card
    flat
    class="q-pa-md"
    style="border-radius: 12px; min-width: 380px; max-width: 95vw;">
    <!-- Header -->
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">
        USBC Wallet
      </div>
      <q-space />
      <q-btn
        v-close-popup
        flat
        round
        dense
        icon="fa fa-times"
        @click="$emit('close')" />
    </q-card-section>

    <q-separator class="q-my-md" />

    <!-- Loading -->
    <q-card-section v-if="loading">
      <div class="text-center q-pa-md">
        <q-spinner-tail
          color="primary"
          size="2em" />
      </div>
    </q-card-section>

    <!-- Content -->
    <q-card-section
      v-else-if="wallet"
      class="q-gutter-md">
      <!-- Address -->
      <div>
        <div class="text-caption text-grey q-mb-xs">
          Wallet address
        </div>
        <q-input
          :model-value="wallet.address"
          readonly
          outlined
          dense
          class="address-input">
          <template #append>
            <q-btn
              flat
              round
              dense
              icon="fa fa-copy"
              size="sm"
              @click="copyAddress">
              <q-tooltip>Copy address</q-tooltip>
            </q-btn>
          </template>
        </q-input>
      </div>

      <!-- Balance -->
      <div>
        <div class="text-caption text-grey q-mb-xs">
          Balance
        </div>
        <div class="text-h5 text-weight-bold">
          <q-spinner-dots
            v-if="loadingBalance"
            color="primary"
            size="1.5em" />
          <span v-else>{{formattedBalance}}</span>
        </div>
      </div>
    </q-card-section>

    <q-separator class="q-my-md" />

    <!-- Actions -->
    <q-card-section class="q-gutter-sm">
      <q-btn
        no-caps
        outline
        color="dark"
        icon="fa fa-key"
        label="View recovery phrase"
        class="full-width"
        @click="showExportDialog = true" />

      <q-btn
        no-caps
        flat
        color="negative"
        icon="fa fa-trash"
        label="Remove wallet"
        class="full-width"
        @click="showDeleteDialog = true" />
    </q-card-section>

    <!-- Export Recovery Phrase Dialog -->
    <q-dialog v-model="showExportDialog">
      <q-card
        flat
        style="border-radius: 12px; min-width: 350px;">
        <q-card-section>
          <div class="text-h6">
            Recovery phrase
          </div>
        </q-card-section>

        <q-card-section>
          <q-banner
            dense
            rounded
            class="bg-warning text-white q-mb-md">
            <template #avatar>
              <q-icon name="fa fa-exclamation-triangle" />
            </template>
            Never share your recovery phrase. Anyone with these words
            can access your funds.
          </q-banner>

          <div class="mnemonic-container q-pa-md bg-grey-2 rounded-borders">
            <div class="row q-gutter-sm">
              <div
                v-for="(word, index) in mnemonicWords"
                :key="index"
                class="col-3">
                <span class="text-grey-6">{{index + 1}}.</span>
                <span class="text-weight-medium q-ml-xs">{{word}}</span>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            no-caps
            label="Close"
            color="dark" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog">
      <q-card
        flat
        style="border-radius: 12px; min-width: 320px;">
        <q-card-section>
          <div class="text-h6">
            Remove wallet?
          </div>
        </q-card-section>

        <q-card-section>
          <p class="text-body2">
            This will remove the wallet from your account.
          </p>
          <q-banner
            dense
            rounded
            class="bg-orange text-white">
            <template #avatar>
              <q-icon name="warning" />
            </template>
            Make sure you have saved your recovery phrase before removing.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            no-caps
            label="Cancel"
            color="dark" />
          <q-btn
            flat
            no-caps
            label="Remove"
            color="negative"
            :loading="deleting"
            @click="deleteWallet" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, onMounted, ref} from 'vue';
import {ethereum} from '@bedrock/web-wallet';
import {useQuasar} from 'quasar';

export default {
  name: 'UsbcWalletDetailsModal',
  props: {
    profileId: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    rpcUrl: {
      type: String,
      default: ''
    }
  },
  emits: ['close', 'deleted'],
  setup(props, {emit}) {
    const $q = useQuasar();

    // State
    const loading = ref(false);
    const wallet = ref(null);
    const walletDocId = ref(null);
    const balance = ref(null);
    const loadingBalance = ref(false);
    const showExportDialog = ref(false);
    const showDeleteDialog = ref(false);
    const deleting = ref(false);

    // Computed
    const mnemonicWords = computed(() => {
      return wallet.value?.mnemonic?.split(' ') || [];
    });

    const formattedBalance = computed(() => {
      if(balance.value === null) {
        return '--';
      }
      if(balance.value === 'error') {
        return 'Unable to load';
      }
      const num = parseFloat(balance.value);
      if(num === 0) {
        return '0 USBC';
      }
      return `${num.toFixed(4)} USBC`;
    });

    // Methods
    async function loadWallet() {
      loading.value = true;
      try {
        const edvClient =
          await ethereum.getEthereumEdv({profileId: props.profileId});

        const doc = await ethereum.getKeyByAddress({
          edvClient,
          address: props.address
        });
        if(doc) {
          wallet.value = doc.content;
          walletDocId.value = doc.id;
        }
      } catch(e) {
        console.error('Failed to load wallet:', e);
        $q.notify({
          type: 'negative',
          message: 'Failed to load wallet details'
        });
      } finally {
        loading.value = false;
      }
    }
    // TODO: Fix me, ideally frontend should route the request
    // to bedrock-web-wallet and/or payment-portal for rpcUrl.
    // async function fetchBalance() {
    //   if(!props.rpcUrl || !props.address) {
    //     return;
    //   }

    //   loadingBalance.value = true;
    //   try {
    //     const provider = new ethers.JsonRpcProvider(props.rpcUrl);
    //     const balanceWei = await provider.getBalance(props.address);
    //     balance.value = ethers.formatEther(balanceWei);
    //   } catch(e) {
    //     console.error('Failed to fetch balance:', e);
    //     balance.value = 'error';
    //   } finally {
    //     loadingBalance.value = false;
    //   }
    // }

    function copyAddress() {
      navigator.clipboard.writeText(props.address);
      $q.notify({
        type: 'positive',
        message: 'Address copied',
        timeout: 1500
      });
    }

    async function deleteWallet() {
      if(!walletDocId.value) {
        $q.notify({
          type: 'negative',
          message: 'Cannot remove: wallet not found'
        });
        return;
      }

      deleting.value = true;
      try {
        const edvClient =
          await ethereum.getEthereumEdv({profileId: props.profileId});
        await ethereum.deleteKey({
          edvClient,
          id: walletDocId.value
        });

        $q.notify({
          type: 'positive',
          message: 'Wallet removed'
        });

        showDeleteDialog.value = false;
        emit('deleted');
      } catch(e) {
        console.error('Failed to delete wallet:', e);
        $q.notify({
          type: 'negative',
          message: 'Failed to remove wallet'
        });
      } finally {
        deleting.value = false;
      }
    }

    onMounted(() => {
      loadWallet();
      // fetchBalance();
    });

    return {
      loading,
      wallet,
      balance,
      loadingBalance,
      formattedBalance,
      mnemonicWords,
      showExportDialog,
      showDeleteDialog,
      deleting,
      copyAddress,
      deleteWallet
    };
  }
};
</script>

<style lang="scss" scoped>
.address-input :deep(input) {
  font-family: monospace;
  font-size: 11px;
}

.mnemonic-container {
  font-family: monospace;
  font-size: 13px;
}
</style>
