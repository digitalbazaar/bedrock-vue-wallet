/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/web';
import {installHandler} from 'web-credential-handler';
import {Notify} from 'quasar';

const notifiedAccounts = new Map();

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

export function notifyAllowWallet({account, preventRenotify = false}) {
  // if already notified ignore
  if(preventRenotify && notifiedAccounts.get(account)) {
    return;
  }
  if(config?.vueWallet?.disableChapi) {
    return;
  }
  return Notify.create({
    message: 'Show your wallet when other websites request credentials?',
    color: 'green-9',
    // show the message for 15 seconds
    timeout: 15000,
    progress: true,
    textColor: 'white',
    actions: [{
      label: 'Allow',
      color: 'white',
      async handler() {
        try {
          // install credential handler
          await installHandler({url: '/credential-handler'});
          // don't show the notification to the same account again
          notifiedAccounts.set(account, true);
        } catch(e) {
          // eslint-disable-line no-console
          console.error('CHAPI register error:', e);
          Notify.create({
            type: 'negative',
            message:
              'Your wallet will not be shown to you as an option for using ' +
              'credentials on other websites. Please click the button and ' +
              'select "Allow" to change this.',
            actions: [{icon: 'fa fa-times'}]
          });
        }
      }
    }, {
      label: 'Dismiss',
      color: 'white',
      handler() {
        // if the user dismisses the notification don't show it again
        notifiedAccounts.set(account, true);
      }
    }]
  });
}
