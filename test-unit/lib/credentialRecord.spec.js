/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {describe, expect, it} from 'vitest';
import {getCredential, isCredentialRecord} from '../../lib/helpers.js';

// `CredentialsList` accepts three shapes and detects which at runtime, so any
// surface that renders the same `credentials` prop has to accept all three or
// it works on desktop and throws on mobile.
const VC = {type: ['VerifiableCredential'], name: 'Movie Ticket'};

describe('credential record shapes', () => {
  it.each([
    ['a record with `credential`', {credential: VC, meta: {id: 'urn:a'}}, true],
    ['a record with `content`', {content: VC, meta: {id: 'urn:a'}}, true],
    ['a raw verifiable credential', VC, false],
    ['a record with no meta', {credential: VC}, false],
    ['undefined', undefined, false]
  ])('recognises %s', (_label, value, expected) => {
    expect(isCredentialRecord(value)).toBe(expected);
  });

  it.each([
    ['a record with `credential`', {credential: VC, meta: {id: 'urn:a'}}],
    ['a record with `content`', {content: VC, meta: {id: 'urn:a'}}],
    ['a raw verifiable credential', VC]
  ])('unwraps %s to the credential itself', (_label, value) => {
    expect(getCredential(value)).toBe(VC);
  });

  it('returns undefined rather than throwing on nothing', () => {
    expect(getCredential(undefined)).toBeUndefined();
  });
});
