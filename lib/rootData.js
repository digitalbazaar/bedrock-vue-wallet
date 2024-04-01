/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/web';
import {reactive} from 'vue';
import './config.js';

export const rootData = reactive({});

rootData.defaults = () => {
  rootData.title = config.vueWallet.branding.name;
};
rootData.defaults();
