/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/web';
import {makeReactive} from '@bedrock/vue';
import './config.js';

// FIXME: use `import {reactive} from 'vue';` instead

export const rootData = makeReactive({target: {}});

rootData.defaults = () => {
  rootData.title = config.vueWallet.branding.name;
};
rootData.defaults();
