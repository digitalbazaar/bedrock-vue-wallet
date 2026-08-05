<template>
  <div
    class="s-pull-to-refresh"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend.passive="onTouchEnd"
    @touchcancel.passive="onTouchEnd">
    <div
      class="s-pull-content"
      :class="{'s-pull-settling': !dragging}"
      :style="{transform: `translateY(${pull}px)`}">
      <slot />
    </div>
    <div
      class="s-pull-indicator row justify-center"
      :style="indicatorStyle">
      <q-spinner-ios
        color="primary"
        size="28px" />
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref} from 'vue';

// how far the content can be dragged, how far it must be dragged to refresh,
// and where it rests while refreshing -- all in CSS pixels
const MAX_PULL = 96;
const TRIGGER_DISTANCE = 64;
const REFRESH_OFFSET = 56;
// the content follows the finger at half speed, which reads as resistance
// and keeps a long drag from tearing the list off the top of the screen
const DAMPING = 0.5;

export default {
  name: 'PullToRefresh',
  emits: ['refresh'],
  setup(props, {emit}) {
    const pull = ref(0);
    const dragging = ref(false);
    const refreshing = ref(false);

    let startX = 0;
    let startY = 0;
    // a drag only becomes a pull once it is clearly vertical and downward;
    // until then the browser keeps the gesture so scrolling still works
    let engaged = false;
    let eligible = false;

    const progress = computed(
      () => Math.min(pull.value / TRIGGER_DISTANCE, 1));

    const indicatorStyle = computed(() => ({
      opacity: refreshing.value ? 1 : progress.value,
      transform: `scale(${0.6 + (0.4 * progress.value)})`
    }));

    // the gesture must not fight the list's own scrolling, so a pull is only
    // possible when whatever would scroll is already at its top
    const atScrollTop = target => {
      let node = target;
      while(node && node.nodeType === Node.ELEMENT_NODE) {
        const {overflowY} = window.getComputedStyle(node);
        const scrolls = overflowY === 'auto' || overflowY === 'scroll';
        if(scrolls && node.scrollHeight > node.clientHeight) {
          return node.scrollTop <= 0;
        }
        node = node.parentNode;
      }
      return (window.scrollY ?? 0) <= 0;
    };

    const onTouchStart = event => {
      eligible = false;
      engaged = false;
      if(refreshing.value || event.touches.length !== 1) {
        return;
      }
      const [touch] = event.touches;
      startX = touch.clientX;
      startY = touch.clientY;
      eligible = atScrollTop(event.target);
    };

    const onTouchMove = event => {
      if(!eligible || event.touches.length !== 1) {
        return;
      }
      const [touch] = event.touches;
      const dy = touch.clientY - startY;
      if(!engaged) {
        // a mostly-horizontal or upward drag belongs to the page, not here
        if(Math.abs(touch.clientX - startX) > Math.abs(dy) || dy <= 0) {
          eligible = false;
          return;
        }
        engaged = true;
        dragging.value = true;
      }
      // hold the gesture so the page does not scroll under the pull
      event.preventDefault();
      pull.value = Math.min(dy * DAMPING, MAX_PULL);
    };

    const onTouchEnd = () => {
      if(!engaged) {
        eligible = false;
        return;
      }
      engaged = false;
      eligible = false;
      dragging.value = false;
      if(pull.value < TRIGGER_DISTANCE) {
        pull.value = 0;
        return;
      }
      refreshing.value = true;
      pull.value = REFRESH_OFFSET;
      emit('refresh', () => {
        refreshing.value = false;
        pull.value = 0;
      });
    };

    return {
      dragging,
      indicatorStyle,
      onTouchEnd,
      onTouchMove,
      onTouchStart,
      pull,
      refreshing
    };
  }
};
</script>

<style lang="scss" scoped>
.s-pull-to-refresh {
  position: relative;
}

.s-pull-content {
  will-change: transform;
  // as a flex item this defaults to `min-width: auto`, so any un-wrappable
  // content inside (e.g. a horizontally scrolling chip band) would stretch it
  // past the viewport instead of scrolling within it. `max-width` is the part
  // that actually caps it -- `min-width: 0` alone leaves the used width to
  // content when the item is stretched on the cross axis
  min-width: 0;
  max-width: 100%;
}

// only animate back to rest; while a finger is down the content must track it
// exactly, or the pull feels laggy
.s-pull-settling {
  transition: transform 250ms cubic-bezier(0.25, 0.8, 0.5, 1);
}

.s-pull-indicator {
  position: absolute;
  top: 14px;
  left: 0;
  right: 0;
  pointer-events: none;
  transition: opacity 150ms linear;
}
</style>
