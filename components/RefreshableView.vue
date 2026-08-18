<template>
  <component
    :is="canPull ? 'QPullToRefresh' : 'div'"
    :class="canPull ? 'col-xs-12 column s-refreshable' : plainClass"
    :color="canPull ? color : undefined"
    @refresh="onPull">
    <slot :pullable="canPull" />
  </component>
</template>

<script>
/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {QPullToRefresh, useQuasar} from 'quasar';
import {computed} from 'vue';

// One element either way: `QPullToRefresh` where the gesture exists, a plain
// wrapper where it does not, so a caller's children keep the row context they
// were laid out in rather than gaining a level of nesting on one branch and
// not the other.
//
// The template is deliberately single-root, with no comment above it: a
// leading comment makes this a fragment component, which silently stops
// inheriting attributes a caller sets on it.
export default {
  name: 'RefreshableView',
  components: {
    // registered as the component itself, not resolved from a name string:
    // Quasar's build-time template scan cannot see a dynamic `:is`, and this
    // package is published to consumer apps whose Quasar setup it does not
    // control
    QPullToRefresh
  },
  props: {
    // async () => Promise. Called on pull. Reporting a failure is the
    // caller's, since only the caller knows what failed to refresh; this
    // component's job is to retract the spinner either way.
    refresh: {
      type: Function,
      required: true
    },
    // Whether this environment offers the gesture. Left undefined, it is the
    // narrow breakpoint, which is what the rest of this package means by
    // mobile. A caller with a better test -- an actual touch-capability
    // check, say -- can pass one, and a caller that wants to show a refresh
    // button where there is no gesture can read `pullable` off the slot.
    pullable: {
      type: Boolean,
      default: undefined
    },
    // classes for the non-gesture branch only. The gesture branch carries its
    // own, because they are what makes the pull area work rather than
    // anything about a particular caller's layout.
    plainClass: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: 'primary'
    }
  },
  emits: ['refresh-error'],
  setup(props, {emit}) {
    const $q = useQuasar();
    const canPull = computed(() => props.pullable ?? $q.screen.lt.sm);

    // `done` retracts the spinner and QPullToRefresh will not fire again
    // until it is called, so it has to run on the failing path too -- a
    // refresh that threw would otherwise leave the gesture spinning and dead.
    //
    // The rejection is caught rather than left to propagate: nothing awaits a
    // gesture handler, so re-raising it surfaces as an unhandled rejection and
    // not as anything a caller can act on. It is not swallowed either -- a
    // caller reporting its own failures has already handled it before this
    // runs, and one that does not gets an event and a logged error rather than
    // a refresh that quietly did nothing.
    async function onPull(done) {
      try {
        await props.refresh();
      } catch(e) {
        console.error('Refresh failed.', e);
        emit('refresh-error', e);
      } finally {
        done();
      }
    }

    return {canPull, onPull};
  }
};
</script>

<style lang="scss" scoped>
// The gesture zone has to cover the whole remaining viewport, not only the
// content, or dragging in the empty space below short content does nothing.
// `align-self: stretch` overrides the flex parent's `align-items` so this
// still fills the row when the content is short.
.s-refreshable {
  flex: 1 1 auto;
  align-self: stretch;
  min-height: 60vh;
  // flex items default to `min-width: auto`, so without this the zone
  // stretches to its widest un-wrapped child and takes the page sideways.
  // `clip` rather than `hidden`: `hidden` would force `overflow-y` to `auto`,
  // making this a second vertical scroll container that fights both the page
  // scroll and the pull gesture. `clip` creates no scroll box, so a child
  // that scrolls horizontally keeps doing so.
  min-width: 0;
  overflow-x: clip;

  // QPullToRefresh wraps its slot in a flex item of its own, and this is a
  // column flex container, so that item's cross size is its own max-content
  // width unless it is capped: an un-wrappable row of chips made it 616px
  // wide inside a 412px viewport, and every child measured against that
  // instead of the screen. The chips had nothing to scroll and ran off the
  // right edge, and a `col-xs-9` search field came out 462px rather than
  // 309px -- which is why nothing lined up.
  :deep(.q-pull-to-refresh__content) {
    min-height: inherit;
    min-width: 0;
    max-width: 100%;
  }
}
</style>
