<template>
  <div class="q-pa-md q-gutter-sm">
    <q-tree
      :nodes="allDetails"
      node-key="id" />
  </div>
</template>

<script>
/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, toRaw} from 'vue';

export default {
  name: 'CredentialDetailsTree',
  components: {},
  props: {
    credential: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const allDetails = computed(() => {
      const {credential} = props;
      const allKeys = Object.keys(credential);
      return allKeys.flatMap(key => createNodeList(key, credential));
    });

    // helper function
    function createNodeList(key, obj, list = []) {
      const value = toRaw(obj[key] || obj);
      const node = {id: crypto.randomUUID(), label: key, children: []};
      if(Array.isArray(value)) {
        // if value is an array of objects, make each key its index
        const containsObjects = typeof value[0] === 'object';
        value.forEach((subValue, index) => {
          const key = containsObjects ? `index ${index}` : subValue;
          const obj = containsObjects ? subValue : value[subValue];
          createNodeList(key, obj || {}, node.children);
        });
      } else if(typeof value === 'object') {
        Object.keys(value).forEach(subKey => {
          createNodeList(subKey, value[subKey] || {}, node.children);
        });
      } else if(value) {
        node.children.push({id: crypto.randomUUID(), label: value});
      }
      list.push(node);
      return list;
    }

    return {
      allDetails
    };
  }
};
</script>

<style lang="scss" scoped>
</style>
