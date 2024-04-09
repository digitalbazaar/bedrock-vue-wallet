/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 *
 * The matches property is used to find a credential and apply the following
 * styles and overrides. The key is a JSON pointer which needs to match the
 * value.
 *
 * The styles property is used to add a font and background color to a
 * credential card.
 *
 * The overrides property can override the values for the title, subtitle,
 * image, and description of the credential. The title and subtitle can also
 * be formatted with the format key value pair.
 *
 * The highlights property is used to show important fields to the user in a
 * brief summarized version in the credential details window. The field property
 * will be used as the name of the highlighted detail and the pointer is the
 * JSON pointer for the given highlight value. Highlights can also be formatted
 * with the format key value pair
 */
export const cardDesigns = [
  {
    matches: {
      // eslint-disable-next-line max-len
      '/@context': 'https://contexts.vcplayground.org/examples/food-safety-certification/v1.json',
      '/type': 'FoodSafetyCertificationCredential'
    },
    styles: {
      backgroundColor: '',
      textColor: ''
    },
    overrides: {
      title: {
        pointer: '/issuer/name'
      },
      subtitle: {
        format: 'capitalizeAndSeparate',
        pointer: '/credentialSubject/certification/type'
      },
      imagePointer: '/image',
      descriptionPointer: ''
    },
    highlights: [
      {
        field: 'image',
        pointer: '/issuer/image'
      },
      {
        field: 'Issued to',
        pointer: '/credentialSubject/name'
      },
      {
        field: 'Exam Date',
        pointer: '/credentialSubject/certification/examDate',
        format: 'date'
      },
      {
        field: 'Date issued',
        pointer: '/issuanceDate',
        format: 'date'
      }
    ]
  },
  {
    matches: {
      '/@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.2.json',
      '/type': 'OpenBadgeCredential',
      '/name': 'JFF x vc-edu PlugFest 3 Interoperability'
    },
    styles: {
      backgroundColor: '#5352ED',
      textColor: '#FFFFFF'
    },
    overrides: {
      title: {
        pointer: '/issuer/name'
      },
      subtitle: {
        pointer: '/credentialSubject/achievement/type/0'
      },
      imagePointer: '/credentialSubject/achievement/image/id',
      descriptionPointer: ''
    },
    highlights: [
      {
        field: 'image_1',
        pointer: '/issuer/image'
      },
      {
        field: 'Achievement',
        pointer: '/credentialSubject/achievement/name'
      },
      {
        field: 'Issuance Date',
        pointer: '/issuanceDate',
        format: 'date'
      },
      {
        field: 'Achievement Description',
        pointer: '/credentialSubject/achievement/description'
      },
      {
        field: 'Achievement Criteria',
        pointer: '/credentialSubject/achievement/criteria/narrative'
      }
    ]
  }
];
