/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/web';
import {installHandler} from 'web-credential-handler';
import {Notify} from 'quasar';

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
      // eslint-disable-line no-console
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
