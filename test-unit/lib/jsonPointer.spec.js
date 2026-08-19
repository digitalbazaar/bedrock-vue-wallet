/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {getValueFromPointer} from '../../lib/helpers.js';

const CREDENTIAL = {
  image: '/root-image.png',
  issuer: {name: 'Acme'},
  credentialSubject: {
    achievement: {name: 'Food Safety', criteria: {narrative: 'Passed.'}},
    count: 0,
    active: false,
    note: ''
  },
  'odd/name': 'slash',
  'odd~name': 'tilde'
};

describe('getValueFromPointer', () => {
  it.each([
    ['a top-level value', '/image', '/root-image.png'],
    ['a nested value', '/issuer/name', 'Acme'],
    ['a deeply nested value',
      '/credentialSubject/achievement/criteria/narrative', 'Passed.'],
    ['an escaped slash', '/odd~1name', 'slash'],
    ['an escaped tilde', '/odd~0name', 'tilde']
  ])('resolves %s', (_label, pointer, expected) => {
    expect(getValueFromPointer(CREDENTIAL, pointer)).toBe(expected);
  });

  it('returns the whole object for the empty pointer', () => {
    expect(getValueFromPointer(CREDENTIAL, '')).toBe(CREDENTIAL);
  });

  it('refuses a pointer that is not rooted', () => {
    expect(getValueFromPointer(CREDENTIAL, 'issuer/name')).toBe('');
  });

  it.each([
    ['zero', '/credentialSubject/count', 0],
    ['false', '/credentialSubject/active', false],
    ['an empty string', '/credentialSubject/note', '']
  ])('resolves %s rather than treating it as absent', (_l, pointer, value) => {
    expect(getValueFromPointer(CREDENTIAL, pointer)).toBe(value);
  });

  it('does not re-root when an intermediate segment is missing', () => {
    // `/issuer/image` on a credential carrying no issuer at all answered with
    // the credential's own top-level `image` -- the credential's own artwork
    // presented as the issuer's logo
    const noIssuer = {image: '/root-image.png'};
    expect(getValueFromPointer(noIssuer, '/issuer/image')).toBe('');
  });

  it('does not re-root past a falsy intermediate segment', () => {
    expect(getValueFromPointer(CREDENTIAL, '/credentialSubject/count/image'))
      .toBe('');
  });

  it('resolves nothing to nothing rather than throwing', () => {
    expect(getValueFromPointer(CREDENTIAL, '/nowhere/at/all')).toBe('');
  });

  describe('an array of pointers', () => {
    it('joins with a comma by default', () => {
      expect(getValueFromPointer(CREDENTIAL, ['/issuer/name', '/image']))
        .toBe('Acme, /root-image.png');
    });

    it('joins with what the caller asked for, including nothing', () => {
      expect(getValueFromPointer(
        CREDENTIAL, ['/issuer/name', '/image'], ' -- '))
        .toBe('Acme -- /root-image.png');
      expect(getValueFromPointer(CREDENTIAL, ['/issuer/name', '/image'], ''))
        .toBe('Acme/root-image.png');
    });

    it('leaves a gap for a pointer that resolves to nothing', () => {
      expect(getValueFromPointer(CREDENTIAL, ['/issuer/name', '/nowhere']))
        .toBe('Acme, ');
    });
  });
});
