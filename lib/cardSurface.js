/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */

// the contrast the band and the card must reach before they read as separate
// surfaces. Measured as a ratio, not as a luminance difference: the same
// difference is far more visible at the dark end of the scale than the light
// end, so a fixed difference guaranteed nothing near white.
const MIN_SURFACE_CONTRAST = 1.5;

// how far a band is shifted per attempt when it sits too close to the card
const LIGHTNESS_STEP = 0.08;

// the luminance at which black and white contrast equally against a colour;
// above it black wins, below it white does. Not 0.5 -- contrast is not linear
// in luminance, and a 0.5 midpoint put white text on mid-tone bands at 2.5:1,
// under the 3:1 WCAG requires of a UI component.
const EQUAL_CONTRAST_LUMINANCE = 0.179;

// WCAG 1.4.11: a UI component must reach this against its background
const MIN_CHROME_CONTRAST = 3;

/**
 * Parses a CSS hex colour into rgb components in the 0-1 range.
 *
 * @param {string} color - A 3- or 6-digit hex colour.
 *
 * @returns {{r: number, g: number, b: number}|undefined} The components, or
 *   undefined when the colour cannot be parsed.
 */
function _parseHex(color) {
  if(typeof color !== 'string') {
    return undefined;
  }
  const hex = color.trim().replace(/^#/, '');
  const expanded = hex.length === 3 ?
    hex.split('').map(c => c + c).join('') :
    hex;
  if(!/^[0-9a-f]{6}$/i.test(expanded)) {
    return undefined;
  }
  return {
    r: parseInt(expanded.slice(0, 2), 16) / 255,
    g: parseInt(expanded.slice(2, 4), 16) / 255,
    b: parseInt(expanded.slice(4, 6), 16) / 255
  };
}

function _toHex({r, g, b}) {
  const channel = v => Math.round(Math.min(Math.max(v, 0), 1) * 255)
    .toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Relative luminance per WCAG 2.x, used to decide light vs dark and to measure
 * how far two surfaces sit apart.
 *
 * @param {string} color - A hex colour.
 *
 * @returns {number} Relative luminance from 0 (black) to 1 (white).
 */
export function getLuminance(color) {
  const rgb = _parseHex(color);
  if(!rgb) {
    // an unparseable colour is treated as white, which is the card default
    return 1;
  }
  const linear = v => v <= 0.03928 ?
    v / 12.92 :
    Math.pow((v + 0.055) / 1.055, 2.4);
  return (0.2126 * linear(rgb.r)) + (0.7152 * linear(rgb.g)) +
    (0.0722 * linear(rgb.b));
}

/**
 * WCAG contrast ratio between two colours, from 1 (identical) to 21.
 *
 * @param {string} a - A hex colour.
 * @param {string} b - A hex colour.
 *
 * @returns {number} The ratio.
 */
function _contrast(a, b) {
  const [high, low] = [getLuminance(a), getLuminance(b)]
    .sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function _shift(color, amount) {
  const rgb = _parseHex(color);
  if(!rgb) {
    return color;
  }
  return _toHex({
    r: rgb.r + amount, g: rgb.g + amount, b: rgb.b + amount
  });
}

/**
 * Builds the styles for the band behind a credential card and for the card's
 * own edge treatment, so the card always reads as a separate surface -- even
 * when the band and the card are configured the same colour.
 *
 * The band is moved in lightness until it clears `MIN_LUMINANCE_DELTA` against
 * the card, rather than relying on a shadow: a dark shadow vanishes on a dark
 * band and a light glow vanishes on a light one.
 *
 * @param {object} options - The options to use.
 * @param {string} options.bandColor - Intended band colour, as hex.
 * @param {string} [options.surfaceColor] - The card's own background, as hex;
 *   defaults to white, which is the card default.
 *
 * @returns {{band: string, foreground: string, bandIsLight: boolean,
 *   ring: string, shadow: string}} The resolved band colour, whether chrome on
 *   it should be drawn 'white' or 'dark', and the card's ring and shadow.
 */
export function getCardSurface({bandColor, surfaceColor = '#FFFFFF'}) {
  if(_parseHex(bandColor) === undefined) {
    // an unreadable colour is treated as white below, which would quietly
    // drive the whole derivation from a typo in configuration
    console.warn('Unreadable band colour, falling back to white', bandColor);
  }
  const surfaceLuminance = getLuminance(surfaceColor);
  let band = bandColor;
  // move away from the card, not toward it: a light card pushes the band down
  const direction = surfaceLuminance > EQUAL_CONTRAST_LUMINANCE ? -1 : 1;
  // bounded loop -- a band that cannot separate (e.g. pure black against a
  // pure black card) settles at the far end rather than spinning
  for(let i = 0; i < 8; ++i) {
    if(_contrast(band, surfaceColor) >= MIN_SURFACE_CONTRAST) {
      break;
    }
    band = _shift(band, direction * LIGHTNESS_STEP);
  }
  // white chrome is the design's default and is kept wherever it clears the
  // 3:1 WCAG asks of a UI component; only where it would not (a mid-tone band
  // averaged out of artwork) does this fall back to dark
  const foreground =
    _contrast(band, '#FFFFFF') >= MIN_CHROME_CONTRAST ? 'white' : 'dark';
  const bandIsLight = getLuminance(band) > EQUAL_CONTRAST_LUMINANCE;
  return {
    band,
    foreground,
    bandIsLight,
    ring: bandIsLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.35)',
    shadow: bandIsLight ?
      '0 10px 24px rgba(0, 0, 0, 0.18)' :
      '0 10px 30px rgba(0, 0, 0, 0.45)'
  };
}
