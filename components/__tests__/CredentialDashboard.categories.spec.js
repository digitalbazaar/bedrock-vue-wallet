/*!
 * Copyright (c) 2026 Digital Bazaar, Inc. All rights reserved.
 */
import {expect} from 'chai';

describe('CredentialDashboard.vue - Category Filtering', function() {
  // Mock credential factory
  function createMockCredential(type, name = 'Test Credential') {
    return {
      credential: {
        type: Array.isArray(type) ? type : ['VerifiableCredential', type],
        name
      },
      meta: {
        holder: 'did:example:holder123'
      }
    };
  }

  describe('credentialCategories computed', function() {
    it('should derive distinct credential types from the credentials list', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'License 1'),
        createMockCredential('DriverLicense', 'License 2'),
        createMockCredential('UniversityDegree', 'Degree 1')
      ];

      // credentialCategories should extract the second element of type array
      // for each credential and return unique values
      const categories = Array.from(new Set(
        credentials.map(c => c.credential.type[1])
      ));

      expect(categories).to.have.lengthOf(2);
      expect(categories).to.include('DriverLicense');
      expect(categories).to.include('UniversityDegree');
    });

    it('should contain no duplicates even if many credentials share the same type', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'License 1'),
        createMockCredential('DriverLicense', 'License 2'),
        createMockCredential('DriverLicense', 'License 3'),
        createMockCredential('DriverLicense', 'License 4')
      ];

      const categories = Array.from(new Set(
        credentials.map(c => c.credential.type[1])
      ));

      expect(categories).to.have.lengthOf(1);
      expect(categories[0]).to.equal('DriverLicense');
    });

    it('should return an empty array when the credentials list is empty', function() {
      const credentials = [];

      const categories = Array.from(new Set(
        credentials.map(c => c.credential.type[1])
      ));

      expect(categories).to.have.lengthOf(0);
    });

    it('should handle credentials with different type array structures', function() {
      const credentials = [
        createMockCredential(['VerifiableCredential', 'DriverLicense']),
        createMockCredential(['VerifiableCredential', 'UniversityDegree']),
        createMockCredential(['VerifiableCredential', 'Passport'])
      ];

      const categories = Array.from(new Set(
        credentials.map(c => c.credential.type[1])
      ));

      expect(categories).to.have.lengthOf(3);
      expect(categories).to.include('DriverLicense');
      expect(categories).to.include('UniversityDegree');
      expect(categories).to.include('Passport');
    });
  });

  describe('activeCategory filtering', function() {
    it('should filter credentials to only those matching activeCategory when set', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'License 1'),
        createMockCredential('DriverLicense', 'License 2'),
        createMockCredential('UniversityDegree', 'Degree 1')
      ];

      const activeCategory = 'DriverLicense';

      const filtered = credentials.filter(c =>
        c.credential.type[1] === activeCategory
      );

      expect(filtered).to.have.lengthOf(2);
      filtered.forEach(c => {
        expect(c.credential.type[1]).to.equal('DriverLicense');
      });
    });

    it('should return all credentials when activeCategory is null', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'License 1'),
        createMockCredential('UniversityDegree', 'Degree 1'),
        createMockCredential('Passport', 'Passport 1')
      ];

      const activeCategory = null;

      const filtered = credentials.filter(c =>
        !activeCategory || c.credential.type[1] === activeCategory
      );

      expect(filtered).to.have.lengthOf(3);
    });

    it('should return all credentials when activeCategory is the string "all"', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'License 1'),
        createMockCredential('UniversityDegree', 'Degree 1'),
        createMockCredential('Passport', 'Passport 1')
      ];

      const activeCategory = 'all';

      const filtered = credentials.filter(c =>
        activeCategory === 'all' || c.credential.type[1] === activeCategory
      );

      expect(filtered).to.have.lengthOf(3);
    });

    it('should return an empty array when activeCategory matches no credentials', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'License 1'),
        createMockCredential('UniversityDegree', 'Degree 1')
      ];

      const activeCategory = 'NonExistentType';

      const filtered = credentials.filter(c =>
        c.credential.type[1] === activeCategory
      );

      expect(filtered).to.have.lengthOf(0);
    });
  });

  describe('category and search filter composition', function() {
    it('should apply both category and search filters as an intersection', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'California License'),
        createMockCredential('DriverLicense', 'Nevada License'),
        createMockCredential('UniversityDegree', 'California State University')
      ];

      const searchText = 'california';
      const activeCategory = 'DriverLicense';

      const filtered = credentials.filter(c => {
        // Category filter
        const categoryMatch = !activeCategory || c.credential.type[1] === activeCategory;

        // Search filter
        const searchTerm = searchText.toLowerCase();
        const credentialName = c.credential.name || c.credential.type[1] || '';
        const searchMatch = credentialName.toLowerCase().includes(searchTerm);

        // Both must be true (intersection)
        return categoryMatch && searchMatch;
      });

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].credential.name).to.equal('California License');
      expect(filtered[0].credential.type[1]).to.equal('DriverLicense');
    });

    it('should return all credentials when only search filter matches without category', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'California License'),
        createMockCredential('UniversityDegree', 'California State University')
      ];

      const searchText = 'california';
      const activeCategory = null;

      const filtered = credentials.filter(c => {
        const categoryMatch = !activeCategory || c.credential.type[1] === activeCategory;
        const searchTerm = searchText.toLowerCase();
        const credentialName = c.credential.name || c.credential.type[1] || '';
        const searchMatch = credentialName.toLowerCase().includes(searchTerm);
        return categoryMatch && searchMatch;
      });

      expect(filtered).to.have.lengthOf(2);
    });

    it('should return only category matches when search is empty', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'License 1'),
        createMockCredential('DriverLicense', 'License 2'),
        createMockCredential('UniversityDegree', 'Degree 1')
      ];

      const searchText = '';
      const activeCategory = 'DriverLicense';

      const filtered = credentials.filter(c => {
        const categoryMatch = !activeCategory || c.credential.type[1] === activeCategory;
        const searchTerm = searchText.toLowerCase();
        const credentialName = c.credential.name || c.credential.type[1] || '';
        const searchMatch = searchTerm === '' || credentialName.toLowerCase().includes(searchTerm);
        return categoryMatch && searchMatch;
      });

      expect(filtered).to.have.lengthOf(2);
      filtered.forEach(c => {
        expect(c.credential.type[1]).to.equal('DriverLicense');
      });
    });

    it('should return empty when search and category filters conflict', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'California License'),
        createMockCredential('UniversityDegree', 'Harvard Degree')
      ];

      const searchText = 'california';
      const activeCategory = 'UniversityDegree';

      const filtered = credentials.filter(c => {
        const categoryMatch = !activeCategory || c.credential.type[1] === activeCategory;
        const searchTerm = searchText.toLowerCase();
        const credentialName = c.credential.name || c.credential.type[1] || '';
        const searchMatch = credentialName.toLowerCase().includes(searchTerm);
        return categoryMatch && searchMatch;
      });

      expect(filtered).to.have.lengthOf(0);
    });

    it('should apply filters case-insensitively', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'CALIFORNIA LICENSE'),
        createMockCredential('DriverLicense', 'Nevada License')
      ];

      const searchText = 'CaLiFoRnIa';
      const activeCategory = 'DriverLicense';

      const filtered = credentials.filter(c => {
        const categoryMatch = !activeCategory || c.credential.type[1] === activeCategory;
        const searchTerm = searchText.toLowerCase();
        const credentialName = c.credential.name || c.credential.type[1] || '';
        const searchMatch = credentialName.toLowerCase().includes(searchTerm);
        return categoryMatch && searchMatch;
      });

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].credential.name).to.equal('CALIFORNIA LICENSE');
    });
  });

  describe('integration with existing search filter', function() {
    it('should not affect existing search filter behavior when activeCategory is null', function() {
      const credentials = [
        createMockCredential('DriverLicense', 'California License'),
        createMockCredential('DriverLicense', 'Nevada License'),
        createMockCredential('UniversityDegree', 'University Degree')
      ];

      const searchText = 'license';
      const activeCategory = null;

      const filtered = credentials.filter(c => {
        const searchTerm = searchText.toLowerCase();
        const credentialName = c.credential.name || c.credential.type[1] || '';
        const searchMatch = credentialName.toLowerCase().includes(searchTerm);
        const categoryMatch = !activeCategory || c.credential.type[1] === activeCategory;
        return searchMatch && categoryMatch;
      });

      expect(filtered).to.have.lengthOf(2);
      filtered.forEach(c => {
        expect(c.credential.name.toLowerCase()).to.include('license');
      });
    });
  });
});
