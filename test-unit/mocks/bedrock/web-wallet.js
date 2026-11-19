/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
export const helpers = {
  hasNFCPayload: () => false,
  createCapabilities: async () => [],
  prettify: (...args) => JSON.stringify(...args)
};
export const envelopes = {};
export const exchanges = {};
// the calls a share screen makes to match a request against the store; a
// spec that renders one replaces the functions it needs on this object
export const presentations = {
  match: async () => ({flat: []}),
  findCredentialProviders: () => [],
  getCompatibleAuthnOptions: async () => ({authnOptions: []})
};
export const ageCredentialHelpers = {
  generateQrCodeDataUrl: () => '', reissue: () => {},
  ensureLocalCredentials: async () => {}
};
// An explicit seam. ESM named exports are not writable, so `vi.spyOn` cannot
// replace one; a spec that needs the store to fail calls `setCredentialStore`
// instead. The default resolves, so a spec that does not care need not set it.
const DEFAULT_STORE = async () => ({
  local: {find: async () => ({documents: []})},
  remote: {find: async () => ({documents: []})}
});

let storeImpl = DEFAULT_STORE;

export const getCredentialStore = (...args) => storeImpl(...args);

export function setCredentialStore(impl) {
  storeImpl = impl ?? DEFAULT_STORE;
}
export const capabilities = {};
let profilesImpl = async () => [{id: 'urn:uuid:profile', name: 'Test'}];

export const profileManager = {
  getProfiles: (...args) => profilesImpl(...args)
};

export function setProfiles(impl) {
  profilesImpl = impl ?? (async () => [
    {id: 'urn:uuid:profile', name: 'Test'}
  ]);
}
export const users = {};
export const getPrimaryEmail = () => '';
export const initialize = () => {};
