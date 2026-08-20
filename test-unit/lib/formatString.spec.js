/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {formatString} from '../../lib/helpers.js';

describe('formatString', () => {
  it.each([
    ['capitalize', 'movie ticket', 'Movie Ticket'],
    ['capitalizeAndSeparate', 'movieTicket', 'Movie Ticket']
  ])('still formats %s', (format, input, expected) => {
    expect(formatString(input, format)).toBe(expected);
  });

  it.each(['capitalize', 'capitalizeAndSeparate', 'date', undefined])(
    'answers nothing with nothing for format %s', format => {
      // `capitalize` split '' into [''] and read `[0]` off it, throwing
      // `Cannot read properties of undefined (reading 'toUpperCase')` out of
      // whatever was rendering. A card design names a pointer, and a
      // credential that does not carry that field is ordinary, not
      // exceptional.
      expect(formatString('', format)).toBe('');
    });

  it.each([
    ['undefined', undefined],
    ['null', null]
  ])('answers %s with an empty string rather than throwing', (_l, value) => {
    expect(formatString(value, 'capitalize')).toBe('');
  });

  it('leaves a non-string alone rather than throwing', () => {
    // a pointer can resolve to a number; formatting is not defined for one
    expect(formatString(0, 'capitalize')).toBe(0);
    expect(formatString(false, 'capitalize')).toBe(false);
  });
});
