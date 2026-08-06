/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {describe, expect, it} from 'vitest';
import {getCardSurface, getLuminance} from '../cardSurface.js';

// the delta `getCardSurface` guarantees between a band and the card on it
const MIN_DELTA = 0.22;

const isLight = color => getLuminance(color) > 0.5;

describe('getLuminance', () => {
  const cases = [
    ['#FFFFFF', 1],
    ['#fff', 1],
    ['#000000', 0],
    ['#808080', 0.216]
  ];
  for(const [color, expected] of cases) {
    it(`reads ${color}`, () => {
      expect(getLuminance(color)).toBeCloseTo(expected, 2);
    });
  }

  it('treats an unreadable colour as white, the card default', () => {
    // several card designs configure '#' or an 8-digit hex
    expect(getLuminance('#')).toBe(1);
    expect(getLuminance('#ffffffff')).toBe(1);
    expect(getLuminance(undefined)).toBe(1);
  });
});

describe('getCardSurface', () => {
  it('separates a band from a card of the same colour', () => {
    const surfaceColor = '#65cba6';
    const {band} = getCardSurface({bandColor: surfaceColor, surfaceColor});
    const delta = Math.abs(getLuminance(band) - getLuminance(surfaceColor));
    expect(delta).toBeGreaterThanOrEqual(MIN_DELTA);
  });

  it('leaves a band that already contrasts alone', () => {
    const {band} = getCardSurface({
      bandColor: '#101020', surfaceColor: '#FFFFFF'
    });
    expect(band).toBe('#101020');
  });

  it('moves away from the card, not towards it', () => {
    // a light card pushes the band darker, and vice versa
    const light = getCardSurface({
      bandColor: '#FFFFFF', surfaceColor: '#FFFFFF'
    });
    expect(getLuminance(light.band)).toBeLessThan(getLuminance('#FFFFFF'));

    const dark = getCardSurface({
      bandColor: '#000000', surfaceColor: '#000000'
    });
    expect(getLuminance(dark.band)).toBeGreaterThan(getLuminance('#000000'));
  });

  it('gives a dark band a light ring and a light band a dark ring', () => {
    const onDark = getCardSurface({
      bandColor: '#101020', surfaceColor: '#FFFFFF'
    });
    expect(isLight(onDark.band)).toBe(false);
    expect(onDark.ring).toContain('255, 255, 255');

    const onLight = getCardSurface({
      bandColor: '#F2F2F2', surfaceColor: '#101020'
    });
    expect(isLight(onLight.band)).toBe(true);
    expect(onLight.ring).toContain('0, 0, 0');
  });

  it('always returns a usable shadow', () => {
    for(const bandColor of ['#101020', '#F2F2F2', '#65cba6', '#']) {
      const {shadow} = getCardSurface({bandColor, surfaceColor: '#FFFFFF'});
      expect(shadow).toMatch(/rgba\(0, 0, 0, 0\.\d+\)/);
    }
  });

  it('settles rather than looping when no separation is possible', () => {
    // black on black cannot be pushed darker; it must terminate
    const {band} = getCardSurface({bandColor: '#000000', surfaceColor: '#000'});
    expect(typeof band).toBe('string');
  });

  it('defaults the card surface to white when none is given', () => {
    const {band} = getCardSurface({bandColor: '#FFFFFF'});
    expect(getLuminance(band)).toBeLessThan(1);
  });
});
