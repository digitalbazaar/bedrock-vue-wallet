/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {date, Notify} from 'quasar';
import {config} from '@bedrock/web';
import {installHandler} from 'web-credential-handler';

// Constants
const {formatDate} = date;

export async function addWalletToChapi({} = {}) {
  if(config?.vueWallet?.disableChapi) {
    return;
  }

  try {
    const result = await installHandler({url: '/credential-handler'});
    if(result === undefined) {
      Notify.create({
        message: `Success! Your wallet will be shown in your browser's ` +
          'wallet selector.',
        color: 'green-6',
        timeout: 5000,
        textColor: 'white',
        actions: [{
          label: 'Dismiss',
          color: 'white'
        }]
      });
    }
  } catch(e) {
    if(e.message !== 'Permission denied.') {
      console.error('CHAPI register error:', e);
    }
    Notify.create({
      message: `Warning! Your wallet will not be shown in your browser's ` +
        'wallet selector.',
      color: 'red-5',
      timeout: 5000,
      textColor: 'white',
      actions: [{
        label: 'Dismiss',
        color: 'white'
      }]
    });
  }
}

// Takes in a json object and json pointer(s) and returns value
export function getValueFromPointer(jsonObject, pointer, joinWith) {
  function pointerValue(jsonObject, pointer) {
    try {
      // Return whole object
      if(pointer === '') {
        return jsonObject;
      // Return value from pointer
      } else if(pointer[0] === '/') {
        const pointerFields = pointer.slice(1).split('/').map(p => {
          // Replace json pointer special characters
          return p.replaceAll('~1', '/').replaceAll('~0', '~');
        });
        // Return nested value. A missing segment resolves to nothing rather
        // than restarting from the root: re-rooting answered a different
        // question, so `/issuer/image` on a credential with no `issuer` came
        // back as the credential's own top-level `image`.
        const value = pointerFields.reduce(
          (v, field) => (v === undefined || v === null ? undefined : v[field]),
          jsonObject);
        return value ?? '';
      }
      return '';
    } catch(err) {
      console.error('Failed to get json value from pointer', err);
      return '';
    }
  }
  // Handles single values or an array of values
  if(Array.isArray(pointer)) {
    return pointer.map(p => pointerValue(jsonObject, p))
      .join(joinWith !== undefined ? joinWith : ', ');
  } else {
    return pointerValue(jsonObject, pointer);
  }
}

// Format string value
export function formatString(value, format) {
  if(format === 'date') {
    return formatDate(value, 'YYYY-MM-DD');
  } else if(format === 'capitalize') {
    value = value.toLowerCase();
    value = value.split(' ');
    return value.map(v => v[0].toUpperCase() + v.slice(1)).join(' ');
  } else if(format === 'capitalizeAndSeparate') {
    const result = value.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
  return value;
}
