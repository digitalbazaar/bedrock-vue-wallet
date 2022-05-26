/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {ref} from 'vue';
import {session} from '@bedrock/web-session';

// re-export session
export {session};

// exports a reference to the session's current data
export const sessionDataRef = ref(session.data);

session.on('change', () => {
  sessionDataRef.value = session.data;
});
