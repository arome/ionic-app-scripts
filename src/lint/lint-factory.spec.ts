import { Configuration } from 'tslint';
import { DiagnosticCategory } from 'typescript';
import * as ts from 'typescript';
import { isObject } from 'util';
import { createLinter, createTsProgram, getTsLintConfig, lint, typeCheck } from './lint-factory';
import { ESLint } from 'eslint';

describe('lint factory', () => {
  describe('createTsProgram()', () => {
    it('should create a TS Program', () => {
      const context: any = { rootDir: '' };
      const program: any = createTsProgram(context, '');
      const fns = ['getSourceFiles', 'getTypeChecker'];

      expect(isObject(program)).toBeTruthy();
      for (const fn of fns) {
        expect(typeof program[fn]).toEqual('function');
      }
    });
  });

  describe('getTsLintConfig()', () => {
    it('should fetch the TSLint configuration from file path', () => {
      const tsConfigFilePath = 'tsconfig.json';
      const mockConfig = { rulesDirectory: ['node_modules/@ionic'] };
      spyOn(Configuration, Configuration.loadConfigurationFromPath.name).and.returnValue(mockConfig);

      const config = getTsLintConfig(tsConfigFilePath);

      expect(isObject(config)).toBeTruthy();
      expect(Configuration.loadConfigurationFromPath).toHaveBeenLastCalledWith(tsConfigFilePath);
      expect(config).toEqual(mockConfig);
    });

    it('should extend configuration with {linterOptions} if provided', () => {
      const tsConfigFilePath = 'tsconfig.json';
      const mockConfig = { rulesDirectory: ['node_modules/@ionic'] };
      spyOn(Configuration, Configuration.loadConfigurationFromPath.name).and.returnValue(mockConfig);
      const config = getTsLintConfig(tsConfigFilePath, {
        typeCheck: true
      });

      expect(config.linterOptions).toEqual({
        typeCheck: true
      });
    });
  });

  describe('createLinter()', () => {
    it('should create a Linter', () => {
      const context: any = { rootDir: '' };
      const linter = createLinter();
      expect(linter instanceof ESLint).toBeTruthy();
    });
  });

  describe('typeCheck()', () => {
    it('should not be called if {typeCheck} is false', (done) => {
      const context: any = { rootDir: '' };
      const program = createTsProgram(context, '');

      spyOn(ts, ts.getPreEmitDiagnostics.name).and.returnValue([]);

      typeCheck(context, program, { typeCheck: false }).then((result) => {
        expect(ts.getPreEmitDiagnostics).toHaveBeenCalledTimes(0);
        expect(result).toEqual([]);
        done();
      });
    });

    it('should type check if {typeCheck} is true', (done) => {
      const context: any = { rootDir: '' };
      const program = createTsProgram(context, '');

      const diagnostics: any = [
        {
          file: {},
          start: 2,
          length: 10,
          messageText: 'Oops',
          category: DiagnosticCategory.Warning,
          code: 120
        }
      ];

      spyOn(ts, ts.getPreEmitDiagnostics.name).and.returnValue(diagnostics);

      typeCheck(context, program, { typeCheck: true }).then((result) => {
        expect(ts.getPreEmitDiagnostics).toHaveBeenCalledWith(program);
        expect(result).toEqual(diagnostics);
        done();
      });
    });
  });

  describe('lint()', () => {
    it('should lint a file', () => {
      const linter = createLinter();
      spyOn(linter, 'lintFiles').and.returnValue(undefined);
      const filePath = 'test.ts';

      lint(linter, filePath);

      expect(linter.lintFiles).toHaveBeenCalledWith(filePath);
    });
  });
});
