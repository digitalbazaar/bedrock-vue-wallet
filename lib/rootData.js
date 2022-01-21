/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import Vue from 'vue';
import {store, createProxy} from 'bedrock-web-store';
import appConfig from '../config/application.js';

let creatingRootData = null;

export const getRootData = async () => {
  // if another call has been made to create the root data, wait for it
  if(creatingRootData) {
    try {
      await creatingRootData;
    } finally {}
  }

  // try to get the existing root data instance
  const id = 'rootData';
  const result = await store.get({id});
  if(result) {
    // result found, return it
    return result;
  }

  // try to create root data
  try {
    const data = createProxy({}, {addProperty: Vue.set});
    data.defaults = () => {
      data.title = appConfig.branding.name;
    };
    data.defaults();
    creatingRootData = store.create({id, object: data});
    await creatingRootData;
    return data;
  } catch(e) {
    if(e.name === 'DuplicateError') {
      return store.get({id});
    }
    throw e;
  } finally {
    creatingRootData = null;
  }
};
