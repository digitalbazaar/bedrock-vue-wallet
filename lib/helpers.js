/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {installHandler} from 'web-credential-handler';
import {Notify} from 'quasar';

const notifiedAccounts = new Map();

export function notifyAllowWallet({account, preventRenotify = false}) {
  // if already notified ignore
  if(notifiedAccounts.get(account)) {
    return;
  }
  // if inside a WebView ignore
  if(isWebView({userAgent: navigator?.userAgent})) {
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

export function isWebView({userAgent = ''}) {
  if(userAgent.includes('WebView')) {
    return true;
  }
  const iosPlatforms = ['iPhone', 'iPod', 'iPad'];
  if(iosPlatforms.some(p => userAgent.includes(p))) {
    // if the UA includes Safari it is not a WebView
    if(!userAgent.includes('Safari')) {
      return true;
    }
  }
  if(userAgent.includes('Android')) {
    // if the UA includes wv it is a WebView
    if(userAgent.includes('; wv')) {
      return true;
    }
  }
  return false;
}
