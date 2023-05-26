/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/web';
import {installHandler} from 'web-credential-handler';
import {Notify} from 'quasar';

const notifiedAccounts = new Map();

export function notifyAllowWallet({account, preventRenotify = false}) {
  // if already notified ignore
  if(preventRenotify && notifiedAccounts.get(account)) {
    return;
  }
  if(config?.vueWallet?.disableChapi === true) {
    return;
  }
  return Notify.create({
    message: 'Allow your wallet to manage credentials on other websites?',
    color: 'green-8',
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
      icon: 'fas fa-times',
      color: 'white',
      handler() {
        // if the user dismisses the notification don't show it again
        notifiedAccounts.set(account, true);
      }
    }]
  });
}
