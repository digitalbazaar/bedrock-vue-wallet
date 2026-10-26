/*!
 * Copyright (c) 2025-2026 Digital Bazaar, Inc.
 */
import {httpClient} from '@digitalbazaar/http-client';
import QRCode from 'qrcode';

// interaction type configured on the server (`profile-http` interactions)
const INTERACTION_TYPE = 'checkout';

/**
 * Creates a checkout interaction.
 *
 * @returns {Promise<string>} The interaction ID, an absolute URL.
 */
export async function create() {
  const {data: {interactionId}} = await httpClient.post('/interactions', {
    json: {type: INTERACTION_TYPE, exchange: {variables: {}}}
  });
  return interactionId;
}

/**
 * Polls an interaction until it completes.
 *
 * @param {object} options - The options to use.
 * @param {string} options.interactionId - The interaction ID.
 * @param {AbortSignal} [options.signal] - Aborts polling.
 * @param {number} [options.interval=1000] - Milliseconds between polls.
 * @param {number} [options.timeout=900000] - Milliseconds before giving up;
 *   matches the exchange's 15 minute expiry.
 *
 * @returns {Promise<object>} The invite response from the other party.
 */
export async function poll({
  interactionId, signal, interval = 1000, timeout = 15 * 60 * 1000
} = {}) {
  // poll through this origin (proxied), not the absolute interaction URL
  const {pathname} = new URL(interactionId);
  const end = Date.now() + timeout;
  while(Date.now() < end) {
    signal?.throwIfAborted();
    let exchange;
    try {
      const response = await httpClient.get(pathname, {signal});
      exchange = response.data?.exchange;
    } catch(e) {
      // stop on abort and client errors (e.g. expired or not authorized);
      // keep polling through network and server errors
      if(signal?.aborted || (e.status >= 400 && e.status < 500)) {
        throw e;
      }
    }
    if(exchange?.state === 'complete') {
      const inviteResponse = exchange.result?.inviteRequest?.inviteResponse;
      if(!inviteResponse) {
        throw new Error('Interaction completed without a response.');
      }
      return inviteResponse;
    }
    if(exchange?.state === 'invalid') {
      throw new Error('Interaction failed.');
    }
    // an abort is picked up at the top of the next pass
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Interaction timed out.');
}

/**
 * Builds the QR code text for an interaction: the interaction URL with
 * `iuv=1`, as base64-encoded JSON (`{url}`).
 *
 * @param {object} options - The options to use.
 * @param {string} options.interactionId - The interaction ID.
 *
 * @returns {string} The QR code text.
 */
export function toQrText({interactionId}) {
  const url = `${interactionId}?iuv=1`;
  return window.btoa(JSON.stringify({url}));
}

/**
 * Renders QR code text as a PNG data URL.
 *
 * @param {object} options - The options to use.
 * @param {string} options.text - The QR code text.
 *
 * @returns {Promise<string>|undefined} The data URL.
 */
export function toQrCode({text}) {
  if(!text) {
    return;
  }
  return QRCode.toDataURL(text, {type: 'image/png', width: 800});
}

/**
 * Parses a URL received from the other party before redirecting to it;
 * only `https:` URLs are allowed.
 *
 * @param {object} options - The options to use.
 * @param {string} options.url - The URL to parse.
 *
 * @returns {URL} The parsed URL.
 */
export function parseRedirectUrl({url}) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch(cause) {
    throw new Error('Invalid redirect URL.', {cause});
  }
  if(parsed.protocol !== 'https:') {
    throw new Error('Redirect URL must use "https:".');
  }
  return parsed;
}