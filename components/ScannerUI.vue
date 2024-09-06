<template>
  <div
    class="fixed-full bg-grey-10 q-mt-xl">
    <!-- Video Stream -->
    <div
      id="dce-video-container"
      class="dce-video-container fit" />

    <!-- Camera Error -->
    <div
      v-if="cameraError"
      class="absolute-top text-center q-mt-xl">
      <div
        class="row items-center justify-center">
        <q-icon
          color="red-12"
          name="fas fa-times"
          class="icon q-pa-lg" />
      </div>
      <div
        class="q-mt-md"
        style="max-width: 250px">
        There was an error loading your camera. Please refresh the page.
      </div>
    </div>

    <!-- Loading with Video Stream -->
    <div
      v-else
      class="fit">
      <!-- Spinners -->
      <div class="full-width">
        <div
          v-if="loadingCamera"
          name="cameraSpinner"
          class="text-center full-width">
          Loading...
        </div>
      </div>
      <div
        id="dce-video-container"
        class="dce-video-container fit" />
    </div>

    <!-- Tip Text -->
    <div
      v-if="tipText"
      ref="tipText"
      class="absolute-bottom text-white text-center full-width q-mb-xl">
      {{tipText}}
    </div>

    <!-- Close -->
    <q-btn
      flat
      fab
      :ripple="false"
      size="16px"
      :color="cameraError ? 'primary' : 'white'"
      icon="fas fa-times"
      class="q-ma-sm absolute-top-right"
      @click="handleClose" />

    <!-- Bottom buttons -->
    <q-btn-group
      class="absolute-bottom full-width"
      style="height: 50px; border-radius: 0;
        background-color: rgba(31, 41, 55, 0.7);"
      spread>
      <!-- Camera Button -->
      <q-btn-dropdown
        flat
        no-caps
        text-color="white"
        label="Camera"
        style="font-weight: 600"
        icon="fas fa-video"
        dropdown-icon="none"
        :disabled="loadingCamera">
        <q-list>
          <q-item
            v-for="camera in cameraList"
            :key="camera.deviceId"
            v-close-popup
            clickable
            @click="onChangeCamera(camera)">
            <q-item-section>
              <q-item-label>{{camera.label}}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </q-btn-group>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'ScannerUI',
  props: {
    tipText: {
      type: String,
      default: ''
    },
    cameraList: {
      type: Array,
      default: () => []
    },
    loadingCamera: {
      type: Boolean,
      default: false
    },
    cameraError: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'updateCamera', 'upload'],
  setup(_, {emit}) {
    const onChangeCamera = async camera => {
      emit('updateCamera', camera.deviceId);
    };

    function handleClose() {
      emit('close');
    }

    return {
      handleClose,
      onChangeCamera
    };
  }
};
</script>
