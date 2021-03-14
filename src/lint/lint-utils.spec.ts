import * as utils from './lint-utils';

describe('lint utils', () => {
  describe('generateErrorMessageForFiles()', () => {
    it('should generate a string from an array of files', () => {
      expect(utils.generateErrorMessageForFiles(['test_one.ts', 'test_two.ts'], 'Just testing:')).toEqual(
        'Just testing:\ntest_one.ts\ntest_two.ts'
      );
    });
  });

  describe('getFileNames()', () => {
    it('should retrieve file names from an array of RuleFailure objects', () => {
      const ruleFailures: any[] = [
        {
          getFileName() {
            return '/User/john/test.ts';
          }
        }
      ];
      const fileNames = utils.getFileNames({ rootDir: '/User/john' }, ruleFailures);

      expect(fileNames).toEqual(['test.ts']);
    });
  });

  describe('removeDuplicateFileNames()', () => {
    it('should remove duplicate string entries in arrays', () => {
      expect(utils.removeDuplicateFileNames(['test.ts', 'test.ts'])).toEqual(['test.ts']);
    });
  });
});
