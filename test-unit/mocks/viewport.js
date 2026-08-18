/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {Screen} from 'quasar';

// The components read the breakpoint through `$q.screen.lt.sm`, which compares
// the measured viewport against Quasar's `sm` size. jsdom reports a fixed
// window width and does not resize, so these move the boundary relative to
// whatever Quasar measured rather than trying to resize the window: `lt.sm` is
// `width < sizes.sm`, so a boundary one pixel above the measured width is
// unambiguously mobile and a boundary at the measured width is not.

export function setMobileViewport() {
  Screen.setSizes({sm: Screen.width + 1});
}

export function setDesktopViewport() {
  Screen.setSizes({sm: Screen.width});
}
