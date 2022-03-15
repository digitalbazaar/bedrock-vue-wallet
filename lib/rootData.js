/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from 'bedrock-web';
import {makeReactive} from 'bedrock-vue';

export const rootData = makeReactive({target: {}});

rootData.defaults = () => {
  rootData.title = config.vueWallet.branding.name;
};
rootData.defaults();
