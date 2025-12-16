<template>
  <q-card
    flat
    class="add-payment-modal"
    style="border-radius: 12px; min-width: 350px; max-width: 95vw;">
    <!-- Header -->
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">
        Add payment method
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

    <q-card-section class="text-body2 text-grey-7">
      Choose a payment method to add.
    </q-card-section>

    <q-separator />

    <!-- Payment method options -->
    <q-list>
      <!-- USBC Wallet - Available -->
      <q-item
        v-ripple
        clickable
        @click="$emit('select', 'usbc-wallet')">
        <q-item-section avatar>
          <q-avatar
            color="primary"
            text-color="white"
            size="40px">
            <q-icon
              name="fa fa-wallet"
              size="20px" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">
            USBC Wallet
          </q-item-label>
          <q-item-label caption>
            Digital currency for retail payments
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon
            name="fa fa-chevron-right"
            color="grey" />
        </q-item-section>
      </q-item>

      <q-separator inset="item" />
      <!-- Credit/Debit Card - Coming Soon -->
      <q-item
        v-ripple
        clickable
        class="coming-soon-item"
        @click="$emit('select', 'credit-card')">
        <q-item-section avatar>
          <q-avatar
            color="grey-4"
            text-color="white"
            size="40px">
            <q-icon
              name="fa fa-credit-card"
              size="20px" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium text-grey-6">
            Credit or debit card
          </q-item-label>
          <q-item-label caption>
            Visa, Mastercard, American Express
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge
            color="grey-4"
            text-color="grey-7"
            label="Coming soon" />
        </q-item-section>
      </q-item>

      <q-separator inset="item" />

      <!-- Bank Account - Coming Soon -->
      <q-item
        v-ripple
        clickable
        class="coming-soon-item"
        @click="$emit('select', 'bank-account')">
        <q-item-section avatar>
          <q-avatar
            color="grey-4"
            text-color="white"
            size="40px">
            <q-icon
              name="fa fa-university"
              size="20px" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium text-grey-6">
            Bank account
          </q-item-label>
          <q-item-label caption>
            ACH direct debit
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge
            color="grey-4"
            text-color="grey-7"
            label="Coming soon" />
        </q-item-section>
      </q-item>

      <q-separator inset="item" />

      <!-- PayPal - Coming Soon -->
      <q-item
        v-ripple
        clickable
        class="coming-soon-item"
        @click="$emit('select', 'paypal')">
        <q-item-section avatar>
          <q-avatar
            color="grey-4"
            text-color="white"
            size="40px">
            <q-icon
              name="fa fa-paypal"
              size="20px" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium text-grey-6">
            PayPal
          </q-item-label>
          <q-item-label caption>
            Link your PayPal account
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge
            color="grey-4"
            text-color="grey-7"
            label="Coming soon" />
        </q-item-section>
      </q-item>
    </q-list>

    <q-card-section class="q-pt-none">
      <div class="text-caption text-grey-6 q-mt-sm">
        <q-icon
          name="fa fa-lock"
          size="xs"
          class="q-mr-xs" />
        Your payment information is encrypted and secure.
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'AddPaymentMethodModal',
  emits: ['select', 'close']
};
</script>

<style lang="scss" scoped>
.add-payment-modal {
  .coming-soon-item {
    opacity: 0.7;
  }
}
</style>
