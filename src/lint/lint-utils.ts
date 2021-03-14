import { RuleFailure } from 'tslint';
import { createLinter, typeCheck } from './lint-factory';
import { BuildContext } from '../util/interfaces';
import { runEsLintDiagnostics } from '../logger/logger-eslint';
import { runTypeScriptDiagnostics } from '../logger/logger-typescript';
import { ESLint } from 'eslint';
import { BuildError } from '../util/errors';
import { clearDiagnostics, DiagnosticsType, printDiagnostics } from '../logger/logger-diagnostics';
import { Diagnostic, Program } from 'typescript';

/**
 * Lint files
 * @param {BuildContext} context
 * @param {Program} program
 * @param {string} esLintConfig - TSLint config file path
 * @param {Array<string>} filePaths
 */
export async function lintFiles(
  context: BuildContext,
  program: Program,
  filePaths: string | string[] = 'src/**'
): Promise<void> {
  const linter = createLinter();
  return typeCheck(context, program)
    .then((diagnostics) => processTypeCheckDiagnostics(context, diagnostics))
    .then(() => linter.lintFiles(filePaths))
    .then((results: ESLint.LintResult[]) => results.forEach((result) => processLintResult(context, result)));
}

/**
 * Process typescript diagnostics after type checking
 * NOTE: This will throw a BuildError if there were any type errors.
 * @param {BuildContext} context
 * @param {Array<Diagnostic>} tsDiagnostics
 */
export function processTypeCheckDiagnostics(context: BuildContext, tsDiagnostics: readonly Diagnostic[]) {
  if (tsDiagnostics.length > 0) {
    const diagnostics = runTypeScriptDiagnostics(context, tsDiagnostics);
    printDiagnostics(context, DiagnosticsType.TypeScript, diagnostics, true, false);
    const files = removeDuplicateFileNames(diagnostics.map((diagnostic) => diagnostic.relFileName));
    const errorMessage = generateErrorMessageForFiles(files, 'The following files failed type checking:');
    throw new BuildError(errorMessage);
  }
}

/**
 * Process lint results
 * NOTE: This will throw a BuildError if there were any warnings or errors in any of the lint results.
 * @param {BuildContext} context
 * @param {LintResult} result
 */
export function processLintResult(context: BuildContext, result: ESLint.LintResult) {
  clearDiagnostics(context, DiagnosticsType.EsLint);
  const files: string[] = [];

  // Only process the lint result if there are errors or warnings (there's no point otherwise)
  if (result.errorCount !== 0 || result.warningCount !== 0) {
    const diagnostics = runEsLintDiagnostics(context, result);
    printDiagnostics(context, DiagnosticsType.EsLint, diagnostics, true, true);
    files.push(result.filePath);
  }

  if (files.length > 0) {
    const errorMessage = generateErrorMessageForFiles(files);
    throw new BuildError(errorMessage);
  }
}

export function generateErrorMessageForFiles(failingFiles: string[], message?: string) {
  return `${message || 'The following files did not pass eslint:'}\n${failingFiles.join('\n')}`;
}

export function getFileNames(context: BuildContext, failures: RuleFailure[]): string[] {
  return failures.map((failure) => failure.getFileName().replace(context.rootDir, '').replace(/^\//g, ''));
}

export function removeDuplicateFileNames(fileNames: string[]) {
  return Array.from(new Set(fileNames));
}
