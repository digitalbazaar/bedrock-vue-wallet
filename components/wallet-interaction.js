/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

import {httpClient} from '@digitalbazaar/http-client';
import QRCode from 'qrcode';

export async function create() {
  const {data: {id}} = await httpClient.post('/mock-interactions');
  return `${window.location.origin}/mock-interactions/${id}`;
}

export function poll({url, interval = 1000, timeout = 60000}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (async function tick() {
      if(Date.now() - start >= timeout) {
        return reject(new Error('timeout'));
      }
      try {
        const {data} = await httpClient.get(url);
        if(data?.protocols?.website) {
          const {website} = data.protocols;
          return resolve(website);
        }

        setTimeout(tick, interval);
      } catch(e) {
        console.error(e);
        setTimeout(tick, interval);
      }
    })();
  });
}

export function toQrCode({text}) {
  if(!text || text.length === 0) {
    return;
  }

  return QRCode.toDataURL(text, {
    type: 'image/png',
    width: 800,
  });
}

export function toQrText(obj) {
  return window.btoa(JSON.stringify(obj));
}
