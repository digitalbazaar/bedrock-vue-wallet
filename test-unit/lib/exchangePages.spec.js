/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

// The pages carry the vocabulary -- which offered credential gets a page --
// and the library only matches them. These fixtures are the library's own.
const TICKET_PAGE = {
  matches: {'/type': 'TicketOfferCredential'},
  request: 'would like you to confirm a ticket',
  component: () => {}
};

const credential = type => ({type: ['VerifiableCredential', type]});

// a fresh module per test, so each starts with no registered pages
let addExchangePage;
let getExchangePage;
beforeEach(async () => {
  vi.resetModules();
  ({addExchangePage, getExchangePage} =
    await import('../../lib/exchangePages.js'));
});

describe('addExchangePage()', () => {
  it('rejects a page without matches', () => {
    expect(() => addExchangePage({component: () => {}}))
      .toThrow(TypeError);
  });

  it('rejects a page without a component loader', () => {
    expect(() => addExchangePage({matches: TICKET_PAGE.matches}))
      .toThrow(TypeError);
  });
});

describe('getExchangePage()', () => {
  it('picks the page a matching offered credential names', () => {
    addExchangePage(TICKET_PAGE);
    const credentials = [credential('TicketOfferCredential')];
    expect(getExchangePage({credentials})).toEqual(TICKET_PAGE);
  });

  it('matches any offered credential, not only the first', () => {
    addExchangePage(TICKET_PAGE);
    const credentials = [
      credential('SomethingElse'), credential('TicketOfferCredential')
    ];
    expect(getExchangePage({credentials})).toEqual(TICKET_PAGE);
  });

  it('returns nothing when no offered credential matches', () => {
    addExchangePage(TICKET_PAGE);
    const credentials = [credential('SomethingElse')];
    expect(getExchangePage({credentials})).toBeUndefined();
  });

  it('returns nothing when no pages are registered', () => {
    const credentials = [credential('TicketOfferCredential')];
    expect(getExchangePage({credentials})).toBeUndefined();
    expect(getExchangePage()).toBeUndefined();
  });
});
