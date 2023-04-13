/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {installHandler} from 'web-credential-handler';
import {Notify} from 'quasar';

export function notifyAllowWallet() {
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
      color: 'white'
    }]
  });
}
