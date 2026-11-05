/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
// a signed-in session; a spec that needs another sets `session.data`, and
// one that signs in replaces `session.refresh`
export const session = {
  data: {account: {id: 'urn:uuid:account'}},
  refresh: async () => {}
};
