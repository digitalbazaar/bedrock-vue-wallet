<template>
  <div class="q-my-md">
    <div
      class="profile-image q-mb-md q-mx-auto">
      <div
        v-if="avatar === null"
        class="bg-grey row items-center justify-center"
        style="height: 100%; border-radius: 50%">
        <q-icon
          name="fas fa-user"
          class="text-white"
          style="font-size: 75px" />
      </div>
      <div v-else>
        <img :src="avatar">
      </div>
    </div>
    <div
      v-if="name"
      class="q-mt-sm row justify-center items-start text-subtitle1">
      <q-icon
        class="q-px-sm g-icon-fix"
        name="fas fa-user" />
      <span
        class="q-px-sm q-py-xs text-left g-field-label">
        {{name}}
      </span>
    </div>
    <div class="row justify-center items-start">
      <q-icon
        class="q-px-sm g-icon-fix"
        name="fa fa-envelope" />
      <span
        class="q-px-sm q-py-xs text-left g-field-label">
        {{email}}
      </span>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'UserAvatar',
  props: {
    email: {
      type: String,
      default: undefined
    },
    name: {
      type: String,
      default: undefined
    },
    avatar: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {};
  }
};
</script>

<style lang="scss" scoped>
.g-field-label {
  width: 175px;
  font-size: 16px;
  word-wrap: break-word;
  display: inline-block;
}

.g-icon-fix {
  margin-top: 10px;
}

.profile-image {
  height: 150px;
  width: 150px;

  span {
    margin: auto;
    font-size: 75px;
    font-weight: bold;
    color: #fff;
  }
}
</style>
