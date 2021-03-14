import { Configuration, Linter } from 'tslint';
import { ESLint } from 'eslint';
import { Program, getPreEmitDiagnostics, Diagnostic } from 'typescript';
import { BuildContext } from '../util/interfaces';
import { isObject } from 'util';

export interface LinterOptions {
  typeCheck?: boolean;
}

export interface LinterConfig {
  [key: string]: any;
}

/**
 * Lint a file according to config
 * @param {Linter} linter
 * @param {LinterConfig} config
 * @param {string} filePath
 * @param {string} fileContents
 */
export function lint(linter: ESLint, filePath: string): void {
  linter.lintFiles(filePath);
}

/**
 * Type check a TS program
 * @param {BuildContext} context
 * @param {Program} program
 * @param {LinterOptions} linterOptions
 * @return {Promise<Diagnostic[]>}
 */
export function typeCheck(
  context: BuildContext,
  program: Program,
  linterOptions?: LinterOptions
): Promise<readonly Diagnostic[]> {
  if (isObject(linterOptions) && linterOptions.typeCheck) {
    return Promise.resolve(getPreEmitDiagnostics(program));
  }
  return Promise.resolve([]);
}

/**
 * Create a TS program based on the BuildContext {rootDir} or TS config file path (if provided)
 * @param {BuildContext} context
 * @param {string} tsConfig
 * @return {Program}
 */
export function createProgram(context: BuildContext, tsConfig: string): Program {
  return Linter.createProgram(tsConfig, context.rootDir);
}

/**
 * Get lint configuration
 * @param {string} tsLintConfig
 * @param {LinterOptions} linterOptions
 * @return {Linter}
 */
export function getTsLintConfig(tsLintConfig: string, linterOptions?: LinterOptions): LinterConfig {
  const config = Configuration.loadConfigurationFromPath(tsLintConfig);
  Object.assign(config, isObject(linterOptions) ? { linterOptions } : {});
  return config;
}

/**
 * Create a TS linter
 * @param {BuildContext} context
 * @param {Program} program
 * @return {Linter}
 */
export function createLinter(): ESLint {
  return new ESLint({ fix: false });
}
