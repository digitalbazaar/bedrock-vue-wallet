/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */

// the mediator's permission state is not readable from here, so this records
// only that the user was asked; per-browser, like the permission it stands
// in for
const KEY = 'bedrock-vue-wallet.chapiSetupPromptDismissed';

export function isChapiSetupPromptDismissed() {
  try {
    return window.localStorage.getItem(KEY) === 'true';
  } catch{
    // storage unavailable; treat as dismissed to avoid prompting every load
    return true;
  }
}

export function dismissChapiSetupPrompt() {
  try {
    window.localStorage.setItem(KEY, 'true');
  } catch{
    // ignore
  }
}
