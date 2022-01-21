/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import Vue from 'vue';
import {store, createProxy} from 'bedrock-web-store';
import appConfig from '../config/application.js';

let pendingGetRootData = null;

export const getRootData = async () => {
  // if another call has been made to get the root data, use it
  if(pendingGetRootData) {
    return pendingGetRootData;
  }

  // try to get the existing root data
  const id = 'rootData';
  pendingGetRootData = store.get({id});
  const result = await pendingGetRootData;
  pendingGetRootData = null;

  // result found, return it
  if(result) {
    return result;
  }

  // try to create root data
  try {
    const data = createProxy({}, {addProperty: Vue.set});
    data.defaults = () => {
      data.title = appConfig.branding.name;
    };
    data.defaults();
    pendingGetRootData = store.create({id, object: data});
    await pendingGetRootData;
    return data;
  } catch(e) {
    if(e.name === 'DuplicateError') {
      return store.get({id});
    }
    throw e;
  } finally {
    pendingGetRootData = null;
  }
};
