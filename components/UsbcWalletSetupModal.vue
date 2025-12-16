<template>
  <q-card
    flat
    class="q-pa-md"
    style="border-radius: 12px; width: 400px; max-width: 95vw;">
    <!-- Header -->
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">
        <q-icon
          name="fa fa-wallet"
          color="primary"
          class="q-mr-sm" />
        Add USBC Wallet
      </div>
      <q-space />
      <q-btn
        v-close-popup
        flat
        round
        dense
        icon="fa fa-times" />
    </q-card-section>

    <q-separator class="q-my-md" />

    <q-card-section>
      <!-- Choose action -->
      <div v-if="step === 'choose'">
        <p class="text-body2 text-grey-7 q-mb-md">
          A USBC wallet lets you make digital currency payments at
          participating retailers.
        </p>

        <div class="column q-gutter-sm">
          <q-btn
            no-caps
            unelevated
            color="dark"
            icon="fa fa-plus"
            label="Create new wallet"
            class="full-width"
            @click="onGenerateNew" />
          <q-btn
            no-caps
            outline
            color="grey-5"
            icon="fa fa-upload"
            label="Import existing wallet (Coming soon)"
            class="full-width"
            disable />
        </div>
      </div>

      <!-- Generate - Show mnemonic -->
      <div v-else-if="step === 'generate'">
        <q-banner
          dense
          rounded
          class="bg-warning text-white q-mb-md">
          <template #avatar>
            <q-icon name="fa fa-exclamation-triangle" />
          </template>
          Write down these 12 words and store them safely.
          They are the only way to recover your wallet.
        </q-banner>

        <div
          class="mnemonic-container q-pa-md q-mb-md bg-grey-2 rounded-borders">
          <div class="row q-gutter-sm">
            <!-- mnemonic words -->
            <div
              v-for="(word, index) in mnemonicWords"
              :key="index"
              class="col-3">
              <span class="text-grey-6">{{index + 1}}.</span>
              <span class="text-weight-medium q-ml-xs">{{word}}</span>
            </div>
          </div>
        </div>

        <q-btn
          flat
          no-caps
          color="dark"
          icon="fa fa-copy"
          label="Copy recovery phrase"
          class="q-mb-md"
          @click="copyMnemonic" />

        <q-checkbox
          v-model="confirmedBackup"
          label="I have written down my recovery phrase"
          class="q-mb-md" />

        <div class="row q-gutter-sm">
          <q-btn
            flat
            no-caps
            label="Back"
            color="dark"
            @click="reset" />
          <q-space />
          <q-btn
            no-caps
            unelevated
            color="dark"
            label="Create wallet"
            :disable="!confirmedBackup"
            :loading="loading"
            @click="onConfirmGenerate" />
        </div>
      </div>

      <!-- Import - Enter mnemonic -->
      <div v-else-if="step === 'import'">
        <p class="text-body2 text-grey-7 q-mb-md">
          Enter your 12 or 24 word recovery phrase:
        </p>

        <q-input
          v-model="importMnemonic"
          type="textarea"
          outlined
          autogrow
          placeholder="word1 word2 word3 ..."
          :error="importError !== null"
          :error-message="importError"
          class="q-mb-md"
          @update:model-value="importError = null" />

        <div class="row q-gutter-sm">
          <q-btn
            flat
            no-caps
            label="Back"
            color="dark"
            @click="reset" />
          <q-space />
          <q-btn
            no-caps
            unelevated
            color="dark"
            label="Import wallet"
            :loading="loading"
            @click="onImport" />
        </div>
      </div>

      <!-- Success -->
      <div v-else-if="step === 'success'">
        <div class="text-center q-mb-md">
          <q-icon
            name="fa fa-check-circle"
            color="positive"
            size="4em" />
        </div>

        <div class="text-h6 text-center q-mb-sm">
          Wallet added!
        </div>

        <p class="text-body2 text-grey-7 text-center q-mb-md">
          Your USBC wallet is ready to use for payments.
        </p>

        <div class="q-mb-md">
          <div class="text-caption text-grey q-mb-xs">
            Wallet address
          </div>
          <q-input
            :model-value="walletAddress"
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
                @click="copyAddress">
                <q-tooltip>Copy address</q-tooltip>
              </q-btn>
            </template>
          </q-input>
        </div>

        <q-btn
          v-close-popup
          no-caps
          unelevated
          color="dark"
          label="Done"
          class="full-width"
          @click="$emit('complete', walletAddress)" />
      </div>
    </q-card-section>

    <!-- Loading overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-gears
        size="50px"
        color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref} from 'vue';
import {ethereum} from '@bedrock/web-wallet';
// import {Mnemonic} from 'ethers';
import {useQuasar} from 'quasar';

export default {
  name: 'UsbcWalletSetupModal',
  props: {
    profileId: {
      type: String,
      required: true
    }
  },
  emits: ['complete', 'cancel'],
  setup(props) {
    const $q = useQuasar();

    // State
    const step = ref('choose');
    const loading = ref(false);
    const mnemonic = ref('');
    const importMnemonic = ref('');
    const importError = ref(null);
    const confirmedBackup = ref(false);
    const walletAddress = ref('');

    // Computed
    const mnemonicWords = computed(() => {
      return mnemonic.value ? mnemonic.value.split(' ') : [];
    });

    // Methods
    function reset() {
      step.value = 'choose';
      mnemonic.value = '';
      importMnemonic.value = '';
      importError.value = null;
      confirmedBackup.value = false;
    }

    function onGenerateNew() {
      mnemonic.value = ethereum.generateMnemonic();
      step.value = 'generate';
    }

    async function onConfirmGenerate() {
      loading.value = true;
      try {
        const wallet = ethereum.walletFromMnemonic({
          mnemonic: mnemonic.value
        });

        // Get the EDV client first
        const {edvClient} = await ethereum.getEthereumEdv({
          profileId: props.profileId
        });

        console.log('Storing wallet with address:', wallet.address);

        const result = await ethereum.storeKey({
          edvClient,
          address: wallet.address,
          privateKey: wallet.privateKey,
          publicKey: wallet.publicKey,
          derivationPath: wallet.derivationPath,
          mnemonic: wallet.mnemonic
        });

        console.log('Wallet stored successfully:', result);

        walletAddress.value = wallet.address;
        step.value = 'success';
      } catch(e) {
        console.error('Failed to create wallet:', e);
        $q.notify({
          type: 'negative',
          message: 'Failed to create wallet. Please try again.'
        });
      } finally {
        loading.value = false;
      }
    }

    // TODO: FIXME for the future - Disabled Import feature for the demo.
    // async function onImport() {
    //   const phrase = importMnemonic.value.trim().toLowerCase();

    //   if(!Mnemonic.isValidMnemonic(phrase)) {
    //     importError.value =
    //       'Invalid recovery phrase. Please check your words and try again.';
    //     return;
    //   }

    //   loading.value = true;
    //   try {
    //     const wallet = ethereum.walletFromMnemonic({mnemonic: phrase});

    //     const edvClient =
    //       await ethereum.getEthereumEdv({profileId: props.profileId});

    //     await ethereum.storeKey({
    //       edvClient,
    //       address: wallet.address,
    //       privateKey: wallet.privateKey,
    //       publicKey: wallet.publicKey,
    //       derivationPath: wallet.derivationPath,
    //       mnemonic: phrase
    //     });

    //     walletAddress.value = wallet.address;
    //     step.value = 'success';
    //   } catch(e) {
    //     console.error('Failed to import wallet:', e);
    //     importError.value = 'Failed to import wallet. Please try again.';
    //   } finally {
    //     loading.value = false;
    //   }
    // }

    function copyAddress() {
      navigator.clipboard.writeText(walletAddress.value);
      $q.notify({
        type: 'positive',
        message: 'Address copied to clipboard',
        timeout: 1500
      });
    }

    async function copyMnemonic() {
      try {
        await navigator.clipboard.writeText(mnemonic.value);
        $q.notify({type: 'positive', message: 'Recovery phrase copied!'});
      } catch(e) {
        $q.notify({type: 'negative', message: 'Failed to copy'});
      }
    }

    return {
      step,
      loading,
      mnemonic,
      mnemonicWords,
      importMnemonic,
      importError,
      confirmedBackup,
      walletAddress,
      reset,
      onGenerateNew,
      onConfirmGenerate,
      // onImport,
      copyAddress,
      copyMnemonic
    };
  }
};
</script>

<style lang="scss" scoped>
.mnemonic-container {
  font-family: monospace;
  font-size: 14px;
}

.address-input :deep(input) {
  font-family: monospace;
  font-size: 12px;
}
</style>
