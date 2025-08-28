<template>
  <div ref="videoContainer">
    <ScannerUI
      :tip-text="tipText"
      :camera-list="cameraList"
      :camera-error="cameraError"
      :loading-camera="loadingCamera"
      @close="handleClose"
      @update-camera="updateCamera" />
  </div>
</template>

<script>
/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats}
  from 'html5-qrcode';
import {inject, onMounted, onUnmounted, ref} from 'vue';
import ScannerUI from './ScannerUI.vue';

export default {
  name: 'BarcodeScanner',
  components: {ScannerUI},
  props: {
    formatsToSupport: {
      type: Array,
      default: () => [Html5QrcodeSupportedFormats.PDF_417]
    },
    tipText: {
      type: String,
      default: ''
    }
  },
  emits: ['result', 'close'],
  setup(props, {emit}) {
    // Props
    const {formatsToSupport} = props;

    // Constants
    let scanner = null;

    // Refs
    const cameraList = ref([]);
    const cameraError = ref(null);
    const loadingCamera = ref(true);
    const videoContainer = ref(null);

    // Inject
    const injected = inject('selectedCameraId');

    // Lifecycle hooks
    onMounted(async () => {
      scanner = new Html5Qrcode(
        'dce-video-container', {
          fps: 60,
          formatsToSupport,
          useBarCodeDetectorIfSupported: true
        }
      );
      const availableCameras = await Html5Qrcode.getCameras();
      cameraList.value = availableCameras.map(c => {
        return {deviceId: c.id, label: c.label};
      });
      const defaultCameraConstraint = {facingMode: 'environment'};
      await scanner.start(
        injected?.selectedCameraId.value ?? defaultCameraConstraint,
        getCameraScanConfig(), onScanSuccess, onError
      );
      if(!injected?.selectedCameraId.value && cameraList.value.length) {
        const selectedCamera = scanner.getRunningTrackSettings()?.deviceId;
        injected?.updateSelectedCamera(selectedCamera);
      }
      loadingCamera.value = false;
    });

    onUnmounted(async () => {
      if(scanner) {
        const scannerState = await scanner.getState();
        if(scannerState == Html5QrcodeScannerState.SCANNING) {
          await scanner.stop();
        }
      }
    });

    // Helper functions
    function handleClose() {
      emit('close');
    }

    function onScanSuccess(decodedText, decodedResult) {
      const text = decodedText;
      const type = decodedResult?.result?.format?.formatName;
      console.log(
        'BarcodeScanner detected something:',
        decodedText ? decodedText : '<empty string>'
      );
      if(!type || !text) {
        return;
      }
      emit('result', {type, text});
    }

    async function updateCamera(deviceId) {
      if(!scanner || injected?.selectedCameraId.value === deviceId) {
        return;
      }
      const scannerState = await scanner.getState();
      if(scannerState == Html5QrcodeScannerState.SCANNING) {
        try {
          await scanner.stop();
        } catch(e) {
          console.error(e);
        }
      }
      await scanner.start(
        deviceId,
        getCameraScanConfig(),
        onScanSuccess,
        onError
      );
      injected?.updateSelectedCamera(
        cameraList.value.find(c => c.deviceId === deviceId).deviceId
      );
    }

    function onError(error) {
      console.error('BarcodeScanner error:', error);
    }

    function getCameraScanConfig() {
      // Was causing problems for MacOS continuity camera
      // (box showed up but with 0 height despite height being nonzero
      // as returned from this function)
      return {};
    }

    return {
      emit,
      cameraList,
      cameraError,
      handleClose,
      updateCamera,
      loadingCamera,
      videoContainer
    };
  }
};
</script>
