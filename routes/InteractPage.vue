<template>
  <q-page
    class="row justify-center q-pa-md">
    <div class="col-md-9 col-xs-12">
      <br-q-title-card
        title="Interact"
        class="full-width">
        <div
          slot="body">
          <interact />
        </div>
        <div
          slot="icon">
          <q-btn
            flat
            round
            dense
            class="absolute-right q-ma-xs"
            style="height: 34px"
            @click.native="help = true">
            <q-icon
              name="far fa-question-circle"
              size="xs"
              color="grey-8" />
          </q-btn>
        </div>
      </br-q-title-card>
    </div>
    <br-q-modal
      v-if="help"
      title="Interact Help"
      :value="help"
      bottom-separator
      full-width-buttons
      accept-label="Done"
      @accept="help = false"
      @input="help = $event">
      <div class="column">
        <p class="text-left">
          Interact allows you to digitally interact with a place you are
          currently in. Please do the following steps:
        </p>
        <ol>
          <li>
            <p class="text-left">
              Show the QR code to start your interaction. An individual will
              then scan the code and you will see your screen update providing
              you with a link to a webpage to continue the interaction.
            </p>
          </li>
          <li>
            <p class="text-left">
              You will then click on the link and you will be redirected to
              the webpage. You will then be able interact via the webpage you
              have just been redirected to.
            </p>
          </li>
        </ol>
      </div>
    </br-q-modal>
  </q-page>
</template>

<script>
/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import Interact from '../components/Interact.vue';
import {BrQModal, BrQTitleCard} from '@bedrock/quasar-components';

export default {
  name: 'InteractPage',
  components: {
    Interact,
    BrQTitleCard,
    BrQModal
  },
  data() {
    return {
      help: false
    };
  },
};
</script>

<style lang="scss" scoped>
</style>
