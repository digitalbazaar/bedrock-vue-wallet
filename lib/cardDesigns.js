/*!
 * Copyright (c) 2015-2024 Digital Bazaar, Inc. All rights reserved.
 */
export const cardDesigns = [
  {
    matches: {
      '/@context': 'https://w3id.org/citizenship/v1',
      '/type': 'PermanentResidentCard'
    },
    styles: {
      backgroundColor: '',
      textColor: ''
    },
    overrides: {
      title: {
        pointer: '/name'
      },
      subtitle: {
        pointer: '/description'
      },
      imagePointer: '/issuer/image',
      descriptionPointer: ''
    },
    highlights: [
      {
        field: 'image',
        pointer: '/credentialSubject/image'
      },
      {
        field: 'Expiration Date',
        pointer: '/expirationDate',
        format: 'date'
      },
      {
        field: 'Given Name',
        pointer: '/credentialSubject/givenName',
        format: 'capitalize'
      },
      {
        field: 'Family Name',
        pointer: '/credentialSubject/familyName',
        format: 'capitalize'
      },
      {
        field: 'ID#',
        pointer: '/identifier'
      },
      {
        field: 'Gender',
        pointer: '/credentialSubject/gender'
      },
      {
        field: 'Resident Since',
        pointer: '/credentialSubject/residentSince'
      },
      {
        field: 'LPR Category',
        pointer: '/credentialSubject/lprCategory'
      },
      {
        field: 'LPR Number',
        pointer: '/credentialSubject/lprNumber'
      },
      {
        field: 'Birth Country',
        pointer: '/credentialSubject/birthCountry'
      },
      {
        field: 'DOB',
        pointer: '/credentialSubject/birthDate',
        format: 'date'
      },
      {
        field: 'Classification',
        pointer: '/credentialSubject/commuterClassification'
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
  },
  {
    matches: {
      '/@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.2.json',
      '/type': 'OpenBadgeCredential',
      '/name': 'ENG439'
    },
    styles: {
      backgroundColor: '#182C61',
      textColor: '#FFFFFF'
    },
    overrides: {
      title: {
        pointer: '/credentialSubject/achievement/creator/name'
      },
      subtitle: {
        pointer: '/credentialSubject/achievement/name'
      },
      imagePointer: '/issuer/image/id',
      descriptionPointer: '/credentialSubject/achievement/criteria/narrative'
    },
    highlights: [
      {
        field: 'image',
        pointer: '/credentialSubject/achievement/creator/image/id'
      },
      {
        field: 'Educational Entity',
        pointer: '/credentialSubject/achievement/creator/name'
      },
      {
        field: 'Issued by',
        pointer: '/issuer/name'
      },
      {
        field: 'Awarded to',
        pointer: '/credentialSubject/name'
      },
      {
        field: 'Course Name',
        pointer: '/credentialSubject/achievement/name'
      },
      {
        field: 'Course Code',
        pointer: '/credentialSubject/achievement/humanCode'
      },
      {
        field: 'Education Level',
        pointer: '/credentialSubject/achievement/tln:courseCareer'
      },
      {
        field: 'Credit Hours',
        pointer: '/credentialSubject/creditsEarned'
      },
      {
        field: 'Term',
        pointer: '/credentialSubject/term'
      },
      {
        field: 'Achievement Description',
        pointer: '/credentialSubject/achievement/criteria/narrative'
      },
      {
        field: 'Course Description',
        pointer: '/credentialSubject/achievement/description'
      }
    ]
  },
  {
    matches: {
      '/@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
      '/type': 'OpenBadgeCredential',
      '/name': 'Intro to CHAPI'
    },
    styles: {
      backgroundColor: '#2F3542',
      textColor: '#FFFFFF'
    },
    overrides: {
      title: {
        pointer: '/name'
      },
      subtitle: {
        pointer: '/credentialSubject/achievement/name'
      },
      imagePointer: '/issuer/image/id',
      descriptionPointer: ''
    },
    highlights: [
      {
        field: 'image',
        pointer: '/credentialSubject/achievement/image/id'
      },
      {
        field: 'Issued by',
        pointer: '/issuer/name'
      },
      {
        field: 'Attestation',
        pointer: '/credentialSubject/achievement/name'
      },
      {
        field: 'Achievement',
        pointer: '/credentialSubject/achievement/description'
      },
      {
        field: 'Achievement Criteria',
        pointer: '/credentialSubject/achievement/criteria/narrative'
      },
      {
        field: 'Issuance Date',
        pointer: '/issuanceDate',
        format: 'date'
      }
    ]
  },
  {
    matches: {
      '/@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
      '/type': 'OpenBadgeCredential',
      '/name': 'JFF x vc-edu PlugFest 2 Interoperability'
    },
    styles: {
      backgroundColor: '#747D8C',
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
        field: 'image',
        pointer: '/issuer/image/id'
      },
      {
        field: 'Achievement',
        pointer: '/credentialSubject/achievement/name'
      },
      {
        field: 'Achievement Criteria',
        pointer: '/credentialSubject/achievement/criteria/narrative'
      },
      {
        field: 'Achievement Description',
        pointer: '/credentialSubject/achievement/description'
      },
      {
        field: 'Issuance Date',
        pointer: '/issuanceDate',
        format: 'date'
      }
    ]
  },
  {
    matches: {
      // eslint-disable-next-line max-len
      '/@context': 'https://w3c-ccg.github.io/vc-ed/plugfest-1-2022/jff-vc-edu-plugfest-1-context.json',
      '/type': 'OpenBadgeCredential'
    },
    styles: {
      backgroundColor: '#82589F',
      textColor: '#FFFFFF'
    },
    overrides: {
      title: {
        pointer: '/issuer/name'
      },
      subtitle: {
        pointer: '/credentialSubject/achievement/type'
      },
      imagePointer: '/credentialSubject/achievement/image',
      descriptionPointer: ''
    },
    highlights: [
      {
        field: 'image',
        pointer: '/issuer/image'
      },
      {
        field: 'Achievement',
        pointer: '/credentialSubject/achievement/description'
      },
      {
        field: 'Achievement Description',
        pointer: '/credentialSubject/achievement/name'
      },
      {
        field: 'Achievement Criteria',
        pointer: '/credentialSubject/achievement/criteria/narrative'
      },
      {
        field: 'Issuance Date',
        pointer: '/issuanceDate',
        format: 'date'
      }
    ]
  },
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
      // eslint-disable-next-line max-len
      '/@context': 'https://contexts.vcplayground.org/examples/movie-ticket/v1.json',
      '/type': 'MovieTicketCredential'
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
        pointer: '/credentialSubject/owns/type'
      },
      imagePointer: '/issuer/image',
      descriptionPointer: ''
    },
    highlights: [
      {
        field: 'Theater',
        pointer: '/credentialSubject/owns/location/name'
      },
      {
        field: 'Address',
        pointer: [
          '/credentialSubject/owns/location/address/streetAddress',
          '/credentialSubject/owns/location/address/addressLocality',
          '/credentialSubject/owns/location/address/addressRegion',
          '/credentialSubject/owns/location/address/postalCode'
        ],
        joinWith: ' '
      },
      {
        field: 'Theater Number',
        pointer: '/credentialSubject/owns/ticketedSeat/seatSection'
      },
      {
        field: 'Ticket Number',
        pointer: '/credentialSubject/owns/ticketNumber'
      },
      {
        field: 'Seat',
        pointer: [
          '/credentialSubject/owns/ticketedSeat/seatRow',
          '/credentialSubject/owns/ticketedSeat/seatNumber'
        ],
        joinWith: ' '
      }
    ]
  },
  {
    matches: {
      '/@context': 'https://contexts.vcplayground.org/examples/alumni/v1.json',
      '/type': 'AlumniCredential'
    },
    styles: {
      backgroundColor: '',
      textColor: ''
    },
    overrides: {
      title: {
        pointer: '/name'
      },
      subtitle: {
        pointer: '/credentialSubject/alumniOf/name'
      },
      imagePointer: '/issuer/image',
      descriptionPointer: ''
    },
    highlights: [
      {
        field: 'image',
        pointer: '/issuer/image'
      },
      {
        field: 'Credential Type',
        pointer: '/name'
      },
      {
        field: 'Alumni of',
        pointer: '/credentialSubject/alumniOf/name'
      },
      {
        field: 'Issued on',
        pointer: '/issuanceDate',
        format: 'date'
      }
    ]
  },
  {
    matches: {
      // eslint-disable-next-line max-len
      '/@context': 'https://contexts.vcplayground.org/examples/gs1-8110-coupon/v2.json',
      '/type': 'GS18110CouponCredential'
    },
    styles: {
      backgroundColor: '#402A23',
      textColor: '#FFFFFF'
    },
    overrides: {
      title: {
        pointer: '/name'
      },
      subtitle: {
        pointer: '/issuer/name'
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
        field: 'Description',
        pointer: '/credentialSubject/clippedCoupon/offerDescription'
      },
      {
        field: 'Conditions',
        pointer: '/credentialSubject/clippedCoupon/exclusionDescription'
      }
    ]
  },
  {
    matches: {
      // eslint-disable-next-line max-len
      '/@context': 'https://contexts.vcplayground.org/examples/customer-loyalty/v1.json',
      '/type': 'CustomerLoyaltyCredential'
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
        pointer: '/credentialSubject/customerLoyaltyCard/type'
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
        field: 'Loyalty ID',
        pointer: '/credentialSubject/customerLoyaltyCard/identifier'
      },
      {
        field: 'Website',
        pointer: '/issuer/url'
      },
      {
        field: 'Issuance Date',
        pointer: '/issuanceDate',
        format: 'date'
      }
    ]
  }
];