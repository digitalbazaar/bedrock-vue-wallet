/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
// CHAPI registration reaches the network and the mediator; nothing under test
// here exercises it.
export const installHandler = () => {};
export const uninstallHandler = () => {};
// no CHAPI event ever arrives; a spec drives the page's state itself
export const receiveCredentialEvent = () => new Promise(() => {});
