/*!
 * Copyright (c) 2019-2026 Digital Bazaar, Inc. All rights reserved.
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
/**
 * Whether a value is a credential record rather than a bare credential.
 *
 * TRANSITIONAL. Nothing should have to guess this, and no interface should
 * take either. `CredentialsList` accepts records shaped `{credential, meta}`,
 * records shaped `{content, meta}`, and raw verifiable credentials, and
 * decides which at runtime; every other surface rendering the same
 * `credentials` prop has to make the same guess or it works on one shape and
 * throws on another. These two functions exist so the guess is made once
 * rather than five times -- they are a holding position over that debt, not
 * the interface anyone should build on. Settling on one shape upstream
 * deletes both of them, and new callers should not multiply.
 *
 * @param {*} value - The value to test.
 *
 * @returns {boolean} True when it is a record.
 */
export function isCredentialRecord(value) {
  return !!(value?.meta && (value?.credential ?? value?.content));
}

/**
 * The credential inside a record, or the value itself when it is already one.
 *
 * @param {*} value - A record or a bare credential.
 *
 * @returns {object|undefined} The credential, or undefined for nothing.
 */
export function getCredential(value) {
  if(!value) {
    return undefined;
  }
  return isCredentialRecord(value) ? (value.credential ?? value.content) :
    value;
}

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
        // A missing segment resolves to nothing. Re-rooting at `jsonObject`
        // when an intermediate is absent answers a different question: on a
        // credential carrying no issuer at all, `/issuer/image` came back as
        // the credential's own top-level `image`.
        const value = pointerFields.reduce(
          (value, field) => value === undefined || value === null ?
            undefined : value[field], jsonObject);
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
