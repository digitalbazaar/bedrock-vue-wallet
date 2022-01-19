/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import Vue from 'vue';
import {store, createProxy} from 'bedrock-web-store';
import appConfig from '../config/application.js';

export const getRootData = async () => {
  const id = 'rootData';
  try {
    const data = createProxy({}, {addProperty: Vue.set});
    data.defaults = () => {
      data.title = appConfig.branding.name;
    };
    await store.create({id, object: data});
    return data;
  } catch(e) {
    if(e.name === 'DuplicateError') {
      return store.get({id});
    }
    throw e;
  }
};
